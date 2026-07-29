import {
  createDepartmentSchema,
  departmentListQuerySchema,
  idParamSchema,
  updateDepartmentSchema,
} from '@entanter/shared';
import { and, asc, count, eq, ilike, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { departments, staff } from '../../db/schema/index.js';
import { writeAudit } from '../../lib/audit.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { paginate, toOffset } from '../../lib/pagination.js';
import { definedOnly, likePattern } from '../../lib/query.js';

/**
 * Departmanlar — referans veri.
 * Basit CRUD oldugu icin ayri service/repository katmanina bolunmedi;
 * is kurali yogunlastikca (assets/assignments gibi) ayrilir.
 */
export async function departmentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const query = departmentListQuerySchema.parse(request.query);

    const conditions = [isNull(departments.deletedAt)];
    if (query.q) conditions.push(ilike(departments.name, likePattern(query.q)));
    if (query.isActive !== undefined) conditions.push(eq(departments.isActive, query.isActive));
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(departments)
        .where(where)
        .orderBy(asc(departments.name))
        .limit(query.limit)
        .offset(toOffset(query.page, query.limit)),
      db.select({ value: count() }).from(departments).where(where),
    ]);

    return paginate(rows, query.page, query.limit, totals[0]?.value ?? 0);
  });

  app.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const rows = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNull(departments.deletedAt)))
      .limit(1);

    const row = rows[0];
    if (!row) throw new NotFoundError('Departman bulunamadı.');
    return row;
  });

  app.post('/', async (request, reply) => {
    const input = createDepartmentSchema.parse(request.body);

    const [created] = await db.insert(departments).values(input).returning();
    await writeAudit(db, {
      entityType: 'department',
      entityId: created?.id ?? null,
      action: 'create',
      actorId: request.user.sub,
      after: created,
      ipAddress: request.ip,
    });

    return reply.status(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = definedOnly(updateDepartmentSchema.parse(request.body));

    const existing = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNull(departments.deletedAt)))
      .limit(1);

    const before = existing[0];
    if (!before) throw new NotFoundError('Departman bulunamadı.');

    const [updated] = await db
      .update(departments)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();

    await writeAudit(db, {
      entityType: 'department',
      entityId: id,
      action: 'update',
      actorId: request.user.sub,
      before,
      after: updated,
      ipAddress: request.ip,
    });

    return updated;
  });

  /** Soft delete. Kayit ASLA fiziksel olarak silinmez. */
  app.delete('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);

    const existing = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNull(departments.deletedAt)))
      .limit(1);

    const before = existing[0];
    if (!before) throw new NotFoundError('Departman bulunamadı.');

    // Bagli personel varsa engelle: gecmis zimmetlerin departman bilgisi
    // anlamsizlasmasin diye once personel tasinmali.
    const linked = await db
      .select({ value: count() })
      .from(staff)
      .where(and(eq(staff.departmentId, id), isNull(staff.deletedAt)));

    if ((linked[0]?.value ?? 0) > 0) {
      throw new BusinessRuleError(
        `Bu departmana bağlı ${linked[0]?.value} personel var. Önce personeli başka bir departmana taşıyın.`,
      );
    }

    await db
      .update(departments)
      .set({ deletedAt: new Date(), isActive: false })
      .where(eq(departments.id, id));

    await writeAudit(db, {
      entityType: 'department',
      entityId: id,
      action: 'soft_delete',
      actorId: request.user.sub,
      before,
      ipAddress: request.ip,
    });

    return { success: true };
  });
}
