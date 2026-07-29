import {
  assignmentListQuerySchema,
  createAssignmentSchema,
  idParamSchema,
  returnAssignmentSchema,
} from '@entanter/shared';
import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';
import { paginate } from '../../lib/pagination.js';
import { assignmentRepository } from './assignments.repository.js';
import { assignmentService } from './assignments.service.js';

export async function assignmentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const query = assignmentListQuerySchema.parse(request.query);
    const { rows, total } = await assignmentRepository.list(query);
    return paginate(rows, query.page, query.limit, total);
  });

  app.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const row = await assignmentRepository.findById(id);
    if (!row) throw new NotFoundError('Zimmet kaydı bulunamadı.');
    return row;
  });

  /** Zimmet verme. Tum yan etkiler tek transaction icinde. */
  app.post('/', async (request, reply) => {
    const input = createAssignmentSchema.parse(request.body);
    const created = await assignmentService.create(input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });

    const detail = await assignmentRepository.findById(created.id);
    return reply.status(201).send(detail);
  });

  /** Iade alma. Kismi iade desteklenir. */
  app.post('/:id/return', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = returnAssignmentSchema.parse(request.body);
    return assignmentService.returnItems(id, input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
  });

  app.post('/:id/close', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return assignmentService.close(id, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
  });
}
