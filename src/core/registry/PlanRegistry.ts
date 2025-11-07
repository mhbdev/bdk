import { BillingStorage } from '../interfaces';
import { BillingEvent, Plan } from '../models/types';
import type Redis from 'ioredis';

export interface PlanRegistryOptions {
  validateDrift?: 'off' | 'warn' | 'error';
  cacheTtlSeconds?: number; // for Redis cache
}

export class PlanRegistry {
  private codePlansById = new Map<string, Plan>();
  private cache = new Map<string, Plan>();
  private redis?: Redis;
  private opts: PlanRegistryOptions;

  constructor(private storage: BillingStorage, codePlans?: Plan[] | Record<string, Plan>, opts?: PlanRegistryOptions, redis?: Redis) {
    this.opts = { validateDrift: 'warn', ...opts };
    this.redis = redis;
    if (Array.isArray(codePlans)) {
      for (const p of codePlans) this.codePlansById.set(p.id, p);
    } else if (codePlans) {
      for (const p of Object.values(codePlans)) this.codePlansById.set(p.id, p);
    }
  }

  register(plan: Plan): void {
    this.codePlansById.set(plan.id, plan);
  }

  private async getCached(planId: string): Promise<Plan | null> {
    if (this.cache.has(planId)) return this.cache.get(planId)!;
    if (this.redis) {
      const raw = await this.redis.get(`bdk:plan:${planId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cache.set(planId, parsed);
        return parsed as Plan;
      }
    }
    return null;
  }

  private async setCached(plan: Plan): Promise<void> {
    this.cache.set(plan.id, plan);
    if (this.redis) {
      const ttl = this.opts.cacheTtlSeconds ?? 300;
      await this.redis.set(`bdk:plan:${plan.id}`, JSON.stringify(plan), 'EX', ttl);
    }
  }

  async getPlan(planId: string): Promise<Plan | null> {
    const cached = await this.getCached(planId);
    if (cached) return cached;
    // Prefer storage-backed plans
    const fromStorage = await this.storage.getPlanById(planId);
    if (fromStorage) {
      await this.setCached(fromStorage);
      // Drift validation against code-declared version, if present
      const code = this.codePlansById.get(planId);
      if (code) this.validateDrift(fromStorage, code);
      return fromStorage;
    }
    // Fallback to code-declared plans
    const code = this.codePlansById.get(planId) ?? null;
    if (code) await this.setCached(code);
    return code;
  }

  async listPlans(): Promise<Plan[]> {
    const stored = await this.storage.listPlans();
    const codeOnly = Array.from(this.codePlansById.values()).filter(
      (p) => !stored.find((sp) => sp.id === p.id),
    );
    const all = [...stored, ...codeOnly];
    for (const p of all) await this.setCached(p);
    return all;
  }

  attachToEvents(on: (handler: (event: BillingEvent) => void) => void): void {
    on((evt) => {
      if (evt.type === 'plan.updated') {
        const planId = String(evt.payload?.id ?? evt.payload?.planId ?? '');
        if (planId) this.invalidate(planId);
      }
    });
  }

  async invalidate(planId: string): Promise<void> {
    this.cache.delete(planId);
    if (this.redis) await this.redis.del(`bdk:plan:${planId}`);
  }

  private validateDrift(storagePlan: Plan, codePlan: Plan): void {
    const mode = this.opts.validateDrift ?? 'warn';
    if (mode === 'off') return;
    const mismatches: string[] = [];
    if (storagePlan.currency !== codePlan.currency) mismatches.push('currency');
    if (storagePlan.strategy !== codePlan.strategy) mismatches.push('strategy');
    const sPrices = storagePlan.pricing?.map((p) => `${p.id}:${p.type}:${p.currency}:${p.unitAmount}`).sort().join('|') ?? '';
    const cPrices = codePlan.pricing?.map((p) => `${p.id}:${p.type}:${p.currency}:${p.unitAmount}`).sort().join('|') ?? '';
    if (sPrices !== cPrices) mismatches.push('pricing');
    if (!mismatches.length) return;
    const msg = `Plan drift detected for '${storagePlan.id}': ${mismatches.join(', ')}`;
    if (mode === 'error') throw new Error(msg);
    // warn
    console.warn(msg);
  }
}

export default PlanRegistry;