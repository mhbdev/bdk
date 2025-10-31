import { BaseEntity } from "./interfaces";

/**
 * Audit log entry for compliance and debugging
 */
export interface AuditLog extends BaseEntity {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorType?: 'user' | 'system' | 'api';
  changes?: AuditChange[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}