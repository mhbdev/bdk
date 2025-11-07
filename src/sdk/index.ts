export { BillingBuilder } from './BillingBuilder';
export * as plans from './plans';
export * as invoice from './invoice';
export * as subscription from './subscription';
export * as nextjs from '../nextjs';
export { DrizzleStorage } from '../storage/drizzle';

import { BillingCore } from '../index';
import { BillingStorage, BillingProvider } from '../core/interfaces';
import { InMemoryStorage } from '../storage/inMemory';
import { StripeAdapter, StripeAdapterOptions } from '../providers/stripe/StripeAdapter';

export function createBilling(opts?: {
  storage?: BillingStorage;
  stripe?: StripeAdapterOptions;
  providers?: Record<string, BillingProvider>;
  defaultProvider?: string;
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
  return core;
}