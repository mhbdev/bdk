import { BillingCore } from '../src';
import { InMemoryStorage } from '../src/storage/inMemory';
import { BillingProvider } from '../src/core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord } from '../src/core/models/types';

// Example custom provider adapter. Replace stubbed methods with actual SDK calls.
class MyGatewayAdapter implements BillingProvider {
  constructor(private config: { apiKey: string }) {}

  async createCustomer(data: Customer): Promise<string> {
    // Map neutral Customer → provider payload; return provider customer id
    // e.g., await sdk.customers.create({ email: data.email, name: data.name })
    return `mygw_c_${data.id}`;
  }

  async createSubscription(sub: Subscription, _plan: any): Promise<Subscription> {
    // e.g., await sdk.subscriptions.create({ customer: sub.customerId, price: plan.metadata.providerPriceId })
    return { ...sub, externalId: `mygw_s_${sub.id}`, status: 'active' } as any;
  }

  async cancelSubscription(id: string): Promise<void> {
    // e.g., await sdk.subscriptions.cancel(id)
    return;
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    // e.g., await sdk.usage.create({ subscriptionItem: record.metadata.itemId, quantity: record.quantity })
    return;
  }

  async generateInvoice(inv: Invoice): Promise<Invoice> {
    // e.g., await sdk.invoices.create({ customer: inv.customerId, lines: inv.items })
    return { ...inv, externalId: `mygw_inv_${inv.id}` };
  }

  async handleWebhook(event: any): Promise<any> {
    // Normalize provider webhook to BillingEvent via WebhookService if needed
    return event;
  }
}

async function main() {
  const storage = new InMemoryStorage();
  const billing = new BillingCore({ storage });
  billing.use('mygw', new MyGatewayAdapter({ apiKey: process.env.MYGW_API_KEY || 'test_key' }));
  billing.setProvider('mygw');

  const customerId = await billing.createCustomer({ id: 'c_mygw', email: 'user@example.com' } as any);

  const plan = {
    id: 'plan_basic', productId: 'prod_mygw', name: 'Basic', currency: 'USD',
    pricing: [{ id: 'price_flat', type: 'flat', currency: 'USD', unitAmount: 1500, billingInterval: 'month', metadata: { providerPriceId: 'p_123' } }],
    strategy: 'flat',
    metadata: { providerPriceIds: ['p_123'] },
  } as any;

  const sub = await billing.createSubscription({ id: 'sub_mygw', customerId, planId: plan.id, status: 'active', startDate: new Date() } as any, plan);
  console.log('Subscription external id:', sub.externalId);

  const invoice = await billing.generateInvoiceFromStrategy(customerId, plan, { periodStart: new Date(), periodEnd: new Date() });
  const finalized = await billing.finalizeInvoiceWithProvider(invoice);
  console.log('Finalized invoice external id:', finalized.externalId);
}

main().catch((e) => console.error(e));