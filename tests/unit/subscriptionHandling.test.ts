import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord } from '../../src/core/models/types';

class SubProvider implements BillingProvider {
  async createCustomer(_data: Customer): Promise<string> { return 'c_ext'; }
  async createSubscription(sub: Subscription): Promise<Subscription> { return { ...sub, externalId: 's_ext', status: 'active' } as any; }
  async cancelSubscription(_id: string): Promise<void> { return; }
  async recordUsage(_record: UsageRecord): Promise<void> { return; }
  async generateInvoice(inv: Invoice): Promise<Invoice> { return inv; }
  async handleWebhook(event: any): Promise<any> { return event; }
}

describe('Subscription handling', () => {
  it('creates and cancels subscriptions, persisting and emitting events', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('sub', new SubProvider());
    core.setProvider('sub');

    let created = false;
    let canceled = false;
    core.on((evt) => { if (evt.type === 'subscription.created') created = true; if (evt.type === 'subscription.canceled') canceled = true; });

    const plan = { id: 'p', productId: 'prod', name: 'Basic', currency: 'USD', pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' }], strategy: 'flat' } as any;
    const sub = await core.createSubscription({ id: 's', customerId: 'c', planId: 'p', status: 'active', startDate: new Date() } as any, plan);
    expect(sub.externalId).toBe('s_ext');
    expect(created).toBe(true);
    expect(await storage.getSubscription('s')).toBeTruthy();

    await core.cancelSubscription(sub.externalId!);
    expect(canceled).toBe(true);
  });
});