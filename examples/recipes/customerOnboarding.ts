import { createBilling } from '../../src/sdk/index';
import { Customer } from '../../src/core/models/types';

async function main() {
  const billing = createBilling({ stripe: { apiKey: process.env.STRIPE_API_KEY || 'sk_test_...' } });

  const customer: Customer = { id: 'cust_1001', email: 'user@example.com', name: 'Ada Lovelace' };
  const providerId = await billing.createCustomer(customer);
  console.log('Created customer with provider id:', providerId);
}

main().catch((e) => console.error(e));