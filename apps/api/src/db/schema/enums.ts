import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ASSET_STATUS_VALUES,
  ASSIGNMENT_STATUS_VALUES,
  CATEGORY_KIND_VALUES,
  RETURN_CONDITION_VALUES,
  STOCK_MOVEMENT_TYPE_VALUES,
} from '@entanter/shared';

/**
 * PostgreSQL enum tipleri. Degerler @entanter/shared'dan gelir —
 * boylece frontend etiketleri, API dogrulamasi ve veritabani tipi
 * birbirinden kayamaz.
 */
export const assetStatusEnum = pgEnum('asset_status', ASSET_STATUS_VALUES);
export const assignmentStatusEnum = pgEnum('assignment_status', ASSIGNMENT_STATUS_VALUES);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', STOCK_MOVEMENT_TYPE_VALUES);
export const returnConditionEnum = pgEnum('return_condition', RETURN_CONDITION_VALUES);
export const categoryKindEnum = pgEnum('category_kind', CATEGORY_KIND_VALUES);
