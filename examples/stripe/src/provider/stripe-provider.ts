import Stripe from 'stripe';
import {
  PaymentProvider,
  ProviderPaymentResult,
  ProviderRefundResult,
  ProviderMethodResult,
  PaymentOptions,
  PaymentStatus,
  PaymentMethod,
  Money,
} from '@mhbdev/bdk/core';

export interface StripeProviderConfig {
  apiKey: string;
  webhookSecret?: string;
}

export class StripePaymentProvider extends PaymentProvider {
  readonly providerId = 'stripe';
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(config: StripeProviderConfig) {
    super();
    this.stripe = new Stripe(config.apiKey, {
    apiVersion: '2022-11-15'
  });
    this.webhookSecret = config.webhookSecret;
  }

  async createPayment(
    amount: Money,
    paymentMethod: PaymentMethod,
    options?: PaymentOptions
  ): Promise<ProviderPaymentResult> {
    const currency = (amount.currency || 'USD').toLowerCase();
    const amountMinor = Math.round(amount.amount * 100);

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: amountMinor,
        currency,
        payment_method: paymentMethod.providerMethodId,
        confirm: true,
        capture_method: options?.captureMethod === 'manual' ? 'manual' : 'automatic',
        description: options?.description,
        metadata: options?.metadata,
      });

      return {
        success: intent.status === 'succeeded' || intent.status === 'requires_capture' || intent.status === 'processing',
        providerTransactionId: intent.id,
        status: mapStripeStatusToPaymentStatus(intent.status),
        amount,
        raw: intent,
      };
    } catch (err: any) {
      return {
        success: false,
        providerTransactionId: '',
        status: PaymentStatus.FAILED,
        amount,
        failureReason: err?.message ?? 'Stripe error',
        raw: err,
      };
    }
  }

  async capturePayment(providerTransactionId: string): Promise<ProviderPaymentResult> {
    const intent = await this.stripe.paymentIntents.capture(providerTransactionId);
    const currency = intent.currency?.toUpperCase() ?? 'USD';
    const amount = {
      amount: (intent.amount ?? 0) / 100,
      currency,
    };
    return {
      success: intent.status === 'succeeded',
      providerTransactionId: intent.id,
      status: mapStripeStatusToPaymentStatus(intent.status),
      amount,
      raw: intent,
    };
  }

  async refundPayment(providerTransactionId: string, amount?: Money): Promise<ProviderRefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: providerTransactionId,
      amount: amount ? Math.round(amount.amount * 100) : undefined,
    });
    return {
      success: refund.status === 'succeeded',
      providerRefundId: refund.id,
      amount: {
        amount: (refund.amount ?? 0) / 100,
        currency: (refund.currency ?? 'USD').toUpperCase(),
      },
      raw: refund,
    };
  }

  async createPaymentMethod(customerId: string, providerMethodData: any): Promise<ProviderMethodResult> {
    let pm: Stripe.PaymentMethod;

    if (providerMethodData?.paymentMethodId) {
      pm = await this.stripe.paymentMethods.attach(providerMethodData.paymentMethodId, { customer: customerId });
    } else {
      pm = await this.stripe.paymentMethods.create({
        type: 'card',
        card: providerMethodData.card,
      });
      pm = await this.stripe.paymentMethods.attach(pm.id, { customer: customerId });
    }

    return {
      providerMethodId: pm.id,
      type: pm.type ?? 'card',
      lastFour: pm.card?.last4 ?? undefined,
      expiryMonth: pm.card?.exp_month ?? undefined,
      expiryYear: pm.card?.exp_year ?? undefined,
      raw: pm,
    };
  }

  async removePaymentMethod(providerMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(providerMethodId);
  }

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    if (!this.webhookSecret) return false;
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return !!event;
    } catch {
      return false;
    }
  }
}

function mapStripeStatusToPaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return PaymentStatus.PENDING;
    case 'processing':
      return PaymentStatus.PROCESSING;
    case 'requires_capture':
      return PaymentStatus.PENDING;
    case 'canceled':
      return PaymentStatus.CANCELED;
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    default:
      return PaymentStatus.PENDING;
  }
}