export const MODULES = {
  GATE_ENTRY: 'GATE_ENTRY',
  QC_INSPECTION: 'QC_INSPECTION',
  JOB_CARD: 'JOB_CARD',
  PARTS_MANAGER: 'PARTS_MANAGER',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  ROLE_MANAGEMENT: 'ROLE_MANAGEMENT',
  DASHBOARD: 'DASHBOARD',
} as const;

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  APPROVE: 'approve',
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];
