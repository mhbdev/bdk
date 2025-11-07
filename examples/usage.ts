import { BillingCore, Plan } from '../src';
import { InMemoryStorage } from '../src/storage/inMemory';

async function main() {
  const storage = new InMemoryStorage();
  const billing = new BillingCore({ storage });

  const plan: Plan = {
    id: 'plan_usage',
    productId: 'prod_2',
    name: 'API Plan',
    currency: 'USD',
    pricing: [{ id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 2, metric: 'api_calls' }],
    strategy: 'usage',
  };

  const usage = [
    { id: 'u1', customerId: 'c1', subscriptionId: 's1', metric: 'api_calls', quantity: 120, timestamp: new Date() },
  ];
  const invoice = await billing.generateInvoiceFromStrategy('c1', plan, {
    periodStart: new Date(),
    periodEnd: new Date(),
    usage,
  });
  console.log('Generated invoice total:', invoice.total);
}

main().catch((e) => console.error(e));