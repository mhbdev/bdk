import Stripe from 'stripe';
import { Money, PaymentMethod as BdkPaymentMethod } from '@mhbdev/bdk/core';
import { StripePaymentProvider } from './provider/stripe-provider';
import { InMemoryPaymentProviderRegistry } from './registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from './strategies/default-strategy';
import { ExamplePaymentService } from './services/example-payment-service';

async function main() {
  const apiKey = process.env.STRIPE_API_KEY;
  if (!apiKey) {
    throw new Error('Please set STRIPE_API_KEY env var (test key like sk_test_...)');
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2022-11-15'
  });
  const provider = new StripePaymentProvider({ apiKey });

  const registry = new InMemoryPaymentProviderRegistry();
  registry.register(provider);
  registry.setDefaultProvider(provider.providerId);

  const strategy = new DefaultProviderSelectionStrategy(registry);
  const paymentService = new ExamplePaymentService(registry, strategy);

  const customer = await stripe.customers.create({
    email: `test-${Date.now()}@example.com`,
    description: 'BDK Stripe example customer',
  });

  const pmResult = await provider.createPaymentMethod(customer.id, {
    card: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: new Date().getFullYear() + 1,
      cvc: '314',
    },
  });

  const bdkPaymentMethod: BdkPaymentMethod = {
    id: pmResult.providerMethodId,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerId: customer.id,
    type: pmResult.type,
    providerId: provider.providerId,
    providerMethodId: pmResult.providerMethodId,
    isDefault: true,
    lastFour: pmResult.lastFour,
    expiryMonth: pmResult.expiryMonth,
    expiryYear: pmResult.expiryYear,
  };

  paymentService.addPaymentMethod(bdkPaymentMethod);

  const amount: Money = { amount: 9.99, currency: 'USD' };
  const payment = await paymentService.process(customer.id, amount, bdkPaymentMethod.id, {
    description: 'BDK Stripe example charge',
    captureMethod: 'automatic',
    metadata: { example: 'bdk-stripe' },
  });

  console.log('Payment processed:', {
    id: payment.id,
    providerTransactionId: payment.providerTransactionId,
    status: payment.status,
    amount: payment.amount,
  });

  const refund = await paymentService.refund(payment.id, { amount: 4.99, currency: 'USD' });
  console.log('Refund processed:', {
    id: refund.id,
    status: refund.status,
    amount: refund.amount,
  });

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});