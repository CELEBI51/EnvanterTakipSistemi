import type {
  CreateConsumableInput,
  StockMovementInput,
  StockMovementType,
  UpdateConsumableInput,
} from '@entanter/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { consumables, stockMovements } from '../../db/schema/index.js';
import { writeAudit, type DbExecutor, type Tx } from '../../lib/audit.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { nextConsumableSku } from '../../lib/numbering.js';
import { definedOnly } from '../../lib/query.js';
import type { ActorContext } from '../assets/assets.service.js';
import { consumableRepository } from './consumables.repository.js';

/**
 * TEK stok degistirme noktasi.
 *
 * Hem elle stok girisi hem zimmet cikisi/iadesi bu fonksiyondan gecer;
 * boylece `consumables.quantity_on_hand` ile `stock_movements` defteri
 * asla birbirinden ayrilmaz.
 *
 * Satir `FOR UPDATE` ile kilitlenir: iki es zamanli zimmet ayni stoktan
 * dusmeye calistiginda biri digerini beklemek zorunda kalir, aksi halde
 * "kayip guncelleme" olusur ve stok gercekte olandan fazla gorunur.
 */
export async function applyStockMovement(
  tx: Tx,
  input: {
    consumableId: number;
    /** Isaretli delta: giris/iade +, cikis -. */
    delta: number;
    movementType: StockMovementType;
    reason: string | null;
    assignmentItemId?: number | null;
    performedBy: number | null;
  },
): Promise<{ balanceAfter: number; name: string }> {
  const locked = await tx
    .select({
      id: consumables.id,
      name: consumables.name,
      unit: consumables.unit,
      quantityOnHand: consumables.quantityOnHand,
    })
    .from(consumables)
    .where(and(eq(consumables.id, input.consumableId), isNull(consumables.deletedAt)))
    .for('update')
    .limit(1);

  const row = locked[0];
  if (!row) throw new NotFoundError('Aksesuar / sarf malzeme bulunamadı.');

  const balanceAfter = row.quantityOnHand + input.delta;

  // Anlamli mesaj icin burada da kontrol ediliyor; ASIL garanti
  // veritabanindaki chk_consumables_qty_non_negative kisitidir.
  if (balanceAfter < 0) {
    throw new BusinessRuleError(
      `"${row.name}" için yeterli stok yok. Mevcut: ${row.quantityOnHand} ${row.unit}, istenen: ${Math.abs(input.delta)} ${row.unit}.`,
      { available: row.quantityOnHand, requested: Math.abs(input.delta) },
    );
  }

  await tx
    .update(consumables)
    .set({ quantityOnHand: balanceAfter, updatedAt: new Date() })
    .where(eq(consumables.id, input.consumableId));

  await tx.insert(stockMovements).values({
    consumableId: input.consumableId,
    movementType: input.movementType,
    quantity: input.delta,
    balanceAfter,
    assignmentItemId: input.assignmentItemId ?? null,
    reason: input.reason,
    performedBy: input.performedBy,
  });

  return { balanceAfter, name: row.name };
}

export const consumableService = {
  applyStockMovement,

  async create(input: CreateConsumableInput, ctx: ActorContext) {
    return db.transaction(async (tx) => {
      const sku = input.sku ?? (await nextConsumableSku(tx));

      const [created] = await tx
        .insert(consumables)
        .values({
          sku,
          name: input.name,
          categoryId: input.categoryId ?? null,
          unit: input.unit,
          packageSize: input.packageSize,
          minStockLevel: input.minStockLevel,
          notes: input.notes ?? null,
          quantityOnHand: 0,
        })
        .returning();

      if (!created) throw new Error('Sarf malzeme oluşturulamadı.');

      // Ilk stok da defterden gecer; "nereden geldi" sorusu cevapsiz kalmasin.
      if (input.initialQuantity > 0) {
        await applyStockMovement(tx, {
          consumableId: created.id,
          delta: input.initialQuantity,
          movementType: 'in',
          reason: 'Kayıt açılışında ilk stok girişi',
          performedBy: ctx.actorId,
        });
      }

      await writeAudit(tx, {
        entityType: 'consumable',
        entityId: created.id,
        action: 'create',
        actorId: ctx.actorId,
        after: { ...created, initialQuantity: input.initialQuantity },
        ipAddress: ctx.ipAddress,
      });

      return { ...created, quantityOnHand: input.initialQuantity };
    });
  },

  async update(id: number, input: UpdateConsumableInput, ctx: ActorContext) {
    const before = await consumableRepository.findRaw(id);
    if (!before) throw new NotFoundError('Aksesuar / sarf malzeme bulunamadı.');

    // Stok adedi buradan DEGISTIRILEMEZ; yalnizca stok hareketiyle degisir.
    const patch = definedOnly({
      sku: input.sku,
      name: input.name,
      categoryId: input.categoryId,
      unit: input.unit,
      packageSize: input.packageSize,
      minStockLevel: input.minStockLevel,
      notes: input.notes,
    });

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(consumables)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(consumables.id, id))
        .returning();

      await writeAudit(tx, {
        entityType: 'consumable',
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
   * Elle stok hareketi.
   *  - `in`     : koli veya adet bazli giris (delta pozitif)
   *  - `adjust` : sayim sonucu MUTLAK adet; delta fark kadar +/- olur
   */
  async moveStock(id: number, input: StockMovementInput, ctx: ActorContext) {
    const current = await consumableRepository.findRaw(id);
    if (!current) throw new NotFoundError('Aksesuar / sarf malzeme bulunamadı.');

    let delta: number;
    let reason: string | null;

    if (input.movementType === 'in') {
      // Koli sayisi verildiyse paket ici adetle carpilir (toplu giris).
      delta =
        input.packageCount != null
          ? input.packageCount * current.packageSize
          : (input.quantity ?? 0);
      reason =
        input.reason ??
        (input.packageCount != null
          ? `${input.packageCount} koli x ${current.packageSize} ${current.unit} giriş`
          : 'Stok girişi');
    } else {
      delta = input.newQuantity - current.quantityOnHand;
      if (delta === 0) {
        throw new BusinessRuleError(
          `Sayım sonucu mevcut stokla aynı (${current.quantityOnHand} ${current.unit}). Değişiklik yapılmadı.`,
        );
      }
      reason = `Sayım düzeltmesi: ${current.quantityOnHand} -> ${input.newQuantity}. ${input.reason}`;
    }

    return db.transaction(async (tx) => {
      const result = await applyStockMovement(tx, {
        consumableId: id,
        delta,
        movementType: input.movementType,
        reason,
        performedBy: ctx.actorId,
      });

      await writeAudit(tx, {
        entityType: 'consumable',
        entityId: id,
        action: 'stock_movement',
        actorId: ctx.actorId,
        before: { quantityOnHand: current.quantityOnHand },
        after: { quantityOnHand: result.balanceAfter, delta, movementType: input.movementType },
        ipAddress: ctx.ipAddress,
      });

      return {
        id,
        name: result.name,
        previousQuantity: current.quantityOnHand,
        quantityOnHand: result.balanceAfter,
        delta,
      };
    });
  },
};
