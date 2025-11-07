import { BillingCore, InMemoryStorage } from '../src';
import { Plan, UsageRecord } from '../src/core/models/types';

async function main() {
  const storage = new InMemoryStorage();
  const core = new BillingCore({ storage });

  const plan: Plan = {
    id: 'hybrid_edge', productId: 'prod_api', name: 'Hybrid Edge', currency: 'USD',
    pricing: [
      { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 7500, billingInterval: 'month' },
      { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 150, metric: 'ops' },
    ],
    strategy: 'hybrid',
  };

  const usage: UsageRecord[] = [
    { id: 'u1', customerId: 'cust_3', subscriptionId: 'sub_3', metric: 'ops', quantity: -10, timestamp: new Date() },
    { id: 'u2', customerId: 'cust_3', subscriptionId: 'sub_3', metric: 'ops', quantity: 0, timestamp: new Date() },
    { id: 'u3', customerId: 'cust_3', subscriptionId: 'sub_3', metric: 'ops', quantity: 5, timestamp: new Date() },
  ];

  const invoice = await core.generateInvoiceFromStrategy('cust_3', plan, {
    periodStart: new Date('2024-07-01'),
    periodEnd: new Date('2024-07-31'),
    usage,
  });
  // negative usage clamped to 0; effective quantity 0 + 0 + 5 = 5; usage = 750; total = 8250
  console.log('Hybrid Edge Invoice:', invoice);
}

main().catch((e) => console.error(e));