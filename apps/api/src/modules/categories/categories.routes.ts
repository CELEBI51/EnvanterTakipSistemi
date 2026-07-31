import {
  categoryListQuerySchema,
  createCategorySchema,
  idParamSchema,
  updateCategorySchema,
} from '@entanter/shared';
import { and, asc, count, eq, ilike, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { assets, categories, consumables } from '../../db/schema/index.js';
import { writeAudit } from '../../lib/audit.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { paginate, toOffset } from '../../lib/pagination.js';
import { definedOnly, likePattern } from '../../lib/query.js';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const query = categoryListQuerySchema.parse(request.query);

    const conditions = [isNull(categories.deletedAt)];
    if (query.q) conditions.push(ilike(categories.name, likePattern(query.q)));
    if (query.kind) conditions.push(eq(categories.kind, query.kind));
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(where)
        .orderBy(asc(categories.kind), asc(categories.name))
        .limit(query.limit)
        .offset(toOffset(query.page, query.limit)),
      db.select({ value: count() }).from(categories).where(where),
    ]);

    return paginate(rows, query.page, query.limit, totals[0]?.value ?? 0);
  });

  app.post('/', async (request, reply) => {
    const input = createCategorySchema.parse(request.body);

    const [created] = await db.insert(categories).values(input).returning();
    await writeAudit(db, {
      entityType: 'category',
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
    const input = definedOnly(updateCategorySchema.parse(request.body));

    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    const before = existing[0];
    if (!before) throw new NotFoundError('Kategori bulunamadı.');

    // Kategori turu degistirilemez: altindaki demirbas/sarf kayitlari
    // yanlis tarafa dusup listeleri bozar.
    if (input.kind && input.kind !== before.kind) {
      throw new BusinessRuleError(
        'Kategori türü (demirbaş / sarf) sonradan değiştirilemez. Yeni bir kategori oluşturun.',
      );
    }

    const [updated] = await db
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    await writeAudit(db, {
      entityType: 'category',
      entityId: id,
      action: 'update',
      actorId: request.user.sub,
      before,
      after: updated,
      ipAddress: request.ip,
    });

    return updated;
  });

  app.delete('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);

    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    const before = existing[0];
    if (!before) throw new NotFoundError('Kategori bulunamadı.');

    const [assetUse, consumableUse] = await Promise.all([
      db
        .select({ value: count() })
        .from(assets)
        .where(and(eq(assets.categoryId, id), isNull(assets.deletedAt))),
      db
        .select({ value: count() })
        .from(consumables)
        .where(and(eq(consumables.categoryId, id), isNull(consumables.deletedAt))),
    ]);

    const inUse = (assetUse[0]?.value ?? 0) + (consumableUse[0]?.value ?? 0);
    if (inUse > 0) {
      throw new BusinessRuleError(
        `Bu kategoride ${inUse} kayıt var. Önce bu kayıtları başka bir kategoriye taşıyın.`,
      );
    }

    await db.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, id));

    await writeAudit(db, {
      entityType: 'category',
      entityId: id,
      action: 'soft_delete',
      actorId: request.user.sub,
      before,
      ipAddress: request.ip,
    });

    return { success: true };
  });
}
