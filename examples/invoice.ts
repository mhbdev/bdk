import { BillingCore } from '../src';
import { InMemoryStorage } from '../src/storage/inMemory';

async function main() {
  const storage = new InMemoryStorage();
  const billing = new BillingCore({ storage });
  const invoice = await billing.generateInvoiceFromStrategy('c1', {
    id: 'plan_hybrid',
    productId: 'prod_3',
    name: 'Hybrid Plan',
    currency: 'USD',
    pricing: [
      { id: 'price_flat', type: 'flat', currency: 'USD', unitAmount: 1500, billingInterval: 'month' },
      { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 3, metric: 'events' },
    ],
    strategy: 'hybrid',
  } as any, {
    periodStart: new Date(),
    periodEnd: new Date(),
    usage: [
      { id: 'u1', customerId: 'c1', subscriptionId: 's1', metric: 'events', quantity: 50, timestamp: new Date() },
    ],
  });

  const pdf = await billing.generateInvoicePdf(invoice);
  console.log('Generated invoice PDF bytes:', pdf.length);
}

main().catch((e) => console.error(e));