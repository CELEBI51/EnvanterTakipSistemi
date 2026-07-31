import type { StaffListQuery } from '@entanter/shared';
import { and, asc, count, desc, eq, exists, ilike, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  assignmentItems,
  assignments,
  departments,
  staff,
} from '../../db/schema/index.js';
import { toOffset } from '../../lib/pagination.js';
import { likePattern } from '../../lib/query.js';

/** Personelin uzerinde iade edilmemis satir var mi? */
function hasOpenItemsSubquery() {
  return exists(
    db
      .select({ one: sql`1` })
      .from(assignments)
      .innerJoin(assignmentItems, eq(assignmentItems.assignmentId, assignments.id))
      .where(and(eq(assignments.staffId, staff.id), isNull(assignmentItems.returnedAt))),
  );
}

export const staffRepository = {
  async list(query: StaffListQuery) {
    const conditions = [isNull(staff.deletedAt)];

    if (query.q) {
      const pattern = likePattern(query.q);
      const search = or(
        ilike(staff.firstName, pattern),
        ilike(staff.lastName, pattern),
        ilike(staff.employeeNo, pattern),
        // Ad ve soyadi birlikte arayabilmek icin ("ahmet yilmaz").
        ilike(sql`${staff.firstName} || ' ' || ${staff.lastName}`, pattern),
      );
      if (search) conditions.push(search);
    }
    if (query.departmentId != null) conditions.push(eq(staff.departmentId, query.departmentId));
    if (query.isActive !== undefined) conditions.push(eq(staff.isActive, query.isActive));
    if (query.hasOpenAssignments === true) conditions.push(hasOpenItemsSubquery());

    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: staff.id,
          employeeNo: staff.employeeNo,
          firstName: staff.firstName,
          lastName: staff.lastName,
          title: staff.title,
          email: staff.email,
          phone: staff.phone,
          isActive: staff.isActive,
          departmentId: staff.departmentId,
          departmentName: departments.name,
          createdAt: staff.createdAt,
          /** Su anda uzerinde bulunan (iade edilmemis) satir sayisi. */
          openItemCount: sql<number>`(
            SELECT COUNT(*)::int
            FROM ${assignments} a
            JOIN ${assignmentItems} ai ON ai.assignment_id = a.id
            WHERE a.staff_id = ${staff.id} AND ai.returned_at IS NULL
          )`,
        })
        .from(staff)
        .leftJoin(departments, eq(staff.departmentId, departments.id))
        .where(where)
        .orderBy(asc(staff.lastName), asc(staff.firstName))
        .limit(query.limit)
        .offset(toOffset(query.page, query.limit)),
      db.select({ value: count() }).from(staff).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  },

  async findById(id: number) {
    const rows = await db
      .select({
        id: staff.id,
        employeeNo: staff.employeeNo,
        firstName: staff.firstName,
        lastName: staff.lastName,
        title: staff.title,
        email: staff.email,
        phone: staff.phone,
        notes: staff.notes,
        isActive: staff.isActive,
        externalRef: staff.externalRef,
        departmentId: staff.departmentId,
        departmentName: departments.name,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      })
      .from(staff)
      .leftJoin(departments, eq(staff.departmentId, departments.id))
      .where(and(eq(staff.id, id), isNull(staff.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  },

  async findRaw(id: number) {
    const rows = await db
      .select()
      .from(staff)
      .where(and(eq(staff.id, id), isNull(staff.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Personelin uzerinde iade edilmemis kac satir var. */
  async countOpenItems(staffId: number): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(assignments)
      .innerJoin(assignmentItems, eq(assignmentItems.assignmentId, assignments.id))
      .where(and(eq(assignments.staffId, staffId), isNull(assignmentItems.returnedAt)));
    return rows[0]?.value ?? 0;
  },

  /**
   * PERSONEL GECMISI — cift yonlu izlenebilirligin personel tarafi.
   * `onlyOpen` ile "su anda uzerinde ne var", filtresiz ile tum gecmis.
   */
  async history(staffId: number, onlyOpen: boolean) {
    return db.query.assignments.findMany({
      where: onlyOpen
        ? and(eq(assignments.staffId, staffId), ne(assignments.status, 'closed'))
        : eq(assignments.staffId, staffId),
      orderBy: [desc(assignments.assignedAt), desc(assignments.id)],
      with: {
        department: { columns: { id: true, name: true } },
        assignedByUser: { columns: { id: true, username: true, fullName: true } },
        items: {
          with: {
            asset: {
              columns: {
                id: true,
                assetTag: true,
                serialNo: true,
                brand: true,
                model: true,
                status: true,
              },
            },
            consumable: { columns: { id: true, sku: true, name: true, unit: true } },
            returnedToUser: { columns: { id: true, fullName: true } },
          },
        },
      },
    });
  },
};
