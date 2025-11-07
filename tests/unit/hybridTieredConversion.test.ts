import { describe, it, expect } from 'vitest';
import { HybridPricingService } from '../../src/services/pricing/HybridPricingService';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';
import { Plan, UsageRecord } from '../../src/core/models/types';

describe('HybridPricingService tiered usage with conversion', () => {
  it('converts tiered usage amount when usage currency differs from target', async () => {
    const plan: Plan = {
      id: 'hy_fx_tier', productId: 'prod', name: 'Tiered FX', currency: 'USD',
      pricing: [
        { id: 'base_usd', type: 'flat', currency: 'USD', unitAmount: 2000, billingInterval: 'month' },
        { id: 'usage_btc', type: 'usage', currency: 'BTC', unitAmount: 0, metric: 'ops', tiers: [ { upTo: 100, unitAmount: 1000 }, { upTo: 200, unitAmount: 500 } ] },
      ],
      strategy: 'hybrid', basePriceId: 'base_usd',
    };
    const conv = new CurrencyConversionService();
    conv.setRate('BTC', 'USD', 50_000);
    const svc = new HybridPricingService(conv);
    const usage: UsageRecord[] = [ { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'ops', quantity: 250, timestamp: new Date() } ];
    const out = await svc.computeChargeWithConversion({ plan, usage, periodStart: new Date(), periodEnd: new Date(), targetCurrency: 'USD' });
    // tier calc in satoshi: first 100*1000 = 100000; next 100*500 = 50000; remaining 50 at last tier = 25000; total 175000 satoshi = 0.00175 BTC
    // converted to USD: 0.00175 * 50,000 = $87.5 => 8750 cents
    expect(out.items[1].amount).toBe(8750);
    expect(out.total.amount).toBe(2000 + 8750);
    expect(out.total.currency).toBe('USD');
  });
});