import Stripe from 'stripe';
import { BillingProvider } from '../../core/interfaces';
import {
  BillingEvent,
  Customer,
  Invoice,
  InvoiceItem,
  Subscription,
  UsageRecord,
} from '../../core/models/types';
import { Plan } from '../../core/models/types';

export interface StripeAdapterOptions {
  apiKey: string;
  webhookSecret?: string;
}

export class StripeAdapter implements BillingProvider {
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(opts: StripeAdapterOptions) {
    // Use default API version configured on the account; omit explicit version for compatibility.
    this.stripe = new Stripe(opts.apiKey);
    this.webhookSecret = opts.webhookSecret;
  }

  async createCustomer(data: Customer): Promise<string> {
    const res = await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    });
    return res.id;
  }

  async createSubscription(sub: Subscription, plan: Plan): Promise<Subscription> {
    const priceIds: string[] =
      plan.metadata?.stripePriceIds ?? plan.pricing.map((p) => String(p.metadata?.stripePriceId)).filter(Boolean);
    if (!priceIds.length) {
      throw new Error('StripeAdapter: Plan must provide stripe price ids in metadata');
    }

    const res = await this.stripe.subscriptions.create({
      customer: sub.customerId,
      items: priceIds.map((price) => ({ price })),
      metadata: sub.metadata,
    });

    const items = res.items.data.map((it) => ({
      priceId: String(it.price?.id ?? ''),
      quantity: it.quantity ?? undefined,
      metadata: { stripeSubscriptionItemId: it.id },
    }));

    const anyRes: any = res as any;
    return {
      ...sub,
      externalId: res.id,
      status: (res.status as any) ?? 'active',
      startDate: new Date(((anyRes.current_period_start ?? Math.floor(Date.now() / 1000)) as number) * 1000),
      currentPeriodEnd: new Date(((anyRes.current_period_end ?? Math.floor(Date.now() / 1000)) as number) * 1000),
      items,
    };
  }

  async cancelSubscription(id: string): Promise<void> {
    await this.stripe.subscriptions.cancel(id);
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    const itemId = record.metadata?.stripeSubscriptionItemId;
    if (!itemId) {
      throw new Error('StripeAdapter: UsageRecord.metadata.stripeSubscriptionItemId is required');
    }
    // Use the usage records endpoint via the subscription items resource where supported.
    // Some Stripe versions/types may differ; we call through using any cast to preserve compatibility.
    const subItems: any = (this.stripe as any).subscriptionItems;
    if (typeof subItems?.createUsageRecord !== 'function') {
      throw new Error('StripeAdapter: createUsageRecord not available on subscriptionItems in this SDK version');
    }
    await subItems.createUsageRecord(itemId, {
      action: 'increment',
      quantity: record.quantity,
      timestamp: Math.floor(new Date(record.timestamp).getTime() / 1000),
    });
  }

  async generateInvoice(inv: Invoice): Promise<Invoice> {
    // Create invoice items first
    for (const item of inv.items) {
      await this.stripe.invoiceItems.create({
        customer: inv.customerId,
        currency: item.currency.toLowerCase(),
        amount: item.amount,
        description: item.description,
      });
    }
    const created = await this.stripe.invoices.create({ customer: inv.customerId, metadata: inv.metadata });
    const finalized = await this.stripe.invoices.finalizeInvoice(created.id);
    return {
      ...inv,
      externalId: finalized.id,
      number: finalized.number ?? undefined,
      status: (finalized.status as any) ?? inv.status,
      total: finalized.total ?? inv.total,
      pdfUrl: finalized.invoice_pdf ?? inv.pdfUrl,
    };
  }

  async handleWebhook(event: any, headers?: Record<string, string>): Promise<BillingEvent> {
    if (!this.webhookSecret) {
      throw new Error('StripeAdapter: webhookSecret not configured');
    }
    const sig = headers?.['stripe-signature'] || headers?.['Stripe-Signature'];
    const parsed = this.stripe.webhooks.constructEvent(event, sig as any, this.webhookSecret);
    const type = mapStripeEventType(parsed.type);
    return {
      id: String(parsed.id),
      type,
      provider: 'stripe',
      createdAt: new Date((parsed.created ?? Math.floor(Date.now() / 1000)) * 1000),
      payload: parsed,
    };
  }
}

function mapStripeEventType(eventType: string): BillingEvent['type'] {
  switch (eventType) {
    case 'invoice.payment_succeeded':
      return 'invoice.paid';
    case 'invoice.payment_failed':
      return 'invoice.payment_failed';
    case 'invoice.finalized':
      return 'invoice.generated';
    case 'customer.subscription.created':
      return 'subscription.created';
    case 'customer.subscription.updated':
      return 'subscription.renewed';
    case 'customer.subscription.deleted':
      return 'subscription.canceled';
    case 'charge.succeeded':
      return 'payment.succeeded';
    case 'charge.failed':
      return 'payment.failed';
    default:
      return 'usage.recorded';
  }
}