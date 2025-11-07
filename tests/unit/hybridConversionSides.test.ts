import { describe, it, expect } from 'vitest';
import { HybridPricingService } from '../../src/services/pricing/HybridPricingService';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';
import { Plan, UsageRecord } from '../../src/core/models/types';

describe('HybridPricingService mixed conversion sides', () => {
  it('converts base but not usage when target equals usage currency', async () => {
    const plan: Plan = {
      id: 'plan_mixed', productId: 'prod', name: 'Mixed', currency: 'USD',
      pricing: [
        { id: 'flat_usd', type: 'flat', currency: 'USD', unitAmount: 5000, billingInterval: 'month' },
        { id: 'usage_eur', type: 'usage', currency: 'EUR', unitAmount: 100, metric: 'ops' },
      ],
      strategy: 'hybrid', basePriceId: 'flat_usd',
    };
    const conv = new CurrencyConversionService();
    conv.setRate('USD', 'EUR', 0.9);
    const svc = new HybridPricingService(conv);
    const usage: UsageRecord[] = [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'ops', quantity: 10, timestamp: new Date() } ];
    const out = await svc.computeChargeWithConversion({ plan, usage, periodStart: new Date(), periodEnd: new Date(), targetCurrency: 'EUR' });
    // base converted 5000 * 0.9 = 4500 (EUR cents), usage stays 10 * 100 = 1000 EUR cents
    expect(out.items[0].amount).toBe(4500);
    expect(out.items[1].amount).toBe(1000);
    expect(out.total.amount).toBe(5500);
    expect(out.total.currency).toBe('EUR');
  });
});