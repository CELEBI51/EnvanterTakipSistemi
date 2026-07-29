import {
  ASSET_STATUS,
  ASSIGNABLE_ASSET_STATUS,
  type AssetStatus,
  type CreateAssignmentInput,
  type ReturnAssignmentInput,
  type ReturnCondition,
} from '@entanter/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  assets,
  assignmentItems,
  assignments,
  staff,
} from '../../db/schema/index.js';
import { writeAudit, type Tx } from '../../lib/audit.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { nextAssignmentNo } from '../../lib/numbering.js';
import type { ActorContext } from '../assets/assets.service.js';
import { assetService } from '../assets/assets.service.js';
import { applyStockMovement } from '../consumables/consumables.service.js';
import { assignmentRepository } from './assignments.repository.js';

/**
 * Iade durumu -> demirbasin yeni durumu.
 * Personeldeyken kaybolan/bozulan urun bu yoldan dogru duruma gecer;
 * bu yuzden zimmetli bir demirbasin durumu status endpoint'inden
 * degistirilemez (bkz. assets.service.changeStatus).
 */
const RETURN_STATUS: Record<ReturnCondition, AssetStatus> = {
  good: 'in_stock',
  damaged: 'in_repair',
  lost: 'lost',
};

/** Satirlarin durumuna gore zimmet basligi hangi durumda olmali? */
async function recalculateStatus(tx: Tx, assignmentId: number): Promise<void> {
  const items = await tx
    .select({ id: assignmentItems.id, returnedAt: assignmentItems.returnedAt })
    .from(assignmentItems)
    .where(eq(assignmentItems.assignmentId, assignmentId));

  const total = items.length;
  const returned = items.filter((item) => item.returnedAt !== null).length;

  const status = returned === 0 ? 'open' : returned === total ? 'closed' : 'partially_returned';

  await tx
    .update(assignments)
    .set({
      status,
      closedAt: status === 'closed' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId));
}

export const assignmentService = {
  /**
   * ZIMMET VERME — tek transaction.
   *
   * Ya hepsi ya hicbiri: zimmet basligi, satirlar, stok dusumu,
   * demirbas durum degisikligi, durum gecmisi ve denetim kaydi.
   * Herhangi biri basarisiz olursa (ornegin stok yetmezse) hicbiri yazilmaz.
   */
  async create(input: CreateAssignmentInput, ctx: ActorContext) {
    return db.transaction(async (tx) => {
      const personRows = await tx
        .select()
        .from(staff)
        .where(and(eq(staff.id, input.staffId), isNull(staff.deletedAt)))
        .limit(1);

      const person = personRows[0];
      if (!person) throw new NotFoundError('Personel bulunamadı.');
      if (!person.isActive) {
        throw new BusinessRuleError('Pasif durumdaki personele zimmet verilemez.');
      }

      const assignmentNo = await nextAssignmentNo(tx);

      const [assignment] = await tx
        .insert(assignments)
        .values({
          assignmentNo,
          staffId: person.id,
          assignedBy: ctx.actorId,
          // SNAPSHOT: personel sonradan departman degistirse bile bu kayit sabit kalir.
          departmentId: person.departmentId,
          locationNote: input.locationNote ?? null,
          notes: input.notes ?? null,
          assignedAt: input.assignedAt ?? new Date(),
          status: 'open',
        })
        .returning();

      if (!assignment) throw new Error('Zimmet kaydı oluşturulamadı.');

      for (const item of input.items) {
        if (item.kind === 'asset') {
          // Satiri kilitle: es zamanli iki zimmet ayni demirbasi almasin.
          const lockedRows = await tx
            .select()
            .from(assets)
            .where(and(eq(assets.id, item.assetId), isNull(assets.deletedAt)))
            .for('update')
            .limit(1);

          const asset = lockedRows[0];
          if (!asset) throw new NotFoundError(`Demirbaş bulunamadı (id: ${item.assetId}).`);

          if (asset.status !== ASSIGNABLE_ASSET_STATUS) {
            throw new BusinessRuleError(
              `"${asset.assetTag}" numaralı demirbaş "${ASSET_STATUS[asset.status]}" durumunda olduğu için zimmetlenemez.`,
              { assetTag: asset.assetTag, status: asset.status },
            );
          }

          await tx.insert(assignmentItems).values({
            assignmentId: assignment.id,
            assetId: asset.id,
            quantity: 1,
          });

          await tx
            .update(assets)
            .set({ status: 'assigned', updatedAt: new Date() })
            .where(eq(assets.id, asset.id));

          await assetService.recordStatusChange(tx, {
            assetId: asset.id,
            fromStatus: asset.status,
            toStatus: 'assigned',
            reason: `${assignmentNo} ile ${person.firstName} ${person.lastName} personeline zimmetlendi`,
            changedBy: ctx.actorId,
          });
        } else {
          const [created] = await tx
            .insert(assignmentItems)
            .values({
              assignmentId: assignment.id,
              consumableId: item.consumableId,
              quantity: item.quantity,
            })
            .returning({ id: assignmentItems.id });

          // Stoktan dus. Yetersizse burada patlar ve TUM islem geri alinir.
          await applyStockMovement(tx, {
            consumableId: item.consumableId,
            delta: -item.quantity,
            movementType: 'out',
            reason: `${assignmentNo} zimmet çıkışı`,
            assignmentItemId: created?.id ?? null,
            performedBy: ctx.actorId,
          });
        }
      }

      await writeAudit(tx, {
        entityType: 'assignment',
        entityId: assignment.id,
        action: 'assign',
        actorId: ctx.actorId,
        after: { assignmentNo, staffId: person.id, itemCount: input.items.length },
        ipAddress: ctx.ipAddress,
      });

      return assignment;
    });
  },

  /**
   * IADE ALMA — kismi iade destekli, tek transaction.
   */
  async returnItems(assignmentId: number, input: ReturnAssignmentInput, ctx: ActorContext) {
    await db.transaction(async (tx) => {
      const headerRows = await tx
        .select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId))
        .limit(1);

      const header = headerRows[0];
      if (!header) throw new NotFoundError('Zimmet kaydı bulunamadı.');

      const returnedAt = input.returnedAt ?? new Date();

      for (const request of input.items) {
        const rows = await tx
          .select()
          .from(assignmentItems)
          .where(
            and(
              eq(assignmentItems.id, request.itemId),
              eq(assignmentItems.assignmentId, assignmentId),
            ),
          )
          .for('update')
          .limit(1);

        const item = rows[0];
        if (!item) {
          throw new NotFoundError(
            `Zimmet satırı bulunamadı (id: ${request.itemId}). Satır bu zimmete ait olmayabilir.`,
          );
        }
        if (item.returnedAt) {
          throw new BusinessRuleError('Bu satır zaten tamamen iade edilmiş.', {
            itemId: item.id,
          });
        }

        const remaining = item.quantity - item.returnedQuantity;
        const returningQty = request.quantity ?? remaining;

        if (returningQty > remaining) {
          throw new BusinessRuleError(
            `İade adedi kalan adetten fazla olamaz. Kalan: ${remaining}, istenen: ${returningQty}.`,
            { itemId: item.id, remaining },
          );
        }

        const newReturnedQuantity = item.returnedQuantity + returningQty;
        const fullyReturned = newReturnedQuantity === item.quantity;

        await tx
          .update(assignmentItems)
          .set({
            returnedQuantity: newReturnedQuantity,
            // chk_return_consistency: returned_at ancak TAM iadede dolabilir.
            returnedAt: fullyReturned ? returnedAt : null,
            returnedTo: ctx.actorId,
            returnCondition: request.condition,
            returnNotes: request.notes ?? null,
          })
          .where(eq(assignmentItems.id, item.id));

        if (item.assetId) {
          const newStatus = RETURN_STATUS[request.condition];

          await tx
            .update(assets)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(eq(assets.id, item.assetId));

          await assetService.recordStatusChange(tx, {
            assetId: item.assetId,
            fromStatus: 'assigned',
            toStatus: newStatus,
            reason:
              request.condition === 'good'
                ? `${header.assignmentNo} zimmetinden iade alındı`
                : `${header.assignmentNo} zimmetinden "${request.condition === 'lost' ? 'Kayıp' : 'Hasarlı'}" olarak iade alındı${request.notes ? `: ${request.notes}` : ''}`,
            changedBy: ctx.actorId,
          });
        } else if (item.consumableId) {
          /**
           * Sarf malzeme yalnizca SAGLAM iade edildiginde stoga geri girer.
           * Kayip/hasarli iadede stok geri artmaz — malzeme gercekten yok.
           * Defter toplami yine quantity_on_hand'e esit kalir.
           */
          if (request.condition === 'good') {
            await applyStockMovement(tx, {
              consumableId: item.consumableId,
              delta: returningQty,
              movementType: 'return',
              reason: `${header.assignmentNo} iadesi`,
              assignmentItemId: item.id,
              performedBy: ctx.actorId,
            });
          }
        }
      }

      await recalculateStatus(tx, assignmentId);

      await writeAudit(tx, {
        entityType: 'assignment',
        entityId: assignmentId,
        action: 'return',
        actorId: ctx.actorId,
        after: { items: input.items },
        ipAddress: ctx.ipAddress,
      });
    });

    // Detay SORGUSU TRANSACTION DISINDA: transaction icinde global `db`
    // kullanilirsa farkli bir baglanti uzerinden okunur ve henuz commit
    // edilmemis degisiklikler gorunmez.
    return assignmentRepository.findById(assignmentId);
  },

  /** Tum satirlar iade edilmisse fisi kapatir. */
  async close(assignmentId: number, ctx: ActorContext) {
    await db.transaction(async (tx) => {
      const headerRows = await tx
        .select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId))
        .limit(1);

      if (!headerRows[0]) throw new NotFoundError('Zimmet kaydı bulunamadı.');

      const open = await tx
        .select({ id: assignmentItems.id })
        .from(assignmentItems)
        .where(
          and(
            eq(assignmentItems.assignmentId, assignmentId),
            isNull(assignmentItems.returnedAt),
          ),
        );

      if (open.length > 0) {
        throw new BusinessRuleError(
          `Bu zimmette iade edilmemiş ${open.length} satır var. Önce tümü iade alınmalıdır.`,
          { openItems: open.length },
        );
      }

      await recalculateStatus(tx, assignmentId);

      await writeAudit(tx, {
        entityType: 'assignment',
        entityId: assignmentId,
        action: 'update',
        actorId: ctx.actorId,
        after: { status: 'closed' },
        ipAddress: ctx.ipAddress,
      });
    });

    return assignmentRepository.findById(assignmentId);
  },
};
