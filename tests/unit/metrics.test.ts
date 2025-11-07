import { describe, it, expect } from 'vitest';
import { UsageBasedStrategy } from '../../src/core/strategies/usageBased';

describe('Metrics & tiered usage', () => {
  it('computes tiered charges based on quantity thresholds', async () => {
    const strat = new UsageBasedStrategy();
    const plan = {
      id: 'tier_plan',
      productId: 'prod',
      name: 'Tiered API',
      currency: 'USD',
      pricing: [
        {
          id: 'price_tier',
          type: 'usage',
          currency: 'USD',
          unitAmount: 0, // ignored when tiers present
          metric: 'api_calls',
          tiers: [
            { upTo: 100, unitAmount: 10 },
            { upTo: 400, unitAmount: 8 },
            { upTo: 1000, unitAmount: 5 },
          ],
        },
      ],
      strategy: 'usage',
    } as any;

    // Quantity 550 -> 100*10 + 400*8 + 50*5 = 1000 + 3200 + 250 = 4450
    const out = await strat.computeCharge({
      plan,
      usage: [
        { id: 'u1', customerId: 'c', subscriptionId: 's', metric: 'api_calls', quantity: 300, timestamp: new Date() },
        { id: 'u2', customerId: 'c', subscriptionId: 's', metric: 'api_calls', quantity: 250, timestamp: new Date() },
      ],
      periodStart: new Date(),
      periodEnd: new Date(),
    });
    expect(out.total.amount).toBe(4450);
  });
});