import { AuditService, AuditFilters, AuditSearchQuery } from '@mhbdev/bdk/services';
import { AuditLog } from '@mhbdev/bdk/core';
import type { AuditChange } from '@mhbdev/bdk/core';
import { db } from '../db/client';
import { auditLogs } from '../db/schema';

function uuid() { return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex'); }

export class DatabaseAuditService extends AuditService {
  async log(entityType: string, entityId: string, action: string, actorId?: string, changes?: AuditChange[], metadata?: Record<string, any>): Promise<AuditLog> {
    const id = uuid();
    const now = new Date();
    await db.insert(auditLogs).values({ id, entityType, entityId, action, actorId: actorId || null, actorType: null, changes: (changes as any) || null, metadata: metadata || null, ipAddress: null, userAgent: null, createdAt: now }).execute();
    return { id, entityType, entityId, action, actorId, changes, metadata, createdAt: now, updatedAt: now };
  }
  async getAuditTrail(entityType: string, entityId: string, filters?: AuditFilters): Promise<AuditLog[]> {
    const rows = await db.select().from(auditLogs).execute();
    return rows.map(r => ({ id: r.id, entityType: r.entityType, entityId: r.entityId, action: r.action, actorId: r.actorId || undefined, changes: (r.changes as any as AuditChange[]) || undefined, metadata: r.metadata || undefined, createdAt: new Date(r.createdAt), updatedAt: new Date(r.createdAt) }));
  }
  async search(query: AuditSearchQuery): Promise<AuditLog[]> { return this.getAuditTrail(query.entityType || '', query.entityId || ''); }
}