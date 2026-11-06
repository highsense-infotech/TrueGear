export const MODULES = {
  GATE_ENTRY: 'GATE_ENTRY',
  QC_INSPECTION: 'QC_INSPECTION',
  JOB_CARD: 'JOB_CARD',
  PARTS_MANAGER: 'PARTS_MANAGER',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  ROLE_MANAGEMENT: 'ROLE_MANAGEMENT',
  DASHBOARD: 'DASHBOARD',
  APPOINTMENT: 'APPOINTMENT',
  VEHICLE_360: 'VEHICLE_360',
  CUSTOMER_PROFILE: 'CUSTOMER_PROFILE',
  VEHICLE_OUT: 'VEHICLE_OUT',
  TECHNICIAN: 'TECHNICIAN',
  WORKSHOP: 'WORKSHOP',
  QC_OUT: 'QC_OUT',
  WASHBAY: 'WASHBAY',
  WARRANTY: 'WARRANTY',
  INVOICING: 'INVOICING',
  GATE_RELEASE: 'GATE_RELEASE',
} as const;

// Vehicle Sales is role-based per module: one resource per module, each with
// the usual five actions, granted in Role & User Management. A role sees the
// Vehicle Sales menu when it can view at least one of them. The `slug` matches
// the module slug in screens/vehicle-sales/registry.ts.
export const VEHICLE_SALES_MODULES = [
  { key: 'VEHICLE_SALES_PURCHASE_ORDER', slug: 'purchase-order', label: 'Purchase Order' },
  { key: 'VEHICLE_SALES_GOODS_RECEIPT', slug: 'goods-receipt', label: 'Vehicle Goods Receipt' },
  { key: 'VEHICLE_SALES_STOCK', slug: 'stock', label: 'Vehicle Stock' },
  { key: 'VEHICLE_SALES_CRM', slug: 'crm', label: 'CRM / Enquiry' },
  { key: 'VEHICLE_SALES_QUOTATION', slug: 'quotation', label: 'Quotation' },
  { key: 'VEHICLE_SALES_SALES_ORDER', slug: 'sales-order', label: 'Sales Order' },
  { key: 'VEHICLE_SALES_BODY_BUILDING', slug: 'body-building', label: 'Body Building' },
  { key: 'VEHICLE_SALES_SALES_INVOICE', slug: 'sales-invoice', label: 'Sales Invoice' },
  { key: 'VEHICLE_SALES_PAYMENT', slug: 'payment', label: 'Payment' },
  { key: 'VEHICLE_SALES_HANDOVER', slug: 'handover', label: 'Delivery / Handover' },
  { key: 'VEHICLE_SALES_REPORTS', slug: 'reports', label: 'Reports' },
  { key: 'VEHICLE_SALES_SETTINGS', slug: 'settings', label: 'Settings' },
] as const;

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  APPROVE: 'approve',
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];
