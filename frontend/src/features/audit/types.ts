export type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_CREATED'
  | 'RESTOCK_COMPLETED'
  | 'ALERT_RESOLVED'
  | 'THRESHOLD_UPDATED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | string;

export interface AuditLogItem {
  id: number;
  action: AuditActionType;
  userId: number | null;
  username: string;
  details: string | null;
  createdAt: string; // ISO DateTime
}

export interface AuditFilterParams {
  username?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}