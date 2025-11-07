import { describe, it, expect } from 'vitest';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';
import { BillingProvider } from '../../src/core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord } from '../../src/core/models/types';

class UpgradeProvider implements BillingProvider {
  async createCustomer(_data: Customer): Promise<string> { return 'c_ext'; }
  async createSubscription(sub: Subscription): Promise<Subscription> { return { ...sub, externalId: `${sub.id}_ext`, status: 'active' } as any; }
  async cancelSubscription(_id: string): Promise<void> { return; }
  async recordUsage(_record: UsageRecord): Promise<void> { return; }
  async generateInvoice(inv: Invoice): Promise<Invoice> { return inv; }
  async handleWebhook(event: any): Promise<any> { return event; }
}

describe('Subscription upgrade/downgrade via cancel+create', () => {
  it('handles switching plans by canceling old and creating new', async () => {
    const storage = new InMemoryStorage();
    const core = new BillingCore({ storage });
    core.use('prov', new UpgradeProvider());
    core.setProvider('prov');

    const basic = { id: 'plan_basic', productId: 'prod', name: 'Basic', currency: 'USD', pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month' }], strategy: 'flat' } as any;
    const pro = { id: 'plan_pro', productId: 'prod', name: 'Pro', currency: 'USD', pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 3000, billingInterval: 'month' }], strategy: 'flat' } as any;

    const subBasic = await core.createSubscription({ id: 'sub_1', customerId: 'c1', planId: basic.id, status: 'active', startDate: new Date() } as any, basic);
    await core.cancelSubscription(subBasic.externalId!);

    const subPro = await core.createSubscription({ id: 'sub_2', customerId: 'c1', planId: pro.id, status: 'active', startDate: new Date() } as any, pro);
    expect(subPro.planId).toBe('plan_pro');
    expect(await storage.getSubscription('sub_2')).toMatchObject({ planId: 'plan_pro' });
  });

  it('computes proration differential for mid-cycle upgrade example', () => {
    const cycleDays = 30;
    const elapsedDays = 10;
    const remainingFraction = (cycleDays - elapsedDays) / cycleDays;
    const oldMonthly = 10000; // $100.00
    const newMonthly = 30000; // $300.00
    const credit = Math.round(oldMonthly * remainingFraction);
    const debit = Math.round(newMonthly * remainingFraction);
    const differential = debit - credit;
    expect(credit).toBe(6667);
    expect(debit).toBe(20000);
    expect(differential).toBe(13333);
  });

  it('computes proration differential for mid-cycle downgrade example', () => {
    const cycleDays = 30;
    const elapsedDays = 15;
    const remainingFraction = (cycleDays - elapsedDays) / cycleDays;
    const oldMonthly = 30000; // $300.00
    const newMonthly = 10000; // $100.00
    const credit = Math.round(oldMonthly * remainingFraction);
    const debit = Math.round(newMonthly * remainingFraction);
    const differential = debit - credit;
    expect(credit).toBe(15000);
    expect(debit).toBe(5000);
    expect(differential).toBe(-10000);
  });
});