import { describe, it, expect } from 'vitest';
import { SeatStrategy } from '../../src/core/strategies/seat';
import { Plan } from '../../src/core/models/types';

describe('SeatStrategy', () => {
  const planSeat: Plan = {
    id: 'p_seat',
    productId: 'prod',
    name: 'Team',
    currency: 'USD',
    pricing: [{ id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 1500, billingInterval: 'month' }],
    strategy: 'seat',
  };

  it('multiplies base by seats count', async () => {
    const strat = new SeatStrategy();
    const out = await strat.computeCharge({ plan: planSeat, periodStart: new Date(), periodEnd: new Date(), seats: 7 });
    expect(out.total.amount).toBe(1500 * 7);
    expect(out.items[0].quantity).toBe(7);
  });

  it('clamps seats to minimum 1', async () => {
    const strat = new SeatStrategy();
    const out = await strat.computeCharge({ plan: planSeat, periodStart: new Date(), periodEnd: new Date(), seats: 0 });
    expect(out.total.amount).toBe(1500 * 1);
    expect(out.items[0].quantity).toBe(1);
  });

  it('throws when no base price present', async () => {
    const strat = new SeatStrategy();
    const invalidPlan: Plan = { ...planSeat, pricing: [], strategy: 'seat' };
    await expect(strat.computeCharge({ plan: invalidPlan, periodStart: new Date(), periodEnd: new Date(), seats: 3 }))
      .rejects.toThrow(/must include a flat\/base price/);
  });
});