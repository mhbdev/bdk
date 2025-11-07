# @mhbdev/bdk

Provider-agnostic billing and payment abstraction for Node.js/TypeScript. Build flat, usage, hybrid, tiered, seat, and prepaid pricing. Orchestrate providers, track usage, generate invoices (PDF), and manage entitlements via a clean, extensible API.

## Features
- Provider-neutral models and interfaces
- Pluggable providers (Stripe adapter included)
- Modular billing strategies (flat, usage, hybrid)
- Proration service for plan changes
- Usage tracking and entitlement storage
- Invoice generation to PDF
- Webhook normalization and event emission
- Storage abstraction with `InMemoryStorage`

## Install
```
npm install @mhbdev/bdk
```

If building locally:
```
npm install
npm run build
npm test
```

## Quick Start
```ts
import { BillingCore, InMemoryStorage, StripeAdapter } from '@mhbdev/bdk';

const storage = new InMemoryStorage();
const billing = new BillingCore({ storage });
billing.use('stripe', new StripeAdapter({ apiKey: process.env.STRIPE_API_KEY! }));
billing.setProvider('stripe');

// Create subscription
const plan = {
  id: 'plan_basic', productId: 'prod_1', name: 'Basic', currency: 'USD',
  pricing: [{ id: 'price_flat', type: 'flat', currency: 'USD', unitAmount: 1000, billingInterval: 'month', metadata: { stripePriceId: 'price_123' } }],
  strategy: 'flat',
  metadata: { stripePriceIds: ['price_123'] },
} as const;
const customerId = await billing.createCustomer({ id: 'c1', email: 'user@example.com' } as any);
await billing.createSubscription({ id: 'sub_1', customerId, planId: plan.id, status: 'active', startDate: new Date() } as any, plan);

// Usage-based invoice from strategy
const usagePlan = {
  id: 'plan_api', productId: 'prod_2', name: 'API', currency: 'USD',
  pricing: [{ id: 'price_usage', type: 'usage', currency: 'USD', unitAmount: 2, metric: 'api_calls' }],
  strategy: 'usage',
} as const;
const invoice = await billing.generateInvoiceFromStrategy(customerId, usagePlan, {
  periodStart: new Date(), periodEnd: new Date(),
  usage: [{ id: 'u1', customerId, subscriptionId: 'sub_1', metric: 'api_calls', quantity: 120, timestamp: new Date() }],
});
const pdf = await billing.generateInvoicePdf(invoice);
```

## Proration
- Use `billing.generateProrationInvoice(input)` to produce differential invoices for mid-cycle plan changes, given `oldAmount` and `newAmount` in minor units.
- Or use `billing.generateProrationInvoiceForPlanChange({ oldPlan, newPlan, seats?, periodStart, periodEnd, changeDate, customerId, subscriptionId })` to auto-resolve base amounts from `Plan.pricing`.

### Example
```ts
const proration = await billing.generateProrationInvoiceForPlanChange({
  oldPlan: { id: 'basic', productId: 'p', name: 'Basic', currency: 'USD', pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 10000, billingInterval: 'month' }], strategy: 'flat' },
  newPlan: { id: 'pro', productId: 'p', name: 'Pro', currency: 'USD', pricing: [{ id: 'flat', type: 'flat', currency: 'USD', unitAmount: 30000, billingInterval: 'month' }], strategy: 'flat' },
  seats: 1,
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-31'),
  changeDate: new Date('2024-01-11'),
  customerId,
  subscriptionId,
});
```

## Provider Integration
- Stripe adapter (`src/providers/stripe/StripeAdapter.ts`):
  - `createCustomer`, `createSubscription`, `cancelSubscription`, `generateInvoice`, `handleWebhook` implemented.
  - `recordUsage` requires `UsageRecord.metadata.stripeSubscriptionItemId` and calls `subscriptionItems.createUsageRecord` when available; otherwise throws a clear error.
- Add your own provider by implementing `BillingProvider` and registering via `billing.use('name', adapter)`. See `examples/customProvider.ts`.

## Strategies
- Flat-rate: `FlatRateStrategy` computes base recurring charges.
- Usage-based: `UsageBasedStrategy` computes charges from metered records, with optional tiering.
- Hybrid: `HybridStrategy` combines flat base with usage.

## Events
- Subscribe: `core.on((evt) => { /* handle */ })`.
- Emitted types include: `payment.succeeded`, `subscription.created`, `subscription.canceled`, `invoice.generated`, `invoice.paid`, `usage.recorded`.

## Storage
- Interface `BillingStorage` defines `saveCustomer`, `saveSubscription`, `saveUsageRecord`, `listUsage`, `recordInvoice`, `getInvoice`, `saveEntitlements`, `getEntitlements`.
- `InMemoryStorage` is included for quick start. Implement your own for production.

## Webhooks
- `WebhookService` normalizes provider payloads into `BillingEvent`.
- Stripe adapter validates signatures using `webhookSecret`.

## Examples
- `examples/subscription.ts`: Create customer and subscription with Stripe.
- `examples/usage.ts`: Generate invoice from usage strategy.
- `examples/invoice.ts`: Generate invoice and PDF.
- `examples/webhook.ts`: Normalize a webhook payload.
- `examples/proration.ts`: Generate proration invoice.
- `examples/customProvider.ts`: Implement and register a custom provider adapter.

## Testing
- Unit tests with `vitest` cover strategies, core orchestration, storage, events, proration, and subscription flows.
- Run `npm test` to validate: the suite passes.

## API Surface
- `BillingCore`
  - `use(name, provider)`
  - `setProvider(name)`
  - `on(handler)` / `off(handler)`
  - `createCustomer(customer)`
  - `createSubscription(subscription, plan)` / `cancelSubscription(id)`
  - `recordUsage(usageRecord)`
  - `generateInvoiceFromStrategy(customerId, plan, input)`
  - `finalizeInvoiceWithProvider(invoice)`
  - `generateInvoicePdf(invoice)`
  - `generateProrationInvoice(input)`
  - `generateProrationInvoiceForPlanChange(params)`

## Notes
- Stripe usage recording depends on SDK support for `subscriptionItems.createUsageRecord`. If unavailable, catch the error and either upgrade the SDK or implement provider-specific usage ingestion.
- Only Stripe adapter is shipped in `src/providers` to ensure no incomplete code in source. Use `examples/customProvider.ts` to build your own adapters (PayPal, Paddle, Adyen, etc.).

## License
MIT