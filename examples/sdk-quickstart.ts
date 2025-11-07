import { createBilling, BillingBuilder, plans, invoice } from '../src/sdk/index';

async function main() {
  // Option A: One-call init with Stripe
  const billingA = createBilling({ stripe: { apiKey: process.env.STRIPE_API_KEY || 'sk_test_...' } });

  const usagePlanA = plans.usagePlan({
    id: 'plan_usage',
    productId: 'prod_2',
    name: 'API Plan',
    currency: 'USD',
    unitAmount: 2, // cents per call
    metric: 'api_calls',
  });

  const invA = await invoice.generateUsage(billingA, {
    customerId: 'c1',
    plan: usagePlanA,
    quantity: 120,
    periodStart: new Date(),
    periodEnd: new Date(),
  });
  console.log('Invoice via createBilling:', invA);

  // Option B: Fluent builder with explicit default provider
  const billingB = BillingBuilder.inMemory().withStripe({ apiKey: 'sk_test_...' }).build();

  const hybridPlanB = plans.hybridPlan({
    id: 'plan_hybrid',
    productId: 'prod_3',
    name: 'Pro + Usage',
    currency: 'USD',
    baseUnitAmount: 2000, // $20 base
    usageUnitAmount: 5, // $0.05 per unit
    metric: 'events',
    billingInterval: 'month',
  });

  const invB = await invoice.generateHybrid(billingB, {
    customerId: 'c2',
    plan: hybridPlanB,
    quantity: 500,
    periodStart: new Date(),
    periodEnd: new Date(),
  });
  console.log('Invoice via builder:', invB);
}

main().catch((e) => console.error(e));