import {
  consumableListQuerySchema,
  createConsumableSchema,
  idParamSchema,
  paginationQuerySchema,
  stockMovementSchema,
  updateConsumableSchema,
} from '@entanter/shared';
import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';
import { paginate, toOffset } from '../../lib/pagination.js';
import { consumableRepository } from './consumables.repository.js';
import { consumableService } from './consumables.service.js';

export async function consumableRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const query = consumableListQuerySchema.parse(request.query);
    const { rows, total } = await consumableRepository.list(query);
    return paginate(rows, query.page, query.limit, total);
  });

  app.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const row = await consumableRepository.findById(id);
    if (!row) throw new NotFoundError('Aksesuar / sarf malzeme bulunamadı.');
    return row;
  });

  /** Stok hareket defteri — "bu adet nereden geldi, nereye gitti". */
  app.get('/:id/movements', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const query = paginationQuerySchema.parse(request.query);

    const item = await consumableRepository.findById(id);
    if (!item) throw new NotFoundError('Aksesuar / sarf malzeme bulunamadı.');

    const { rows, total } = await consumableRepository.movements(
      id,
      query.limit,
      toOffset(query.page, query.limit),
    );

    return {
      consumable: item,
      ...paginate(rows, query.page, query.limit, total),
    };
  });

  app.post('/', async (request, reply) => {
    const input = createConsumableSchema.parse(request.body);
    const created = await consumableService.create(input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
    return reply.status(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateConsumableSchema.parse(request.body);
    return consumableService.update(id, input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
  });

  /** Toplu/koli bazli stok girisi ve sayim duzeltmesi. */
  app.post('/:id/stock', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = stockMovementSchema.parse(request.body);
    return consumableService.moveStock(id, input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
  });
}
