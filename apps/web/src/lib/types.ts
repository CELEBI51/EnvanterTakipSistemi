import type { AssetStatus } from '@entanter/shared';

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StaffRow {
  id: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  departmentId: number | null;
  departmentName: string | null;
  openItemCount: number;
  createdAt: string;
}

export interface AssetRow {
  id: number;
  assetTag: string;
  serialNo: string | null;
  brand: string | null;
  model: string | null;
  status: AssetStatus;
  categoryId: number | null;
  categoryName: string | null;
  purchaseDate: string | null;
  warrantyEnd: string | null;
  currentHolderId: number | null;
  currentHolderName: string | null;
  createdAt: string;
}

export interface ConsumableRow {
  id: number;
  sku: string | null;
  name: string;
  unit: string;
  quantityOnHand: number;
  packageSize: number;
  minStockLevel: number;
  categoryId: number | null;
  categoryName: string | null;
  isLowStock: boolean;
  assignedQuantity: number;
  createdAt: string;
}

export interface InventorySummary {
  assets: { total: number; byStatus: Partial<Record<AssetStatus, number>> };
  consumables: { items: number; totalQuantity: number; lowStockItems: number };
  activeStaff: number;
}

export interface StaffOpenAssignment {
  staffId: number;
  staffName: string;
  employeeNo: string;
  departmentName: string | null;
  openItems: number;
}
