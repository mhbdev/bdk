import { BillingCore } from '../index';
import { InMemoryStorage } from '../storage/inMemory';
import { BillingProvider, BillingStorage } from '../core/interfaces';
import { Plan } from '../core/models/types';
import { PlanRegistry, PlanRegistryOptions } from '../core/registry/PlanRegistry';
import type Redis from 'ioredis';
import { StripeAdapter, StripeAdapterOptions } from '../providers/stripe/StripeAdapter';

export class BillingBuilder {
  private storage: BillingStorage;
  private providers: Record<string, BillingProvider> = {};
  private defaultProvider?: string;
  private codePlans?: Plan[] | Record<string, Plan>;
  private registryOpts?: PlanRegistryOptions;
  private redis?: Redis;
  private persistPlansOnBuild = false;

  constructor(storage?: BillingStorage) {
    this.storage = storage ?? new InMemoryStorage();
  }

  static inMemory(): BillingBuilder {
    return new BillingBuilder(new InMemoryStorage());
  }

  withStorage(storage: BillingStorage): BillingBuilder {
    this.storage = storage;
    return this;
  }

  withProvider(name: string, provider: BillingProvider, setDefault = true): BillingBuilder {
    this.providers[name] = provider;
    if (setDefault) this.defaultProvider = name;
    return this;
  }

  withStripe(opts: StripeAdapterOptions, setDefault = true): BillingBuilder {
    const stripe = new StripeAdapter(opts);
    return this.withProvider('stripe', stripe, setDefault);
  }

  setDefaultProvider(name: string): BillingBuilder {
    this.defaultProvider = name;
    return this;
  }

  withPlans(plans: Plan[] | Record<string, Plan>, options?: { persistOnBuild?: boolean }): BillingBuilder {
    this.codePlans = plans;
    this.persistPlansOnBuild = !!options?.persistOnBuild;
    return this;
  }

  withPlanRegistry(opts?: PlanRegistryOptions, redis?: Redis): BillingBuilder {
    this.registryOpts = opts;
    this.redis = redis;
    return this;
  }

  setDriftValidation(mode: NonNullable<PlanRegistryOptions['validateDrift']>): BillingBuilder {
    this.registryOpts = { ...(this.registryOpts ?? {}), validateDrift: mode };
    return this;
  }

  setCacheTtl(seconds: number): BillingBuilder {
    this.registryOpts = { ...(this.registryOpts ?? {}), cacheTtlSeconds: seconds };
    return this;
  }

  build(): BillingCore {
    const core = new BillingCore({ storage: this.storage });
    for (const [name, provider] of Object.entries(this.providers)) {
      core.use(name, provider);
    }
    if (this.defaultProvider) core.setProvider(this.defaultProvider);
    if (this.codePlans || this.registryOpts || this.redis) {
      const registry = new PlanRegistry(this.storage, this.codePlans, this.registryOpts, this.redis);
      core.setPlanRegistry(registry);
    }
    return core;
  }

  async buildAsync(): Promise<BillingCore> {
    const core = this.build();
    if (this.persistPlansOnBuild && this.codePlans) {
      const plans = Array.isArray(this.codePlans) ? this.codePlans : Object.values(this.codePlans);
      for (const p of plans) await core.savePlan(p);
    }
    return core;
  }
}