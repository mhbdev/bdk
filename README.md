# @mhbdev/bdk Billing Development Kit

Type-safe billing and subscription management SDK.

## Installation

```bash
npm install @mhbdev/bdk
```

## Quick Start

```typescript
import { createNextJsAppRouterHandlers } from '@mhbdev/bdk/adapters';

const handlers = createNextJsAppRouterHandlers({
  webhookService: myWebhookService,
  providerId: 'stripe',
});

export const POST = handlers.POST;
```

## Features

- 🎯 Fully Abstract - Pure interfaces and abstract classes
- 🔒 Type-Safe - Complete TypeScript coverage
- 🔌 Extensible - Clear extension points
- 📡 Event-Driven - Comprehensive hook system

## Documentation

See [full documentation](https://github.com/mhbdev/bdk#readme).

## License

MIT

```typescript
 class ProrationBillingStrategy extends BillingStrategy {
   async calculateAmount(
     subscription: Subscription,
     plan: SubscriptionPlan,
     context: BillingContext
   ): Promise<Money> {
     if (!context.isProration) {
       return plan.price;
     }

     const totalDays = differenceInDays(
       context.periodEnd,
       context.periodStart
     );
     const remainingDays = differenceInDays(
       context.periodEnd,
       context.currentDate
     );

     const proratedAmount = (plan.price.amount  remainingDays) / totalDays;

     return {
       amount: Math.round(proratedAmount  100) / 100,
       currency: plan.price.currency,
     };
   }

   async shouldBill(
     subscription: Subscription,
     context: BillingContext
   ): Promise<boolean> {
     return subscription.status === SubscriptionStatus.ACTIVE;
   }

   async generateLineItems(
     subscription: Subscription,
     plan: SubscriptionPlan,
     context: BillingContext
   ): Promise<InvoiceLineItem[]> {
     const amount = await this.calculateAmount(subscription, plan, context);

     return [{
       description: `${plan.name} - ${context.periodStart.toISOString()} to ${context.periodEnd.toISOString()}`,
       quantity: 1,
       unitAmount: amount,
       amount,
     }];
   }
 }
```

Example: Implementing the subscription service

```typescript
class MySubscriptionService extends SubscriptionService {
  constructor(
    private db: DrizzleDB,
    private paymentService: PaymentService,
    private eventEmitter: BillingEventEmitter
  ) {
    super();
  }

  async create(
    customerId: string,
    planId: string,
    options?: SubscriptionCreateOptions
  ): Promise<Subscription> {
    // 1. Validate customer and plan
    // 2. Create subscription record in DB
    // 3. Set up trial if applicable
    // 4. Emit event

    const subscription = await this.db
      .insert(subscriptions)
      .values({
        customerId,
        planId,
        status: options?.trialPeriodDays
          ? SubscriptionStatus.TRIALING
          : SubscriptionStatus.ACTIVE,
        // ... other fields
      })
      .returning();

    await this.eventEmitter.emit(BillingEventType.SUBSCRIPTION_CREATED, {
      subscription,
      customerId,
    });

    return subscription;
  }

  // Implement other abstract methods...
}
```

Example: Setting up event handlers

```typescript
const eventEmitter = new MyBillingEventEmitter();

// Send email when payment succeeds
eventEmitter.on(BillingEventType.PAYMENT_SUCCEEDED, async (payload) => {
  await emailService.send({
    to: payload.customerId,
    subject: 'Payment Successful',
    body: `Your payment of ${payload.payment.amount.amount} ${payload.payment.amount.currency} was processed successfully.`,
  });
});

// Alert when subscription is about to expire
eventEmitter.on(BillingEventType.SUBSCRIPTION_TRIAL_ENDING, async (payload) => {
  await notificationService.sendTrialEndingReminder(
    payload.customerId,
    payload.subscription
  );
});

// Update analytics when subscription changes
eventEmitter.on(BillingEventType.SUBSCRIPTION_UPDATED, async (payload) => {
  await analyticsService.track('subscription_updated', {
    customerId: payload.customerId,
    status: payload.subscription.status,
    previousStatus: payload.previousStatus,
  });
});
```

Example: Complete setup with dependency injection

```typescript
// 1. Set up provider registry
const providerRegistry = new MyPaymentProviderRegistry();
providerRegistry.register(new StripePaymentProvider(process.env.STRIPE_KEY));
providerRegistry.register(new PayPalPaymentProvider(process.env.PAYPAL_KEY));
providerRegistry.setDefaultProvider('stripe');

// 2. Set up event system
const eventEmitter = new MyBillingEventEmitter();

// 3. Set up billing strategy
const billingStrategy = new ProrationBillingStrategy();

// 4. Initialize services
const paymentService = new MyPaymentService(db, providerRegistry, eventEmitter);

const subscriptionService = new MySubscriptionService(
  db,
  paymentService,
  eventEmitter,
  billingStrategy
);

const balanceService = new MyBalanceService(db, eventEmitter);
const invoiceService = new MyInvoiceService(db, eventEmitter);

// 5. Use the services
const subscription = await subscriptionService.create(
  'customer-123',
  'plan-premium',
  {
    trialPeriodDays: 14,
    paymentMethodId: 'pm-456',
    metadata: { source: 'web' },
  }
);

const payment = await paymentService.process(
  'customer-123',
  { amount: 29.99, currency: 'USD' },
  'pm-456',
  {
    subscriptionId: subscription.id,
    description: 'Monthly subscription fee',
  }
);
```

Complete example showing how to set up the entire billing system

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// 1. Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// 2. Initialize providers
const stripeProvider = new StripePaymentProvider(
  process.env.STRIPE_SECRET_KEY!
);
const paypalProvider = new PayPalPaymentProvider(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_SECRET!
);

const providerRegistry = new SimpleProviderRegistry();
providerRegistry.register(stripeProvider);
providerRegistry.register(paypalProvider);
providerRegistry.setDefaultProvider('stripe');

// 3. Initialize event system
const eventEmitter = new InMemoryEventEmitter();

// 4. Initialize billing strategy
const billingStrategy = new ProrationBillingStrategy();

// 5. Initialize all services
const auditService = new DatabaseAuditService(db);
const taxService = new TaxJarTaxService(process.env.TAXJAR_API_KEY!);

const paymentService = new DatabasePaymentService(
  db,
  providerRegistry,
  eventEmitter,
  auditService
);

const planService = new DatabasePlanService(db, auditService);

const subscriptionService = new DatabaseSubscriptionService(
  db,
  paymentService,
  planService,
  eventEmitter,
  billingStrategy,
  auditService
);

const balanceService = new DatabaseBalanceService(
  db,
  eventEmitter,
  auditService
);

const invoiceService = new DatabaseInvoiceService(
  db,
  taxService,
  eventEmitter,
  auditService
);

const usageService = new DatabaseUsageService(db, eventEmitter);

const webhookService = new ProviderWebhookService(
  providerRegistry,
  paymentService,
  subscriptionService,
  eventEmitter
);

const dunningService = new DatabaseDunningService(
  db,
  paymentService,
  eventEmitter
);

const reportingService = new DatabaseReportingService(db);

// 6. Set up event handlers
setupEventHandlers(eventEmitter);

function setupEventHandlers(emitter: BillingEventEmitter) {
  // Email notifications
  emitter.on(BillingEventType.PAYMENT_SUCCEEDED, async (payload) => {
    await emailService.sendPaymentReceipt(payload.customerId, payload.payment);
  });

  emitter.on(BillingEventType.PAYMENT_FAILED, async (payload) => {
    await emailService.sendPaymentFailedNotification(
      payload.customerId,
      payload.payment
    );
  });

  emitter.on(BillingEventType.SUBSCRIPTION_TRIAL_ENDING, async (payload) => {
    await emailService.sendTrialEndingReminder(
      payload.customerId,
      payload.subscription
    );
  });

  // Analytics tracking
  emitter.on(BillingEventType.SUBSCRIPTION_CREATED, async (payload) => {
    await analytics.track('subscription_created', {
      customer_id: payload.customerId,
      plan_id: payload.subscription.planId,
      status: payload.subscription.status,
    });
  });

  // Dunning
  emitter.on(BillingEventType.PAYMENT_FAILED, async (payload) => {
    if (payload.subscriptionId) {
      await dunningService.handleFailedPayment(payload.payment.id);
    }
  });

  // Webhooks to external systems
  emitter.on(BillingEventType.SUBSCRIPTION_CANCELED, async (payload) => {
    await fetch('https://your-app.com/webhooks/subscription-canceled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });
}

// 7. Export billing system
export const billingSystem = {
  payment: paymentService,
  subscription: subscriptionService,
  balance: balanceService,
  invoice: invoiceService,
  plan: planService,
  usage: usageService,
  webhook: webhookService,
  dunning: dunningService,
  reporting: reportingService,
  audit: auditService,
  tax: taxService,
  events: eventEmitter,
};

// 8. Example API endpoint using the billing system
app.post('/api/subscriptions', async (req, res) => {
  try {
    const { customerId, planId, paymentMethodId } = req.body;

    const subscription = await billingSystem.subscription.create(
      customerId,
      planId,
      {
        paymentMethodId,
        trialPeriodDays: 14,
        metadata: { source: 'api', ip: req.ip },
      }
    );

    res.json({ subscription });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

// ============================================================================
// EXAMPLE USAGE - How to implement your own providers and strategies
// ============================================================================

Example: Implementing a Stripe payment provider

```typescript
import Stripe from 'stripe';

class StripePaymentProvider extends PaymentProvider {
  readonly providerId = 'stripe';
  private stripe: Stripe;

  constructor(apiKey: string) {
    super();
    this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
  }

  async createPayment(
    amount: Money,
    paymentMethod: PaymentMethod,
    options?: PaymentOptions
  ): Promise<ProviderPaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount.amount  100), // Convert to cents
        currency: amount.currency.toLowerCase(),
        payment_method: paymentMethod.providerMethodId,
        confirm: true,
        description: options?.description,
        metadata: options?.metadata,
      });

      return {
        success: paymentIntent.status === 'succeeded',
        providerTransactionId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount,
        raw: paymentIntent,
      };
    } catch (error) {
      return {
        success: false,
        providerTransactionId: '',
        status: PaymentStatus.FAILED,
        amount,
        failureReason: error.message,
      };
    }
  }

  // Implement other abstract methods...
}
```

Example: Implementing a proration billing strategy

```typescript
class ProrationBillingStrategy extends BillingStrategy {
  async calculateAmount(
    subscription: Subscription,
    plan: SubscriptionPlan,
    context: BillingContext
  ): Promise<Money> {
    if (!context.isProration) {
      return plan.price;
    }

    const totalDays = differenceInDays(
      context.periodEnd,
      context.periodStart
    );
    const remainingDays = differenceInDays(
      context.periodEnd,
      context.currentDate
    );

    const proratedAmount = (plan.price.amount  remainingDays) / totalDays;

    return {
      amount: Math.round(proratedAmount  100) / 100,
      currency: plan.price.currency,
    };
  }

  async shouldBill(
    subscription: Subscription,
    context: BillingContext
  ): Promise<boolean> {
    return subscription.status === SubscriptionStatus.ACTIVE;
  }

  async generateLineItems(
    subscription: Subscription,
    plan: SubscriptionPlan,
    context: BillingContext
  ): Promise<InvoiceLineItem[]> {
    const amount = await this.calculateAmount(subscription, plan, context);

    return [{
      description: `${plan.name} - ${context.periodStart.toISOString()} to ${context.periodEnd.toISOString()}`,
      quantity: 1,
      unitAmount: amount,
      amount,
    }];
  }
}
```

Example: Implementing the subscription service

```typescript
class MySubscriptionService extends SubscriptionService {
  constructor(
    private db: DrizzleDB,
    private paymentService: PaymentService,
    private eventEmitter: BillingEventEmitter
  ) {
    super();
  }

  async create(
    customerId: string,
    planId: string,
    options?: SubscriptionCreateOptions
  ): Promise<Subscription> {
    // 1. Validate customer and plan
    // 2. Create subscription record in DB
    // 3. Set up trial if applicable
    // 4. Emit event

    const subscription = await this.db
      .insert(subscriptions)
      .values({
        customerId,
        planId,
        status: options?.trialPeriodDays
          ? SubscriptionStatus.TRIALING
          : SubscriptionStatus.ACTIVE,
        // ... other fields
      })
      .returning();

    await this.eventEmitter.emit(BillingEventType.SUBSCRIPTION_CREATED, {
      subscription,
      customerId,
    });

    return subscription;
  }

  // Implement other abstract methods...
}
```

Example: Setting up event handlers

```typescript
const eventEmitter = new MyBillingEventEmitter();

// Send email when payment succeeds
eventEmitter.on(BillingEventType.PAYMENT_SUCCEEDED, async (payload) => {
  await emailService.send({
    to: payload.customerId,
    subject: 'Payment Successful',
    body: `Your payment of ${payload.payment.amount.amount} ${payload.payment.amount.currency} was processed successfully.`,
  });
});

// Alert when subscription is about to expire
eventEmitter.on(BillingEventType.SUBSCRIPTION_TRIAL_ENDING, async (payload) => {
  await notificationService.sendTrialEndingReminder(
    payload.customerId,
    payload.subscription
  );
});

// Update analytics when subscription changes
eventEmitter.on(BillingEventType.SUBSCRIPTION_UPDATED, async (payload) => {
  await analyticsService.track('subscription_updated', {
    customerId: payload.customerId,
    status: payload.subscription.status,
    previousStatus: payload.previousStatus,
  });
});
```

// ============================================================================
// WEBHOOK ADAPTER USAGE EXAMPLES
// ============================================================================

Example 1: Next.js App Router (app/api/webhooks/stripe/route.ts)

```typescript
import { createNextJsAppRouterHandlers } from '@yourcompany/billing-sdk/adapters';
import { webhookService } from '@/lib/billing';

const handlers = createNextJsAppRouterHandlers({
  webhookService,
  providerId: 'stripe',
  signatureHeader: 'stripe-signature',
  onSuccess: async (result) => {
    console.log('Webhook processed:', result.eventType);
  },
  onError: async (error) => {
    console.error('Webhook error:', error);
    // Send to error tracking service
    await errorTracker.captureException(error);
  },
});

export const POST = handlers.POST;
export const GET = handlers.GET;
```

Example 2: Next.js Pages API (pages/api/webhooks/stripe.ts)

```typescript
import { createNextJsPagesHandler } from '@yourcompany/billing-sdk/adapters';
import { webhookService } from '@/lib/billing';

// Disable body parsing - we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default createNextJsPagesHandler({
  webhookService,
  providerId: 'stripe',
  signatureHeader: 'stripe-signature',
});
```

Example 3: Express.js

```typescript
import express from 'express';
import { createExpressHandler } from '@yourcompany/billing-sdk/adapters';
import { webhookService } from './billing';

const app = express();

// Use express.raw() to get raw body for signature verification
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  createExpressHandler({
    webhookService,
    providerId: 'stripe',
    signatureHeader: 'stripe-signature',
  })
);

app.listen(3000);
```

Example 4: Multiple providers with Next.js App Router

```typescript
// app/api/webhooks/[provider]/route.ts
import { createNextJsAppRouterHandlers } from '@yourcompany/billing-sdk/adapters';
import { webhookService } from '@/lib/billing';

export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  const providerConfig = {
    stripe: { signatureHeader: 'stripe-signature' },
    paypal: { signatureHeader: 'paypal-transmission-sig' },
  };

  const config = providerConfig[params.provider as keyof typeof providerConfig];
  if (!config) {
    return new Response('Provider not supported', { status: 400 });
  }

  const handlers = createNextJsAppRouterHandlers({
    webhookService,
    providerId: params.provider,
    ...config,
  });

  return handlers.POST(request);
}
```

Example 5: Custom payload transformation

```typescript
import { createNextJsAppRouterHandlers } from '@yourcompany/billing-sdk/adapters';
import { webhookService } from '@/lib/billing';

const handlers = createNextJsAppRouterHandlers({
  webhookService,
  providerId: 'custom-provider',
  signatureHeader: 'x-custom-signature',
  // Transform the payload before processing
  payloadTransform: (body) => {
    // Decode base64 payload
    return Buffer.from(body, 'base64').toString('utf8');
  },
  onSuccess: async (result) => {
    // Log to analytics
    await analytics.track('webhook_received', {
      provider: 'custom-provider',
      eventType: result.eventType,
    });
  },
});

export const POST = handlers.POST;
```

Example 6: Webhook handler with middleware

```typescript
// app/api/webhooks/stripe/route.ts
import { createNextJsAppRouterHandlers } from '@yourcompany/billing-sdk/adapters';
import { webhookService } from '@/lib/billing';
import { verifyApiKey } from '@/lib/auth';

const baseHandlers = createNextJsAppRouterHandlers({
  webhookService,
  providerId: 'stripe',
});

// Wrap with authentication middleware
export async function POST(request: Request) {
  // Verify API key
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || !verifyApiKey(apiKey)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (await isRateLimited(ip)) {
    return new Response('Too many requests', { status: 429 });
  }

  // Process webhook
  return baseHandlers.POST(request);
}
```

Example 7: Testing webhook handlers

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createNextJsAppRouterHandlers } from '@yourcompany/billing-sdk/adapters';

describe('Webhook handlers', () => {
  it('should process valid webhooks', async () => {
    const mockWebhookService = {
      processWebhook: vi.fn().mockResolvedValue({
        success: true,
        eventType: 'payment.succeeded',
        processed: true,
      }),
    };

    const handlers = createNextJsAppRouterHandlers({
      webhookService: mockWebhookService as any,
      providerId: 'stripe',
    });

    const request = new Request('http://localhost/api/webhooks', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type: 'payment.succeeded' }),
    });

    const response = await handlers.POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.received).toBe(true);
    expect(data.eventType).toBe('payment.succeeded');
  });

  it('should handle errors gracefully', async () => {
    const mockWebhookService = {
      processWebhook: vi.fn().mockRejectedValue(new Error('Invalid signature')),
    };

    const handlers = createNextJsAppRouterHandlers({
      webhookService: mockWebhookService as any,
      providerId: 'stripe',
    });

    const request = new Request('http://localhost/api/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body: '{}',
    });

    const response = await handlers.POST(request);
    expect(response.status).toBe(400);
  });
});
```

Example: Complete setup with dependency injection

```typescript
// 1. Set up provider registry
const providerRegistry = new MyPaymentProviderRegistry();
providerRegistry.register(new StripePaymentProvider(process.env.STRIPE_KEY));
providerRegistry.register(new PayPalPaymentProvider(process.env.PAYPAL_KEY));
providerRegistry.setDefaultProvider('stripe');

// 2. Set up event system
const eventEmitter = new MyBillingEventEmitter();

// 3. Set up billing strategy
const billingStrategy = new ProrationBillingStrategy();

// 4. Initialize services
const paymentService = new MyPaymentService(db, providerRegistry, eventEmitter);

const subscriptionService = new MySubscriptionService(
  db,
  paymentService,
  eventEmitter,
  billingStrategy
);

const balanceService = new MyBalanceService(db, eventEmitter);
const invoiceService = new MyInvoiceService(db, eventEmitter);

// 5. Use the services
const subscription = await subscriptionService.create(
  'customer-123',
  'plan-premium',
  {
    trialPeriodDays: 14,
    paymentMethodId: 'pm-456',
    metadata: { source: 'web' },
  }
);

const payment = await paymentService.process(
  'customer-123',
  { amount: 29.99, currency: 'USD' },
  'pm-456',
  {
    subscriptionId: subscription.id,
    description: 'Monthly subscription fee',
  }
);
```
