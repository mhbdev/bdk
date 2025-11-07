import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord } from '../../src/core/models/types';

class ProviderSpy implements BillingProvider {
  public usageCalls: UsageRecord[] = [];
  async createCustomer(_data: Customer): Promise<string> { return 'prov_cust'; }
  async createSubscription(sub: Subscription): Promise<Subscription> { return { ...sub, externalId: 'prov_sub', status: 'active' } as any; }
  async cancelSubscription(_id: string): Promise<void> { return; }
  async recordUsage(record: UsageRecord): Promise<void> { this.usageCalls.push(record); }
  async generateInvoice(inv: Invoice): Promise<Invoice> { return inv; }
  async handleWebhook(event: any): Promise<any> { return event; }
}

describe('Usage ingestion', () => {
  it('calls provider, saves to storage, and emits event', async () => {
    const storage = new InMemoryStorage();
    const provider = new ProviderSpy();
    const core = new BillingCore({ storage });
    core.use('spy', provider);
    core.setProvider('spy');

    let emitted = false;
    core.on((evt) => { if (evt.type === 'usage.recorded') emitted = true; });

    const record: UsageRecord = { id: 'u', customerId: 'c', subscriptionId: 's', metric: 'api_calls', quantity: 42, timestamp: new Date() };
    await core.recordUsage(record);

    expect(provider.usageCalls.length).toBe(1);
    const saved = await storage.listUsage('c', 'api_calls');
    expect(saved[0].quantity).toBe(42);
    expect(emitted).toBe(true);
  });
});