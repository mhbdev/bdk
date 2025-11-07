import { describe, it, expect } from 'vitest';
import { HybridPricingService } from '../../src/services/pricing/HybridPricingService';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';
import { Plan, UsageRecord } from '../../src/core/models/types';

describe('HybridPricingService conversion when usage clamped to zero', () => {
  it('still executes conversion branch with zero usage', async () => {
    const plan: Plan = {
      id: 'hy_zero_fx', productId: 'prod', name: 'ZeroFX', currency: 'USD',
      pricing: [
        { id: 'base', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' },
        { id: 'usage_btc', type: 'usage', currency: 'BTC', unitAmount: 1000, metric: 'ops' },
      ],
      strategy: 'hybrid', basePriceId: 'base',
    };
    const conv = new CurrencyConversionService();
    conv.setRate('BTC', 'USD', 50_000);
    const svc = new HybridPricingService(conv);
    const usage: UsageRecord[] = [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'ops', quantity: -5, timestamp: new Date() } ];
    const out = await svc.computeChargeWithConversion({ plan, usage, periodStart: new Date(), periodEnd: new Date(), targetCurrency: 'USD' });
    // usage amount source clamped to 0, conversion should yield 0
    expect(out.items[1].amount).toBe(0);
    expect(out.total.amount).toBe(1000);
  });
});