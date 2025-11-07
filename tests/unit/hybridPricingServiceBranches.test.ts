import { describe, it, expect } from 'vitest';
import { HybridPricingService } from '../../src/services/pricing/HybridPricingService';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';
import { Plan } from '../../src/core/models/types';

class NoopConverter extends CurrencyConversionService {
  async convert(amount: number): Promise<number> { return amount; }
}

describe('HybridPricingService branches', () => {
  it('omits metric in usage description when metric undefined', async () => {
    const svc = new HybridPricingService(new NoopConverter());
    const plan: Plan = {
      id: 'p', productId: 'prod', name: 'Pro', currency: 'USD',
      pricing: [
        { id: 'base', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' },
        { id: 'usage', type: 'usage', currency: 'USD', unitAmount: 100 },
      ],
      strategy: 'hybrid', basePriceId: 'base',
    };
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'units', quantity: 2, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date() });
    expect(res.items[1].description).toBe('Pro usage');
  });

  it('uses 0 when unitAmount is undefined and no tiers', async () => {
    const svc = new HybridPricingService(new NoopConverter());
    const plan: Plan = {
      id: 'p2', productId: 'prod', name: 'ZeroUnit', currency: 'USD',
      pricing: [
        { id: 'base', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' },
        // unitAmount intentionally omitted
        { id: 'usage', type: 'usage', currency: 'USD' },
      ],
      strategy: 'hybrid', basePriceId: 'base',
    } as any;
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'units', quantity: 5, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date() });
    expect(res.items[1].amount).toBe(0);
    expect(res.items[1].quantity).toBe(5);
  });

  it('treats undefined usage quantity as zero in aggregation', async () => {
    const svc = new HybridPricingService(new NoopConverter());
    const plan: Plan = {
      id: 'p3', productId: 'prod', name: 'UndefinedQty', currency: 'USD',
      pricing: [
        { id: 'base', type: 'flat', currency: 'USD', unitAmount: 500, billingInterval: 'month' },
        { id: 'usage', type: 'usage', currency: 'USD', unitAmount: 100 },
      ],
      strategy: 'hybrid', basePriceId: 'base',
    };
    const res = await svc.computeChargeWithConversion({ plan, usage: [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'units', quantity: undefined as any, timestamp: new Date() } ], periodStart: new Date(), periodEnd: new Date() });
    expect(res.items[1].quantity).toBe(0);
    expect(res.items[1].amount).toBe(0);
    expect(res.total.amount).toBe(500);
  });
});