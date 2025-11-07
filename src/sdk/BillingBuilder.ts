import { BillingCore } from '../index';
import { InMemoryStorage } from '../storage/inMemory';
import { BillingProvider, BillingStorage } from '../core/interfaces';
import { StripeAdapter, StripeAdapterOptions } from '../providers/stripe/StripeAdapter';

export class BillingBuilder {
  private storage: BillingStorage;
  private providers: Record<string, BillingProvider> = {};
  private defaultProvider?: string;

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

  build(): BillingCore {
    const core = new BillingCore({ storage: this.storage });
    for (const [name, provider] of Object.entries(this.providers)) {
      core.use(name, provider);
    }
    if (this.defaultProvider) core.setProvider(this.defaultProvider);
    return core;
  }
}