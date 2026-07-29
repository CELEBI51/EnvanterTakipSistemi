import {
  assetListQuerySchema,
  changeAssetStatusSchema,
  createAssetSchema,
  idParamSchema,
  updateAssetSchema,
} from '@entanter/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError } from '../../lib/errors.js';
import { paginate } from '../../lib/pagination.js';
import { assetRepository } from './assets.repository.js';
import { assetService } from './assets.service.js';

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const query = assetListQuerySchema.parse(request.query);
    const { rows, total } = await assetRepository.list(query);
    return paginate(rows, query.page, query.limit, total);
  });

  /**
   * Demirbas numarasindan tekil arama.
   * El terminali / QR okuyucu entegrasyonu geldiginde tek ihtiyac duyulan
   * uc nokta budur; simdiden yaziliyor ki sonradan sema degisikligi gerekmesin.
   */
  app.get('/lookup/:tag', async (request) => {
    const { tag } = z.object({ tag: z.string().trim().min(1).max(32) }).parse(request.params);

    const asset = await assetRepository.findByTag(tag);
    if (!asset) throw new NotFoundError(`"${tag}" numaralı demirbaş bulunamadı.`);

    const detail = await assetRepository.findById(asset.id);
    return detail;
  });

  app.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const row = await assetRepository.findById(id);
    if (!row) throw new NotFoundError('Demirbaş bulunamadı.');
    return row;
  });

  /** URUN GECMISI: zimmet hareketleri + durum degisiklikleri, tek kronolojik akis. */
  app.get('/:id/history', async (request) => {
    const { id } = idParamSchema.parse(request.params);

    const asset = await assetRepository.findById(id);
    if (!asset) throw new NotFoundError('Demirbaş bulunamadı.');

    return {
      asset,
      timeline: await assetService.timeline(id),
    };
  });

  app.post('/', async (request, reply) => {
    const input = createAssetSchema.parse(request.body);
    const created = await assetService.create(input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
    return reply.status(201).send(created);
  });

  app.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateAssetSchema.parse(request.body);
    return assetService.update(id, input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
  });

  /** Tamir / hurda / kayip / kullanim disi. Gerekce zorunludur. */
  app.post('/:id/status', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const input = changeAssetStatusSchema.parse(request.body);
    return assetService.changeStatus(id, input, {
      actorId: request.user.sub,
      ipAddress: request.ip,
    });
  });
}
