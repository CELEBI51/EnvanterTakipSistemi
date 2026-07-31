import { relations } from 'drizzle-orm';

import { assetStatusHistory, assets } from './assets.js';
import { assignmentItems, assignments } from './assignments.js';
import { auditLog } from './audit.js';
import { consumables } from './consumables.js';
import { categories, departments } from './organization.js';
import { staff } from './staff.js';
import { stockMovements } from './stock-movements.js';
import { authorizedUsers, refreshTokens } from './users.js';

export * from './assets.js';
export * from './assignments.js';
export * from './audit.js';
export * from './consumables.js';
export * from './enums.js';
export * from './organization.js';
export * from './sequences.js';
export * from './staff.js';
export * from './stock-movements.js';
export * from './users.js';

/* ================================================================= */
/* Iliskiler — db.query.* ile ic ice sorgular icin                    */
/* ================================================================= */

export const departmentsRelations = relations(departments, ({ many }) => ({
  staff: many(staff),
  assignments: many(assignments),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  assets: many(assets),
  consumables: many(consumables),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  department: one(departments, {
    fields: [staff.departmentId],
    references: [departments.id],
  }),
  assignments: many(assignments),
}));

export const authorizedUsersRelations = relations(authorizedUsers, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(authorizedUsers, {
    fields: [refreshTokens.userId],
    references: [authorizedUsers.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  category: one(categories, {
    fields: [assets.categoryId],
    references: [categories.id],
  }),
  assignmentItems: many(assignmentItems),
  statusHistory: many(assetStatusHistory),
}));

export const assetStatusHistoryRelations = relations(assetStatusHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [assetStatusHistory.assetId],
    references: [assets.id],
  }),
  changedByUser: one(authorizedUsers, {
    fields: [assetStatusHistory.changedBy],
    references: [authorizedUsers.id],
  }),
}));

export const consumablesRelations = relations(consumables, ({ one, many }) => ({
  category: one(categories, {
    fields: [consumables.categoryId],
    references: [categories.id],
  }),
  assignmentItems: many(assignmentItems),
  movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  consumable: one(consumables, {
    fields: [stockMovements.consumableId],
    references: [consumables.id],
  }),
  assignmentItem: one(assignmentItems, {
    fields: [stockMovements.assignmentItemId],
    references: [assignmentItems.id],
  }),
  performedByUser: one(authorizedUsers, {
    fields: [stockMovements.performedBy],
    references: [authorizedUsers.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  staff: one(staff, {
    fields: [assignments.staffId],
    references: [staff.id],
  }),
  assignedByUser: one(authorizedUsers, {
    fields: [assignments.assignedBy],
    references: [authorizedUsers.id],
  }),
  department: one(departments, {
    fields: [assignments.departmentId],
    references: [departments.id],
  }),
  items: many(assignmentItems),
}));

export const assignmentItemsRelations = relations(assignmentItems, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [assignmentItems.assignmentId],
    references: [assignments.id],
  }),
  asset: one(assets, {
    fields: [assignmentItems.assetId],
    references: [assets.id],
  }),
  consumable: one(consumables, {
    fields: [assignmentItems.consumableId],
    references: [consumables.id],
  }),
  returnedToUser: one(authorizedUsers, {
    fields: [assignmentItems.returnedTo],
    references: [authorizedUsers.id],
  }),
  movements: many(stockMovements),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(authorizedUsers, {
    fields: [auditLog.actorId],
    references: [authorizedUsers.id],
  }),
}));
