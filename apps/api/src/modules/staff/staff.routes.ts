import {
  createStaffSchema,
  idParamSchema,
  staffAssignmentsQuerySchema,
  staffListQuerySchema,
  updateStaffSchema,
} from '@entanter/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { staff } from '../../db/schema/index.js';
import { writeAudit } from '../../lib/audit.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { paginate } from '../../lib/pagination.js';
import { definedOnly } from '../../lib/query.js';
import { staffRepository } from './staff.repository.js';

export async function staffRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const query = staffListQuerySchema.parse(request.query);
    const { rows, total } = await staffRepository.list(query);
    return paginate(rows, query.page, query.limit, total);
  });

  app.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const row = await staffRepository.findById(id);
    if (!row) throw new NotFoundError('Personel bulunamadı.');
    return row;
  });

  /**
   * PERSONEL GECMISI.
   * ?status=open -> su anda uzerinde ne var
   * ?status=all  -> tum gecmis (varsayilan)
   */
  app.get('/:id/assignments', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const { status } = staffAssignmentsQuerySchema.parse(request.query);

    const person = await staffRepository.findById(id);
    if (!person) throw new NotFoundError('Personel bulunamadı.');

    const rows = await staffRepository.history(id, status === 'open');

    return {
      staff: person,
      openItemCount: await staffRepository.countOpenItems(id),
      assignments: rows,
    };
  });

  app.post('/', async (request, reply) => {
    const input = createStaffSchema.parse(request.body);

    const [created] = await db.insert(staff).values(input).returning();
    await writeAudit(db, {
      entityType: 'staff',
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
    const input = definedOnly(updateStaffSchema.parse(request.body));

    const before = await staffRepository.findRaw(id);
    if (!before) throw new NotFoundError('Personel bulunamadı.');

    const [updated] = await db
      .update(staff)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();

    await writeAudit(db, {
      entityType: 'staff',
      entityId: id,
      action: 'update',
      actorId: request.user.sub,
      before,
      after: updated,
      ipAddress: request.ip,
    });

    return updated;
  });

  /**
   * Soft delete (isten ayrilma).
   * Uzerinde acik zimmet varsa ENGELLENIR — aksi halde demirbaslar
   * kimsede gorunmeden envanterde kaybolur.
   */
  app.delete('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);

    const before = await staffRepository.findRaw(id);
    if (!before) throw new NotFoundError('Personel bulunamadı.');

    const openItems = await staffRepository.countOpenItems(id);
    if (openItems > 0) {
      throw new BusinessRuleError(
        `Bu personelin üzerinde iade edilmemiş ${openItems} kalem var. Önce iade alınmalıdır.`,
        { openItems },
      );
    }

    await db
      .update(staff)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(staff.id, id));

    await writeAudit(db, {
      entityType: 'staff',
      entityId: id,
      action: 'soft_delete',
      actorId: request.user.sub,
      before,
      ipAddress: request.ip,
    });

    return { success: true };
  });
}
