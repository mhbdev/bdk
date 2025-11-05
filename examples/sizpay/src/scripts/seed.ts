import { db } from '../db/client';
import { subscriptionPlans, paymentMethods } from '../db/schema';
import { sizpayConfig } from '../config';

function uuid() { return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex'); }

async function run() {
  const now = new Date();
  const planId = 'plan_basic';
  await db.insert(subscriptionPlans).values({ id: planId, name: 'Basic', description: 'Basic plan', amount: '10000', currency: 'IRT', interval: 'monthly', intervalCount: 1, trialPeriodDays: 0, features: { usagePricing: { api_calls: { unitPrice: 10 } } }, metadata: null, active: true, createdAt: now, updatedAt: now }).execute();
  const pmId = `pm_default_customer_1`;
  await db.insert(paymentMethods).values({ id: pmId, customerId: 'customer_1', type: 'gateway', providerId: 'sizpay', providerMethodId: 'sizpay_redirect', isDefault: true, lastFour: null, expiryMonth: null, expiryYear: null, metadata: null, createdAt: now, updatedAt: now }).execute();
  console.log('Seeded plan and default payment method');
}

run();