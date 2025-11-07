import { StripeAdapter } from '../src/providers/stripe/StripeAdapter';

async function main() {
  const adapter = new StripeAdapter({ apiKey: process.env.STRIPE_API_KEY || 'sk_test_...', webhookSecret: 'whsec_...' });
  const normalized = await adapter.handleWebhook({ /* raw payload */ }, { 'stripe-signature': 't=...,v1=...' } as any);
  console.log('Normalized event', normalized.type);
}

main().catch((e) => console.error(e));