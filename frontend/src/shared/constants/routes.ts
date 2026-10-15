export const ROUTES = {
  LOGIN: '/login',
  FORBIDDEN: '/403',
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    PRODUCTS: '/admin/products',
    MACHINES: '/admin/machines',
  },
  OPERATOR: {
    ROOT: '/operator',
    MACHINES: '/operator/machines',
    RESTOCK: '/operator/restock',
    ALERTS: '/operator/alerts',
  },
} as const;

export const ROLE = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
