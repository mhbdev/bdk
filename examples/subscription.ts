import { BillingCore, Plan } from '../src';
import { subscription as sdkSubscription } from '../src/sdk';
import { InMemoryStorage } from '../src/storage/inMemory';
import { StripeAdapter } from '../src/providers/stripe/StripeAdapter';

async function main() {
  const storage = new InMemoryStorage();
  const billing = new BillingCore({ storage });
  billing.use('stripe', new StripeAdapter({ apiKey: process.env.STRIPE_API_KEY || 'sk_test_...' }));
  billing.setProvider('stripe');

  const customerId = await billing.createCustomer({ id: 'cust_1', email: 'user@example.com' });

  const plan: Plan = {
    id: 'plan_basic',
    productId: 'prod_1',
    name: 'Basic',
    currency: 'USD',
    pricing: [{ id: 'price_flat', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month', metadata: { stripePriceId: 'price_123' } }],
    strategy: 'flat',
    metadata: { stripePriceIds: ['price_123'] },
  };

  await billing.savePlan(plan);
  const { subscription } = await sdkSubscription.start(billing, {
    customerId,
    planId: plan.id,
    periodStart: new Date(),
    periodEnd: new Date(),
  });
  console.log('Created subscription', subscription.externalId);
}

main().catch((e) => console.error(e));