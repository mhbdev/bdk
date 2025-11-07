import { BillingCore } from '../src';
import { InMemoryStorage } from '../src/storage/inMemory';

async function main() {
  const storage = new InMemoryStorage();
  const billing = new BillingCore({ storage });

  // Example: upgrading mid-cycle from $100 to $300 monthly
  const customerId = 'cust_proration';
  const subscriptionId = 'sub_proration';
  const invoice = await billing.generateProrationInvoice({
    oldAmount: 10000,
    newAmount: 30000,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    changeDate: new Date('2024-01-11'),
    currency: 'USD',
    customerId,
    subscriptionId,
  });
  console.log('Proration invoice total (minor units):', invoice.total);
  console.log('Items:', invoice.items);
}

main().catch((e) => console.error(e));