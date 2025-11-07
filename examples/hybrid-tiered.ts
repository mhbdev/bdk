import { BillingCore, InMemoryStorage } from '../src';
import { Plan, UsageRecord } from '../src/core/models/types';

async function main() {
  const storage = new InMemoryStorage();
  const core = new BillingCore({ storage });

  const plan: Plan = {
    id: 'hybrid_tiered', productId: 'prod_api', name: 'API Tiered Hybrid', currency: 'USD',
    pricing: [
      { id: 'price_base', type: 'flat', currency: 'USD', unitAmount: 10000, billingInterval: 'month' },
      { id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 0, metric: 'requests', tiers: [
        { upTo: 100, unitAmount: 100 },
        { upTo: 900, unitAmount: 75 },
      ] },
    ],
    strategy: 'hybrid',
  };

  const usage: UsageRecord[] = [
    { id: 'u1', customerId: 'cust_2', subscriptionId: 'sub_2', metric: 'requests', quantity: 1200, timestamp: new Date() },
  ];

  const invoice = await core.generateInvoiceFromStrategy('cust_2', plan, {
    periodStart: new Date('2024-06-01'),
    periodEnd: new Date('2024-06-30'),
    usage,
  });
  // usage tier calc: 100*100 + 900*75 + 200*75(last tier) = 92500; total = 102500
  console.log('Hybrid Tiered Invoice:', invoice);
}

main().catch((e) => console.error(e));