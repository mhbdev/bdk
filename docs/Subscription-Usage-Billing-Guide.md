# Build a Subscription + Metered Usage System with bdk

This guide walks you through wiring a Stripe-backed subscription and metered usage model with org and user contexts, Postgres/Drizzle persistence, Redis gating, and BetterAuth for authentication/permissions — all using the `@mhbdev/bdk` package.

## Overview
- Stripe: subscriptions, invoices, metered usage
- Postgres (Drizzle ORM): customers, subscriptions, invoices, usage, entitlements
- Redis: rate limiting and overage throttling
- BetterAuth: org vs. user identity, roles, API keys
- Next.js: API routes for start subscription, record usage, and webhooks

## Prerequisites
- Node 18+
- Postgres (connection string in `DATABASE_URL`)
- Stripe API keys (`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Redis connection (e.g., Upstash)
- BetterAuth integrated in your app (or equivalent)

## Install

```bash
npm install @mhbdev/bdk stripe drizzle-orm pg
# Optional Redis client
npm install ioredis
```

## Define Plans
Use plan helpers to declaratively model pricing and attach quotas in metadata. Persist plans to storage and reference them by `planId`.

```ts
// lib/plans.ts
import { plans } from '@mhbdev/bdk'

// Create base plans with helpers, then attach metadata
const FreeBase = plans.usagePlan({
  id: 'free',
  productId: 'prod_free',
  name: 'Free',
  currency: 'USD',
  unitAmount: 0, // free usage, enforced by quota
  metric: 'ai_tokens',
  billingInterval: 'month',
})

const ProBase = plans.hybridPlan({
  id: 'pro',
  productId: 'prod_pro',
  name: 'Pro',
  currency: 'USD',
  baseUnitAmount: 2_000, // $20
  usageUnitAmount: 1,    // $0.01 per 1k tokens (example minor units)
  metric: 'ai_tokens',
  billingInterval: 'month',
})

const TeamBase = plans.seatPlan({
  id: 'team',
  productId: 'prod_team',
  name: 'Team',
  currency: 'USD',
  seatUnitAmount: 1_200, // $12/seat
  billingInterval: 'month',
})

const EnterpriseBase = plans.hybridPlan({
  id: 'enterprise',
  productId: 'prod_enterprise',
  name: 'Enterprise',
  currency: 'USD',
  baseUnitAmount: 10_000, // $100
  usageUnitAmount: 0.8,   // $0.008 per unit
  metric: 'ai_tokens',
  billingInterval: 'month',
})

export const Plans = {
  Free: {
    ...FreeBase,
    metadata: {
      quotaMonthlyTokens: 100_000,
      rateLimitRPM: 60,
      limits: { agents: 1, kbSizeMB: 200 },
      overage: { mode: 'block' },
    },
  },
  Pro: {
    ...ProBase,
    metadata: {
      quotaMonthlyTokens: 2_000_000,
      rateLimitRPM: 300,
      overage: { mode: 'metered', pricePerTokenMinor: 1 },
    },
  },
  Team: {
    ...TeamBase,
    metadata: { quotaMonthlyTokens: 5_000_000, rateLimitRPM: 600 },
  },
  Enterprise: {
    ...EnterpriseBase,
    metadata: { custom: true },
  },
}

// Persist plans so APIs can resolve by planId (once at startup)
// import { billing } from './billing'
// await billing.savePlan(Plans.Free)
// await billing.savePlan(Plans.Pro)
// await billing.savePlan(Plans.Team)
// await billing.savePlan(Plans.Enterprise)
```

## Initialize Billing Core
Hook up Drizzle (Postgres) and Stripe.

```ts
// lib/billing.ts
import { BillingBuilder, DrizzleStorage } from '@mhbdev/bdk'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool)

const storage = new DrizzleStorage(db)

export const billing = new BillingBuilder()
  .withStorage(storage)
  .withStripe({
    apiKey: process.env.STRIPE_API_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }, true)
  .build()
```

## Org vs. User Customers (BetterAuth)
Use org ID if present, otherwise user ID as the `customerId`.

```ts
// lib/billing-subject.ts
export function resolveBillingSubject(authCtx: { orgId?: string; userId: string }) {
  return authCtx.orgId ?? authCtx.userId
}
```

Create customers on-demand:

```ts
// lib/customer.ts
import { billing } from './billing'
import { db } from './billing'

export async function ensureBillingCustomer(subjectId: string, email?: string, name?: string) {
  // Optional: check your own customers table first
  const providerId = await billing.createCustomer({ id: subjectId, email: email || '', name })
  return providerId
}
```

## Start Subscription API (Next.js App Router)
Create a route to start a subscription by `planId`, generate the first invoice, and set entitlements.

```ts
// app/api/billing/start/route.ts
import { billing } from '@/lib/billing'
import { Plans } from '@/lib/plans'
import { ensureBillingCustomer } from '@/lib/customer'
import { EntitlementService } from '@mhbdev/bdk'
import { db } from '@/lib/billing'

const entSvc = new EntitlementService(new (await import('@mhbdev/bdk')).DrizzleStorage(db))

function entitlementsFromPlan(plan: any, seats = 1) {
  const m = plan.metadata || {}
  const ents: Array<{ featureKey: string; limit?: number }> = []
  if (m.quotaMonthlyTokens) ents.push({ featureKey: 'ai_tokens', limit: m.quotaMonthlyTokens })
  if (m.limits?.agents) ents.push({ featureKey: 'agents', limit: m.limits.agents * seats })
  if (m.limits?.kbSizeMB) ents.push({ featureKey: 'kb_size_mb', limit: m.limits.kbSizeMB })
  return ents
}

export async function POST(req: Request) {
  const body = await req.json()
  const { planId, seats = 1, subjectId, email, name } = body
  const plan = await billing.getPlanById(planId)
  if (!plan) return Response.json({ error: 'invalid_plan' }, { status: 400 })

  const customerId = subjectId || await ensureBillingCustomer(subjectId, email, name)

  const subscription = {
    id: `sub_${Date.now()}`,
    customerId,
    planId: plan.id,
    status: 'active',
    startDate: new Date(),
  }

  const { subscription: created, invoice: finalized } = await (await import('@mhbdev/bdk')).subscription.start(billing, {
    customerId,
    planId,
    seats,
    periodStart: new Date(),
    periodEnd: new Date(),
  })

  await entSvc.setEntitlements(customerId, entitlementsFromPlan(plan, seats))

  return Response.json({ subscription: created, invoice: finalized })
}
```

## Record Usage API with Gating
Rate-limit via Redis, enforce quotas derived from plan metadata via SDK convenience, then record usage.

```ts
// app/api/usage/route.ts
import { billing } from '@/lib/billing'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

function minuteKey(customerId: string, model: string, op: string) {
  return `rl:${customerId}:${model}:${op}:${Math.floor(Date.now()/60000)}`
}

async function rateLimit(redis: Redis, customerId: string, limitRPM: number, model: string, op: string) {
  const key = minuteKey(customerId, model, op)
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 60)
  return count <= limitRPM
}

export async function POST(req: Request) {
  const body = await req.json()
  const { customerId, subscriptionId, tokens, model, operation } = body

  // Example: load RPM limit from entitlements or plan metadata
  const rpmLimit = 300 // TODO: derive per customer
  const allowed = await rateLimit(redis as any, customerId, rpmLimit, model, operation)
  if (!allowed) return Response.json({ error: 'rate_limit_exceeded' }, { status: 429 })

  // Quota check (month) — can also use UsageService to sum current period
  const attempted = Number(tokens) || 0
  if (attempted <= 0) return Response.json({ error: 'invalid_quantity' }, { status: 400 })

  await billing.recordUsageWithPlanPolicy({
    subscriptionId,
    metric: 'ai_tokens',
    quantity: attempted,
    timestamp: new Date(),
  })
  return Response.json({ ok: true })
}
```

## Stripe Webhooks (Verified)
Use the Stripe adapter to verify signatures and forward normalized events.

```ts
// app/api/webhooks/stripe/route.ts
import { StripeAdapter } from '@mhbdev/bdk'
import { billing } from '@/lib/billing'

const stripe = new StripeAdapter({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') || ''
  const raw = await req.text()
  const event = await stripe.handleWebhook(raw, { 'stripe-signature': sig } as any)
  billing.receiveEvent(event)
  return Response.json({ ok: true })
}
```

## Overage Policies
- Free: block after quota (`overage.mode = 'block'`)
- Paid: meter overage — continue recording usage; Stripe charges on invoice
- Throttle: enforce via Redis RPM

Decide per-plan behavior via `metadata.overage` and enforce in your usage route.

## Seats & Org Sharing
- Team plan seats are in the subscription; apply per-seat entitlements for features (e.g., agents)
- Use org `customerId` to share usage/quota among members

## Invoices & Proration
- First invoice: `billing.generateInvoiceFromStrategy(...)` then `billing.finalizeInvoice(...)`
- Proration on plan change: `billing.generateProrationInvoiceForPlanChange({ ... })`
- PDF: `billing.generateInvoicePdf(inv)`

## Testing & Validation
- Unit test your routes with mocked Redis and BetterAuth
- Verify Stripe webhook signature locally with the CLI (`stripe listen`)
- Use the SDK’s tests as reference (`tests/unit/*` in the repo)

## Next.js Helpers (Optional)
Quick factories exist but do not include your custom gating:
- `nextjs.appRouterStartSubscription(billing)`
- `nextjs.appRouterRecordUsage(billing)`
- `nextjs.appRouterWebhook(billing, webhookService, 'stripe')`

Prefer custom routes for production to enforce your business rules.

---

## Checklist
- [ ] Plans declared with quotas and overage policy
- [ ] DrizzleStorage connected to Postgres
- [ ] Stripe adapter configured with API key and webhook secret
- [ ] Org vs. user `customerId` resolution
- [ ] Start subscription API generates initial invoice and entitlements
- [ ] Usage API enforces rate limits and monthly quotas
- [ ] Verified Stripe webhook ingests events