import { AuditChange, AuditLog } from "../core";

/**
 * Abstract audit service
 */
export abstract class AuditService {
  /**
   * Log an action
   */
  abstract log(
    entityType: string,
    entityId: string,
    action: string,
    actorId?: string,
    changes?: AuditChange[],
    metadata?: Record<string, any>
  ): Promise<AuditLog>;

  /**
   * Get audit trail for an entity
   */
  abstract getAuditTrail(
    entityType: string,
    entityId: string,
    filters?: AuditFilters
  ): Promise<AuditLog[]>;

  /**
   * Search audit logs
   */
  abstract search(
    query: AuditSearchQuery
  ): Promise<AuditLog[]>;
}

export interface AuditFilters {
  action?: string;
  actorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditSearchQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  text?: string;
}