import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord } from '../../src/core/models/types';

class ProviderStub implements BillingProvider {
  async createCustomer(_data: Customer): Promise<string> { return 'c_ext'; }
  async createSubscription(sub: Subscription): Promise<Subscription> { return { ...sub, externalId: 's_ext', status: 'active' } as any; }
  async cancelSubscription(_id: string): Promise<void> { return; }
  async recordUsage(_record: UsageRecord): Promise<void> { return; }
  async generateInvoice(inv: Invoice): Promise<Invoice> { return { ...inv, externalId: 'inv_ext' }; }
  async handleWebhook(event: any): Promise<any> { return event; }
}

describe('End-to-end proration', () => {
  it('generates proration invoice for upgrade mid-cycle', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('stub', new ProviderStub());
    core.setProvider('stub');

    const customerId = await core.createCustomer({ id: 'c_u', email: 'u@example.com' } as any);
    const sub = await core.createSubscription({ id: 's_u', customerId, planId: 'basic', status: 'active', startDate: new Date('2024-01-01') } as any, {
      id: 'basic', productId: 'p', name: 'Basic', currency: 'USD', pricing: [{ id: 'price', type: 'flat', currency: 'USD', unitAmount: 10000, billingInterval: 'month' }], strategy: 'flat',
    } as any);

    const invoice = await core.generateProrationInvoice({
      oldAmount: 10000,
      newAmount: 30000,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      changeDate: new Date('2024-01-11'), // 10 days elapsed, 20 remaining out of 30
      currency: 'USD',
      customerId,
      subscriptionId: sub.id,
    });

    expect(invoice.total).toBe(13333);
    expect(invoice.items[0].amount).toBe(-6667); // credit
    expect(invoice.items[1].amount).toBe(20000); // debit
  });

  it('generates proration invoice for downgrade mid-cycle', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('stub', new ProviderStub());
    core.setProvider('stub');

    const customerId = await core.createCustomer({ id: 'c_d', email: 'd@example.com' } as any);
    const sub = await core.createSubscription({ id: 's_d', customerId, planId: 'pro', status: 'active', startDate: new Date('2024-01-01') } as any, {
      id: 'pro', productId: 'p', name: 'Pro', currency: 'USD', pricing: [{ id: 'price', type: 'flat', currency: 'USD', unitAmount: 30000, billingInterval: 'month' }], strategy: 'flat',
    } as any);

    const invoice = await core.generateProrationInvoice({
      oldAmount: 30000,
      newAmount: 10000,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      changeDate: new Date('2024-01-16'), // 15 days elapsed, 15 remaining out of ~30
      currency: 'USD',
      customerId,
      subscriptionId: sub.id,
    });

    expect(invoice.total).toBe(-10000);
    expect(invoice.items[0].amount).toBe(-15000); // credit
    expect(invoice.items[1].amount).toBe(5000); // debit
  });
});