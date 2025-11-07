import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src/index';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord } from '../../src/core/models/types';

class MockProvider implements BillingProvider {
  async createCustomer(_data: Customer): Promise<string> {
    return 'prov_cust_1';
  }
  async createSubscription(sub: Subscription): Promise<Subscription> {
    return { ...sub, externalId: 'prov_sub_1', status: 'active' } as any;
  }
  async cancelSubscription(_id: string): Promise<void> {
    return;
  }
  async recordUsage(_record: UsageRecord): Promise<void> {
    return;
  }
  async generateInvoice(inv: Invoice): Promise<Invoice> {
    return { ...inv, externalId: 'prov_inv_1' };
  }
  async handleWebhook(event: any): Promise<any> {
    return { id: 'evt', type: 'payment.succeeded', provider: 'mock', createdAt: new Date(), payload: event } as any;
  }
}

describe('BillingCore', () => {
  it('registers and uses provider', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('mock', new MockProvider());
    core.setProvider('mock');
    const custId = await core.createCustomer({ id: 'c1', email: 'a@b.com' } as any);
    expect(custId).toBe('prov_cust_1');
  });
});