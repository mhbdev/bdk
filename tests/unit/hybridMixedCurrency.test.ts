import { describe, it, expect } from 'vitest';
import { Plan, UsageRecord } from '../../src/core/models/types';
import { CurrencyConversionService } from '../../src/services/currency/CurrencyConversionService';
import { HybridPricingService } from '../../src/services/pricing/HybridPricingService';

describe('HybridPricingService with conversion', () => {
  const planFx: Plan = {
    id: 'plan_fx', productId: 'prod_fx', name: 'Hybrid FX', currency: 'USD',
    pricing: [
      { id: 'flat_usd', type: 'flat', currency: 'USD', unitAmount: 10_000, billingInterval: 'month' },
      { id: 'usage_btc', type: 'usage', currency: 'BTC', unitAmount: 100_000, metric: 'ops' },
    ],
    strategy: 'hybrid',
  };

  it('computes base in USD and usage in BTC converted to USD', async () => {
    const conv = new CurrencyConversionService();
    conv.setRate('BTC', 'USD', 50_000);
    const pricing = new HybridPricingService(conv);
    const usage: UsageRecord[] = [
      { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'ops', quantity: 250, timestamp: new Date() },
    ];

    const out = await pricing.computeChargeWithConversion({ plan: planFx, usage, periodStart: new Date(), periodEnd: new Date(), targetCurrency: 'USD' });
    // usage: 250 * 100,000 satoshi = 25,000,000 satoshi = 0.25 BTC -> $12,500 => 1,250,000 cents
    expect(out.items[0].amount).toBe(10_000); // base $100
    expect(out.items[1].amount).toBe(1_250_000);
    expect(out.total.amount).toBe(1_260_000);
    expect(out.total.currency).toBe('USD');
  });
});