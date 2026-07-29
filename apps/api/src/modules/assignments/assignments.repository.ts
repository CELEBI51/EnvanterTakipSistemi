import type { AssignmentListQuery } from '@entanter/shared';
import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  assignmentItems,
  assignments,
  departments,
  staff,
} from '../../db/schema/index.js';
import { toOffset } from '../../lib/pagination.js';
import { likePattern } from '../../lib/query.js';

export const assignmentRepository = {
  async list(query: AssignmentListQuery) {
    const conditions = [];

    if (query.q) {
      const pattern = likePattern(query.q);
      const search = or(
        ilike(assignments.assignmentNo, pattern),
        ilike(staff.firstName, pattern),
        ilike(staff.lastName, pattern),
        ilike(staff.employeeNo, pattern),
      );
      if (search) conditions.push(search);
    }
    if (query.staffId != null) conditions.push(eq(assignments.staffId, query.staffId));
    if (query.departmentId != null) {
      conditions.push(eq(assignments.departmentId, query.departmentId));
    }
    if (query.status) conditions.push(eq(assignments.status, query.status));
    if (query.from) conditions.push(gte(assignments.assignedAt, query.from));
    if (query.to) conditions.push(lte(assignments.assignedAt, query.to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: assignments.id,
          assignmentNo: assignments.assignmentNo,
          assignedAt: assignments.assignedAt,
          status: assignments.status,
          locationNote: assignments.locationNote,
          closedAt: assignments.closedAt,
          staffId: staff.id,
          staffName: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
          staffEmployeeNo: staff.employeeNo,
          departmentId: assignments.departmentId,
          departmentName: departments.name,
          itemCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${assignmentItems} ai
            WHERE ai.assignment_id = ${assignments.id}
          )`,
          openItemCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${assignmentItems} ai
            WHERE ai.assignment_id = ${assignments.id} AND ai.returned_at IS NULL
          )`,
        })
        .from(assignments)
        .innerJoin(staff, eq(staff.id, assignments.staffId))
        .leftJoin(departments, eq(departments.id, assignments.departmentId))
        .where(where)
        .orderBy(desc(assignments.assignedAt), desc(assignments.id))
        .limit(query.limit)
        .offset(toOffset(query.page, query.limit)),
      db
        .select({ value: count() })
        .from(assignments)
        .innerJoin(staff, eq(staff.id, assignments.staffId))
        .where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  },

  /**
   * Zimmet detayi. PDF tutanagi ileride eklendiginde gereken TUM alanlari
   * simdiden icerir; o zaman yeni sorgu yazmak gerekmeyecek, yalnizca
   * render katmani eklenecek.
   */
  async findById(id: number) {
    return db.query.assignments.findFirst({
      where: eq(assignments.id, id),
      with: {
        staff: {
          columns: {
            id: true,
            employeeNo: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            phone: true,
          },
          with: { department: { columns: { id: true, name: true } } },
        },
        department: { columns: { id: true, name: true, code: true } },
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

  /** Personelin uzerindeki acik kalemler — rapor icin. */
  async openByStaff() {
    return db
      .select({
        staffId: staff.id,
        staffName: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
        employeeNo: staff.employeeNo,
        departmentName: departments.name,
        openItems: sql<number>`COUNT(${assignmentItems.id})::int`,
      })
      .from(assignmentItems)
      .innerJoin(assignments, eq(assignments.id, assignmentItems.assignmentId))
      .innerJoin(staff, eq(staff.id, assignments.staffId))
      .leftJoin(departments, eq(departments.id, assignments.departmentId))
      .where(isNull(assignmentItems.returnedAt))
      .groupBy(staff.id, staff.firstName, staff.lastName, staff.employeeNo, departments.name)
      .orderBy(desc(sql`COUNT(${assignmentItems.id})`));
  },
};
