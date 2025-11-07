import { BillingCore, InMemoryStorage } from '../src';
import { Plan, UsageRecord } from '../src/core/models/types';

async function main() {
  const storage = new InMemoryStorage();
  const core = new BillingCore({ storage });

  const plan: Plan = {
    id: 'hybrid_basic', productId: 'prod_api', name: 'API Hybrid', currency: 'USD',
    pricing: [
      { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 5000, billingInterval: 'month' },
      { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 100, metric: 'requests' },
    ],
    strategy: 'hybrid',
  };

  const usage: UsageRecord[] = [
    { id: 'u1', customerId: 'cust_1', subscriptionId: 'sub_1', metric: 'requests', quantity: 25, timestamp: new Date() },
    { id: 'u2', customerId: 'cust_1', subscriptionId: 'sub_1', metric: 'requests', quantity: 10, timestamp: new Date() },
  ];

  const invoice = await core.generateInvoiceFromStrategy('cust_1', plan, {
    periodStart: new Date('2024-05-01'),
    periodEnd: new Date('2024-05-31'),
    usage,
  });
  // base 5000 + usage 35 * 100 = 3500 => total 8500
  console.log('Hybrid Basic Invoice:', invoice);
}

main().catch((e) => console.error(e));