import { createBilling, plans, invoice } from '../../src/sdk/index';
import { Subscription } from '../../src/core/models/types';

async function main() {
  const billing = createBilling({ stripe: { apiKey: process.env.STRIPE_API_KEY || 'sk_test_...' } });

  const plan = plans.seatPlan({ id: 'plan_seats', productId: 'prod_seat', name: 'Team Seats', currency: 'USD', seatUnitAmount: 1200 });

  const subscription: Subscription = {
    id: 'sub_2001',
    customerId: 'cust_1001',
    planId: plan.id,
    status: 'active',
    startDate: new Date(),
  };

  const created = await billing.createSubscription(subscription as any, plan);
  console.log('Subscription created:', created);

  // Generate first invoice for 5 seats
  const inv = await billing.generateInvoiceFromStrategy(subscription.customerId, plan, {
    periodStart: new Date(),
    periodEnd: new Date(),
    seats: 5,
  });
  const finalized = await invoice.finalizeInvoice(billing, inv);
  console.log('Finalized invoice:', finalized);
}

main().catch((e) => console.error(e));