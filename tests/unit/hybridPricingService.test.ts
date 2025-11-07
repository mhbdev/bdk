import { describe, it, expect } from 'vitest';
import { HybridPricingService } from '../../src/services/pricing/HybridPricingService';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';
import { Plan } from '../../src/core/models/types';

class MockConverter extends CurrencyConversionService {
  constructor() { super(); }
  async convert(amount: number): Promise<number> { return amount * 2; }
}

const basePlan = (currency: 'USD' | 'EUR'): Plan => ({
  id: 'p', productId: 'prod_p', name: 'Pro', currency,
  pricing: [
    { id: 'price_base', type: 'flat', currency, unitAmount: 1000, billingInterval: 'month' },
    { id: 'price_usage', type: 'usage', currency, unitAmount: 100, metric: 'api' },
  ],
  strategy: 'hybrid',
  basePriceId: 'price_base',
});

describe('HybridPricingService', () => {
  it('computes charge without conversion', async () => {
    const svc = new HybridPricingService(new MockConverter());
    const plan = basePlan('USD');
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'api', quantity: 5, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date() });
    expect(res.total.amount).toBe(1000 + 5 * 100);
    expect(res.items.length).toBe(2);
    expect(res.items[1].quantity).toBe(5);
    expect(res.total.currency).toBe('USD');
  });

  it('uses one-time description when billingInterval missing', async () => {
    const svc = new HybridPricingService(new MockConverter());
    const plan: Plan = {
      id: 'p', productId: 'prod_basic', name: 'Basic', currency: 'USD',
      pricing: [
        { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 500 },
        { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 10, metric: 'api' },
      ],
      strategy: 'hybrid',
      basePriceId: 'price_base',
    };
    const res = await svc.computeChargeWithConversion({ plan, usage: [], periodStart: new Date(), periodEnd: new Date() });
    expect(res.items[0].description).toContain('one-time');
  });

  it('computes charge with conversion to EUR', async () => {
    const svc = new HybridPricingService(new MockConverter());
    const plan = basePlan('USD');
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'api', quantity: 3, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date(), targetCurrency: 'EUR' });
    // base and usage both converted by *2 in mock
    expect(res.total.amount).toBe((1000 * 2) + (3 * 100 * 2));
    expect(res.total.currency).toBe('EUR');
  });

  it('computes tiered usage amounts', async () => {
    const svc = new HybridPricingService(new MockConverter());
    const plan: Plan = {
      id: 'p', productId: 'prod_p', name: 'Pro', currency: 'USD',
      pricing: [
        { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 1000 },
        { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 0, metric: 'api', tiers: [ { upTo: 5, unitAmount: 50 }, { upTo: 10, unitAmount: 40 } ] },
      ],
      strategy: 'hybrid',
      basePriceId: 'price_base',
    };
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'api', quantity: 7, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date() });
    // tiered: first 5 at 50 = 250, next 2 at 40 = 80 -> 330
    expect(res.total.amount).toBe(1000 + 330);
  });

  it('computes tiered with remainder beyond last tier', async () => {
    const svc = new HybridPricingService(new MockConverter());
    const plan: Plan = {
      id: 'p', productId: 'prod_p', name: 'Pro', currency: 'USD',
      pricing: [
        { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 1000 },
        { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 0, metric: 'api', tiers: [ { upTo: 2, unitAmount: 50 }, { upTo: 4, unitAmount: 40 } ] },
      ],
      strategy: 'hybrid',
      basePriceId: 'price_base',
    };
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'api', quantity: 10, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date() });
    // tiers cover 6 units, remaining 10-6=4 at last tier price 40: 2*50 + 4*40 + 4*40 = 100 + 160 + 160 = 420
    expect(res.total.amount).toBe(1000 + 420);
  });

  it('throws if plan missing base or usage', async () => {
    const svc = new HybridPricingService(new MockConverter());
    const bad: Plan = { id: 'b', productId: 'prod_b', name: 'Bad', currency: 'USD', pricing: [ { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 1000 } ], strategy: 'hybrid', basePriceId: 'price_base' };
    await expect(svc.computeChargeWithConversion({ plan: bad, periodStart: new Date(), periodEnd: new Date() })).rejects.toThrow(/must include flat and usage/);

    const bad2: Plan = { id: 'b2', productId: 'prod_b2', name: 'Bad2', currency: 'USD', pricing: [ { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 10, metric: 'api' } ], strategy: 'hybrid', basePriceId: 'none' } as any;
    await expect(svc.computeChargeWithConversion({ plan: bad2, periodStart: new Date(), periodEnd: new Date() })).rejects.toThrow(/must include flat and usage/);
  });
});