import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Plan } from '../../src/core/models/types';

const noopProvider: BillingProvider = {
  async createCustomer() { return 'cust_ext'; },
  async createSubscription(sub) { return { ...sub, externalId: 'sub_ext' }; },
  async cancelSubscription() { /* noop */ },
  async recordUsage() { /* noop */ },
  async generateInvoice(inv) { return { ...inv, externalId: 'inv_ext', status: 'open' as const }; },
  async handleWebhook(event) {
    return { id: String(event.id ?? 'evt'), type: 'invoice.generated', provider: 'mock', createdAt: new Date(), payload: event };
  },
};

describe('Mixed strategies via BillingCore', () => {
  const storage = new InMemoryStorage();
  const core = new BillingCore({ storage });
  core.use('mock', noopProvider);
  core.setProvider('mock');

  const plans: Record<string, Plan> = {
    flat: {
      id: 'p_flat', productId: 'prod', name: 'Flat', currency: 'USD', strategy: 'flat',
      pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 5000, billingInterval: 'month' }],
    },
    usage: {
      id: 'p_usage', productId: 'prod', name: 'Usage', currency: 'USD', strategy: 'usage',
      pricing: [{ id: 'usage', type: 'usage', currency: 'USD', unitAmount: 20, metric: 'units' }],
    },
    hybrid: {
      id: 'p_hybrid', productId: 'prod', name: 'Hybrid', currency: 'USD', strategy: 'hybrid',
      pricing: [
        { id: 'flat', type: 'flat', currency: 'USD', unitAmount: 3000, billingInterval: 'month' },
        { id: 'usage', type: 'usage', currency: 'USD', unitAmount: 10, metric: 'events' },
      ],
    },
    seat: {
      id: 'p_seat', productId: 'prod', name: 'Seat', currency: 'USD', strategy: 'seat',
      pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 1500, billingInterval: 'month' }],
    },
    prepaid: {
      id: 'p_prepaid', productId: 'prod', name: 'Prepaid', currency: 'USD', strategy: 'prepaid',
      pricing: [{ id: 'topup', type: 'flat', currency: 'USD', unitAmount: 2000 }],
    },
  };

  it('generates invoices for flat, usage, hybrid, seat, prepaid', async () => {
    const invFlat = await core.generateInvoiceFromStrategy('c', plans.flat, { periodStart: new Date(), periodEnd: new Date() });
    expect(invFlat.total).toBe(5000);

    const invUsage = await core.generateInvoiceFromStrategy('c', plans.usage, {
      periodStart: new Date(), periodEnd: new Date(), usage: [
        { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'units', quantity: 3, timestamp: new Date() },
      ],
    });
    expect(invUsage.total).toBe(60);

    const invHybrid = await core.generateInvoiceFromStrategy('c', plans.hybrid, {
      periodStart: new Date(), periodEnd: new Date(), usage: [
        { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'events', quantity: 5, timestamp: new Date() },
      ],
    });
    expect(invHybrid.total).toBe(3000 + 50);

    const invSeat = await core.generateInvoiceFromStrategy('c', plans.seat, {
      periodStart: new Date(), periodEnd: new Date(), seats: 4,
    });
    expect(invSeat.total).toBe(1500 * 4);

    const invPrepaid = await core.generateInvoiceFromStrategy('c', plans.prepaid, { periodStart: new Date(), periodEnd: new Date() });
    expect(invPrepaid.total).toBe(2000);
  });
});