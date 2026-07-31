import {
  ASSET_STATUS,
  ASSET_STATUS_TRANSITIONS,
  type AssetStatus,
  type ChangeAssetStatusInput,
  type CreateAssetInput,
  type ReturnCondition,
  type UpdateAssetInput,
} from '@entanter/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { assetStatusHistory, assets } from '../../db/schema/index.js';
import { writeAudit, type DbExecutor } from '../../lib/audit.js';
import { toDateString } from '../../lib/dates.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { nextAssetTag } from '../../lib/numbering.js';
import { definedOnly } from '../../lib/query.js';
import { assetRepository } from './assets.repository.js';

export interface ActorContext {
  actorId: number;
  ipAddress: string | null;
}

/* ------------------------------------------------------------------ */
/* Urun gecmisi zaman cizelgesi                                        */
/* ------------------------------------------------------------------ */

export type AssetTimelineEvent =
  | {
      type: 'assigned';
      at: Date;
      assignmentId: number;
      assignmentNo: string;
      staffId: number;
      staffName: string;
      staffEmployeeNo: string;
      locationNote: string | null;
      notes: string | null;
    }
  | {
      type: 'returned';
      at: Date;
      assignmentId: number;
      assignmentNo: string;
      staffId: number;
      staffName: string;
      condition: ReturnCondition | null;
      notes: string | null;
    }
  | {
      type: 'status_change';
      at: Date;
      fromStatus: AssetStatus | null;
      toStatus: AssetStatus;
      fromLabel: string | null;
      toLabel: string;
      reason: string | null;
      changedBy: number | null;
    };

/**
 * Durum degisikligini kaydeder. Hem yeni kayit acilisinda hem elle
 * durum degisiminde ayni yoldan gecilir ki gecmis hicbir zaman bosluk icermesin.
 */
async function recordStatusChange(
  executor: DbExecutor,
  input: {
    assetId: number;
    fromStatus: AssetStatus | null;
    toStatus: AssetStatus;
    reason: string | null;
    changedBy: number | null;
  },
): Promise<void> {
  await executor.insert(assetStatusHistory).values({
    assetId: input.assetId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    reason: input.reason,
    changedBy: input.changedBy,
  });
}

export const assetService = {
  recordStatusChange,

  async create(input: CreateAssetInput, ctx: ActorContext) {
    return db.transaction(async (tx) => {
      // Etiket verilmediyse sequence'ten uret.
      const assetTag = input.assetTag ?? (await nextAssetTag(tx));

      const [created] = await tx
        .insert(assets)
        .values({
          assetTag,
          serialNo: input.serialNo ?? null,
          categoryId: input.categoryId ?? null,
          brand: input.brand ?? null,
          model: input.model ?? null,
          purchaseDate: toDateString(input.purchaseDate) ?? null,
          warrantyEnd: toDateString(input.warrantyEnd) ?? null,
          notes: input.notes ?? null,
          status: 'in_stock',
        })
        .returning();

      if (!created) throw new Error('Demirbaş oluşturulamadı.');

      await recordStatusChange(tx, {
        assetId: created.id,
        fromStatus: null,
        toStatus: 'in_stock',
        reason: 'Envantere ilk kayıt',
        changedBy: ctx.actorId,
      });

      await writeAudit(tx, {
        entityType: 'asset',
        entityId: created.id,
        action: 'create',
        actorId: ctx.actorId,
        after: created,
        ipAddress: ctx.ipAddress,
      });

      return created;
    });
  },

  async update(id: number, input: UpdateAssetInput, ctx: ActorContext) {
    const before = await assetRepository.findRaw(id);
    if (!before) throw new NotFoundError('Demirbaş bulunamadı.');

    const patch = definedOnly({
      assetTag: input.assetTag,
      serialNo: input.serialNo,
      categoryId: input.categoryId,
      brand: input.brand,
      model: input.model,
      purchaseDate: toDateString(input.purchaseDate),
      warrantyEnd: toDateString(input.warrantyEnd),
      notes: input.notes,
    });

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(assets)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(assets.id, id))
        .returning();

      await writeAudit(tx, {
        entityType: 'asset',
        entityId: id,
        action: 'update',
        actorId: ctx.actorId,
        before,
        after: updated,
        ipAddress: ctx.ipAddress,
      });

      return updated;
    });
  },

  /**
   * Elle durum degisikligi (tamir / hurda / kayip / kullanim disi).
   *
   * ZIMMETLI bir demirbasin durumu buradan DEGISTIRILEMEZ: aksi halde
   * personelin uzerinde acik bir satir kalirken demirbas "hurda" gorunur
   * ve envanter ile gercek birbirinden kopar. Zimmetliyken kaybolan/bozulan
   * urun IADE akisindan `condition` ile bildirilir; iade servisi durumu
   * otomatik olarak lost/in_repair yapar.
   */
  async changeStatus(id: number, input: ChangeAssetStatusInput, ctx: ActorContext) {
    const before = await assetRepository.findRaw(id);
    if (!before) throw new NotFoundError('Demirbaş bulunamadı.');

    if (before.status === input.status) {
      throw new BusinessRuleError(
        `Demirbaş zaten "${ASSET_STATUS[input.status]}" durumunda.`,
      );
    }

    if (before.status === 'assigned') {
      throw new BusinessRuleError(
        'Zimmetli bir demirbaşın durumu doğrudan değiştirilemez. ' +
          'Ürün personeldeyken kaybolduysa veya bozulduysa, iade ekranından ' +
          '"Kayıp" / "Hasarlı" olarak iade alın; durum otomatik güncellenecektir.',
      );
    }

    const allowed = ASSET_STATUS_TRANSITIONS[before.status];
    if (!allowed.includes(input.status)) {
      throw new BusinessRuleError(
        `"${ASSET_STATUS[before.status]}" durumundan "${ASSET_STATUS[input.status]}" durumuna geçiş yapılamaz.`,
        { from: before.status, to: input.status, allowed },
      );
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(assets)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(assets.id, id))
        .returning();

      await recordStatusChange(tx, {
        assetId: id,
        fromStatus: before.status,
        toStatus: input.status,
        reason: input.reason,
        changedBy: ctx.actorId,
      });

      await writeAudit(tx, {
        entityType: 'asset',
        entityId: id,
        action: 'status_change',
        actorId: ctx.actorId,
        before: { status: before.status },
        after: { status: input.status, reason: input.reason },
        ipAddress: ctx.ipAddress,
      });

      return updated;
    });
  },

  /**
   * URUN GECMISI — cift yonlu izlenebilirligin urun tarafi.
   * Zimmet hareketleri ve durum degisiklikleri TEK kronolojik akista birlestirilir.
   */
  async timeline(assetId: number): Promise<AssetTimelineEvent[]> {
    const [assignmentRows, statusRows] = await Promise.all([
      assetRepository.assignmentEvents(assetId),
      assetRepository.statusEvents(assetId),
    ]);

    const events: AssetTimelineEvent[] = [];

    for (const row of assignmentRows) {
      events.push({
        type: 'assigned',
        at: row.assignedAt,
        assignmentId: row.assignmentId,
        assignmentNo: row.assignmentNo,
        staffId: row.staffId,
        staffName: row.staffName,
        staffEmployeeNo: row.staffEmployeeNo,
        locationNote: row.locationNote,
        notes: row.notes,
      });

      if (row.returnedAt) {
        events.push({
          type: 'returned',
          at: row.returnedAt,
          assignmentId: row.assignmentId,
          assignmentNo: row.assignmentNo,
          staffId: row.staffId,
          staffName: row.staffName,
          condition: row.returnCondition,
          notes: row.returnNotes,
        });
      }
    }

    for (const row of statusRows) {
      events.push({
        type: 'status_change',
        at: row.changedAt,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        fromLabel: row.fromStatus ? ASSET_STATUS[row.fromStatus] : null,
        toLabel: ASSET_STATUS[row.toStatus],
        reason: row.reason,
        changedBy: row.changedBy,
      });
    }

    // En yeni olay en ustte.
    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    return events;
  },
};
