export const ROUTES = {
  LOGIN: '/login',
  FORBIDDEN: '/403',
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    PRODUCTS: '/admin/products',
    MACHINES: '/admin/machines',
    REPORTS_SPOILAGE: '/admin/reports/spoilage', // FE2 - Task 6.9
    AUDIT_LOGS: '/admin/audit-logs',
  },
  OPERATOR: {
    ROOT: '/operator',
    DASHBOARD: '/operator/dashboard',
    BATCHES: '/operator/batches',
    RESTOCK: '/operator/restock',
    RESTOCK_HISTORY: '/operator/restock/history',
    MACHINES: '/operator/machines',
    SLOTS: '/operator/machines/:machineId/slots',
    REPORTS_SPOILAGE: '/operator/reports/spoilage',
    ALERTS: '/operator/alerts',
  },
} as const;

export const ROLE = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
