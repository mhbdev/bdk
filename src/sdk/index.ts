export { BillingBuilder } from './BillingBuilder';
export * as plans from './plans';
export * as invoice from './invoice';
export * as subscription from './subscription';
export * as usage from './usage';
export * as nextjs from '../nextjs';
export { DrizzleStorage } from '../storage/drizzle';
export { PlanRegistry } from '../core/registry/PlanRegistry';
export type { PlanRegistryOptions } from '../core/registry/PlanRegistry';

import { BillingCore } from '../index';
import { BillingStorage, BillingProvider } from '../core/interfaces';
import { InMemoryStorage } from '../storage/inMemory';
import { StripeAdapter, StripeAdapterOptions } from '../providers/stripe/StripeAdapter';
import { Plan } from '../core/models/types';
import type Redis from 'ioredis';
import { PlanRegistry, PlanRegistryOptions } from '../core/registry/PlanRegistry';

export function createBilling(opts?: {
  storage?: BillingStorage;
  stripe?: StripeAdapterOptions;
  providers?: Record<string, BillingProvider>;
  defaultProvider?: string;
  plans?: Plan[] | Record<string, Plan>;
  planRegistry?: PlanRegistryOptions;
  redis?: Redis;
}): BillingCore {
  const storage = opts?.storage ?? new InMemoryStorage();
  const core = new BillingCore({ storage });
  if (opts?.stripe) {
    const stripe = new StripeAdapter(opts.stripe);
    core.use('stripe', stripe);
    if (!opts?.defaultProvider) core.setProvider('stripe');
  }
  if (opts?.providers) {
    for (const [name, p] of Object.entries(opts.providers)) core.use(name, p);
  }
  if (opts?.defaultProvider) core.setProvider(opts.defaultProvider);
  if (opts?.plans || opts?.planRegistry || opts?.redis) {
    const registry = new PlanRegistry(storage, opts?.plans, opts?.planRegistry, opts?.redis);
    core.setPlanRegistry(registry);
  }
  return core;
}

export async function createBillingAsync(opts?: {
  storage?: BillingStorage;
  stripe?: StripeAdapterOptions;
  providers?: Record<string, BillingProvider>;
  defaultProvider?: string;
  plans?: Plan[] | Record<string, Plan>;
  planRegistry?: PlanRegistryOptions;
  redis?: Redis;
  persistPlans?: boolean;
}): Promise<BillingCore> {
  const core = createBilling({
    storage: opts?.storage,
    stripe: opts?.stripe,
    providers: opts?.providers,
    defaultProvider: opts?.defaultProvider,
    plans: opts?.plans,
    planRegistry: opts?.planRegistry,
    redis: opts?.redis,
  });
  if (opts?.persistPlans && opts?.plans) {
    const plans = Array.isArray(opts.plans) ? opts.plans : Object.values(opts.plans);
    for (const p of plans) await core.savePlan(p);
  }
  return core;
}