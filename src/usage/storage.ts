import type { UsageEvent, UsagePolicy, UsageStorageAdapter } from '../types';

// Simple in-memory storage adapter implementation
export class InMemoryUsageStorageAdapter implements UsageStorageAdapter {
  private events: Map<string, UsageEvent[]> = new Map();
  private policies: Map<string, UsagePolicy> = new Map();
  // Map of composite key `${key}:${idempotencyKey}` to { eventId, ts }
  private idempotencyIndex: Map<string, { eventId: string; ts: number }> = new Map();
  private idempotencyTtlMs?: number;

  constructor(options?: { idempotencyTtlMs?: number }) {
    this.idempotencyTtlMs = options?.idempotencyTtlMs;
  }

  private cleanupIdempotency(now: number) {
    if (!this.idempotencyTtlMs) return;
    const ttl = this.idempotencyTtlMs;
    for (const [k, v] of this.idempotencyIndex.entries()) {
      if (now - v.ts > ttl) {
        this.idempotencyIndex.delete(k);
      }
    }
  }

  async getEvents(key: string): Promise<UsageEvent[]> {
    return this.events.get(key) || [];
  }

  async addEvent(key: string, event: UsageEvent, idempotencyKey?: string): Promise<{ inserted: boolean }> {
    const now = Date.now();
    this.cleanupIdempotency(now);
    if (idempotencyKey) {
      const idemKey = `${key}:${idempotencyKey}`;
      const existing = this.idempotencyIndex.get(idemKey);
      if (existing) {
        // Existing idempotency key still valid
        return { inserted: false };
      }
      this.idempotencyIndex.set(idemKey, { eventId: event.id, ts: now });
    }
    const arr = this.events.get(key) || [];
    arr.push(event);
    this.events.set(key, arr);
    return { inserted: true };
  }

  async getPolicy(key: string): Promise<UsagePolicy | null> {
    return this.policies.get(key) || null;
  }

  async setPolicy(key: string, policy: UsagePolicy): Promise<void> {
    this.policies.set(key, policy);
  }
}

export default InMemoryUsageStorageAdapter;