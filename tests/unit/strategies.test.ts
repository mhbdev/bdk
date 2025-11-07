import { describe, it, expect } from 'vitest';
import { UsageBasedStrategy } from '../../src/core/strategies/usageBased';
import { FlatRateStrategy } from '../../src/core/strategies/flatRate';
import { HybridStrategy } from '../../src/core/strategies/hybrid';

const planFlat = {
  id: 'p_flat',
  productId: 'prod',
  name: 'Pro',
  currency: 'USD',
  pricing: [{ id: 'price_flat', type: 'flat', currency: 'USD', unitAmount: 5000, billingInterval: 'month' }],
  strategy: 'flat',
};

const planUsage = {
  id: 'p_usage',
  productId: 'prod',
  name: 'API',
  currency: 'USD',
  pricing: [{ id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 10, metric: 'api_calls' }],
  strategy: 'usage',
};

const planHybrid = {
  id: 'p_hybrid',
  productId: 'prod',
  name: 'Hybrid',
  currency: 'USD',
  pricing: [
    { id: 'price_flat', type: 'flat', currency: 'USD', unitAmount: 2000, billingInterval: 'month' },
    { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 5, metric: 'events' },
  ],
  strategy: 'hybrid',
};

describe('Strategies', () => {
  it('FlatRateStrategy computes base charge', async () => {
    const strat = new FlatRateStrategy();
    const out = await strat.computeCharge({ plan: planFlat as any, periodStart: new Date(), periodEnd: new Date() });
    expect(out.total.amount).toBe(5000);
    expect(out.items).toHaveLength(1);
  });

  it('UsageBasedStrategy multiplies quantity by unit', async () => {
    const strat = new UsageBasedStrategy();
    const out = await strat.computeCharge({
      plan: planUsage as any,
      usage: [
        { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'api_calls', quantity: 100, timestamp: new Date() },
        { id: 'u2', customerId: 'c', subscriptionId: 's', metric: 'api_calls', quantity: 50, timestamp: new Date() },
      ],
      periodStart: new Date(),
      periodEnd: new Date(),
    });
    expect(out.total.amount).toBe(150 * 10);
  });

  it('HybridStrategy includes base + usage', async () => {
    const strat = new HybridStrategy();
    const out = await strat.computeCharge({
      plan: planHybrid as any,
      usage: [{ id: 'u', customerId: 'c', subscriptionId: 's', metric: 'events', quantity: 20, timestamp: new Date() }],
      periodStart: new Date(),
      periodEnd: new Date(),
    });
    expect(out.total.amount).toBe(2000 + 20 * 5);
    expect(out.items).toHaveLength(2);
  });
});