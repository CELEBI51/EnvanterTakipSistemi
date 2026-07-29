import type { AssetListQuery } from '@entanter/shared';
import { and, asc, count, desc, eq, exists, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  assetStatusHistory,
  assets,
  assignmentItems,
  assignments,
  categories,
  staff,
} from '../../db/schema/index.js';
import { toOffset } from '../../lib/pagination.js';
import { likePattern } from '../../lib/query.js';

/** Demirbasin SU ANKI acik zimmet satiri (varsa) — listede "kimde?" sutunu icin. */
const currentHolderName = sql<string | null>`(
  SELECT s.first_name || ' ' || s.last_name
  FROM ${assignmentItems} ai
  JOIN ${assignments} a ON a.id = ai.assignment_id
  JOIN ${staff} s ON s.id = a.staff_id
  WHERE ai.asset_id = ${assets.id} AND ai.returned_at IS NULL
  LIMIT 1
)`;

const currentHolderId = sql<number | null>`(
  SELECT a.staff_id
  FROM ${assignmentItems} ai
  JOIN ${assignments} a ON a.id = ai.assignment_id
  WHERE ai.asset_id = ${assets.id} AND ai.returned_at IS NULL
  LIMIT 1
)`;

export const assetRepository = {
  async list(query: AssetListQuery) {
    const conditions = [isNull(assets.deletedAt)];

    if (query.q) {
      const pattern = likePattern(query.q);
      const search = or(
        ilike(assets.assetTag, pattern),
        ilike(assets.serialNo, pattern),
        ilike(assets.brand, pattern),
        ilike(assets.model, pattern),
      );
      if (search) conditions.push(search);
    }
    if (query.status) conditions.push(eq(assets.status, query.status));
    if (query.categoryId != null) conditions.push(eq(assets.categoryId, query.categoryId));

    // includeInactive acikca false ise hurda/kayip/kullanim disi gizlenir.
    if (query.includeInactive === false) {
      conditions.push(inArray(assets.status, ['in_stock', 'assigned', 'in_repair']));
    }

    // Su anda belirli bir personelde olanlar.
    if (query.staffId != null) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(assignmentItems)
            .innerJoin(assignments, eq(assignments.id, assignmentItems.assignmentId))
            .where(
              and(
                eq(assignmentItems.assetId, assets.id),
                isNull(assignmentItems.returnedAt),
                eq(assignments.staffId, query.staffId),
              ),
            ),
        ),
      );
    }

    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: assets.id,
          assetTag: assets.assetTag,
          serialNo: assets.serialNo,
          brand: assets.brand,
          model: assets.model,
          status: assets.status,
          categoryId: assets.categoryId,
          categoryName: categories.name,
          purchaseDate: assets.purchaseDate,
          warrantyEnd: assets.warrantyEnd,
          createdAt: assets.createdAt,
          currentHolderId,
          currentHolderName,
        })
        .from(assets)
        .leftJoin(categories, eq(assets.categoryId, categories.id))
        .where(where)
        .orderBy(desc(assets.createdAt), desc(assets.id))
        .limit(query.limit)
        .offset(toOffset(query.page, query.limit)),
      db.select({ value: count() }).from(assets).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  },

  async findById(id: number) {
    const rows = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        serialNo: assets.serialNo,
        brand: assets.brand,
        model: assets.model,
        status: assets.status,
        categoryId: assets.categoryId,
        categoryName: categories.name,
        purchaseDate: assets.purchaseDate,
        warrantyEnd: assets.warrantyEnd,
        notes: assets.notes,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        currentHolderId,
        currentHolderName,
      })
      .from(assets)
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .where(and(eq(assets.id, id), isNull(assets.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  },

  async findRaw(id: number) {
    const rows = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), isNull(assets.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** QR/barkod okuyucu bu yolu kullanir. Buyuk-kucuk harf farki gozetilmez. */
  async findByTag(tag: string) {
    const rows = await db
      .select()
      .from(assets)
      .where(and(ilike(assets.assetTag, tag), isNull(assets.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Zimmet hareketleri — urun gecmisinin bir bileseni. */
  async assignmentEvents(assetId: number) {
    return db
      .select({
        itemId: assignmentItems.id,
        assignmentId: assignments.id,
        assignmentNo: assignments.assignmentNo,
        assignedAt: assignments.assignedAt,
        returnedAt: assignmentItems.returnedAt,
        returnCondition: assignmentItems.returnCondition,
        returnNotes: assignmentItems.returnNotes,
        locationNote: assignments.locationNote,
        notes: assignments.notes,
        staffId: staff.id,
        staffName: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
        staffEmployeeNo: staff.employeeNo,
      })
      .from(assignmentItems)
      .innerJoin(assignments, eq(assignments.id, assignmentItems.assignmentId))
      .innerJoin(staff, eq(staff.id, assignments.staffId))
      .where(eq(assignmentItems.assetId, assetId))
      .orderBy(asc(assignments.assignedAt));
  },

  /** Durum degisiklikleri — urun gecmisinin diger bileseni. */
  async statusEvents(assetId: number) {
    return db
      .select()
      .from(assetStatusHistory)
      .where(eq(assetStatusHistory.assetId, assetId))
      .orderBy(asc(assetStatusHistory.changedAt));
  },

  /** Demirbas su anda acik bir zimmette mi? */
  async hasOpenAssignment(assetId: number): Promise<boolean> {
    const rows = await db
      .select({ value: count() })
      .from(assignmentItems)
      .where(and(eq(assignmentItems.assetId, assetId), isNull(assignmentItems.returnedAt)));
    return (rows[0]?.value ?? 0) > 0;
  },
};
