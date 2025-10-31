import { InvoiceLineItem, PaymentMethod, Subscription, SubscriptionPlan } from "./interfaces";
import { Money, PaymentStatus } from "./types";

/**
 * Abstract base class for billing strategies
 * Implement this to create custom billing logic (proration, usage-based, etc.)
 */
export abstract class BillingStrategy {
  /**
   * Calculate the amount to charge for a subscription period
   */
  abstract calculateAmount(
    subscription: Subscription,
    plan: SubscriptionPlan,
    context: BillingContext
  ): Promise<Money>;

  /**
   * Determine if a subscription should be billed
   */
  abstract shouldBill(
    subscription: Subscription,
    context: BillingContext
  ): Promise<boolean>;

  /**
   * Generate invoice line items for the billing period
   */
  abstract generateLineItems(
    subscription: Subscription,
    plan: SubscriptionPlan,
    context: BillingContext
  ): Promise<InvoiceLineItem[]>;
}

/**
 * Context provided to billing strategies
 */
export interface BillingContext {
  currentDate: Date;
  periodStart: Date;
  periodEnd: Date;
  isProration?: boolean;
  usageData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Abstract payment provider interface
 * Implement this to integrate with Stripe, PayPal, etc.
 */
export abstract class PaymentProvider {
  abstract readonly providerId: string;

  /**
   * Create a payment intent/transaction
   */
  abstract createPayment(
    amount: Money,
    paymentMethod: PaymentMethod,
    options?: PaymentOptions
  ): Promise<ProviderPaymentResult>;

  /**
   * Capture an authorized payment
   */
  abstract capturePayment(
    providerTransactionId: string
  ): Promise<ProviderPaymentResult>;

  /**
   * Refund a payment
   */
  abstract refundPayment(
    providerTransactionId: string,
    amount?: Money
  ): Promise<ProviderRefundResult>;

  /**
   * Create/attach a payment method
   */
  abstract createPaymentMethod(
    customerId: string,
    providerMethodData: any
  ): Promise<ProviderMethodResult>;

  /**
   * Remove a payment method
   */
  abstract removePaymentMethod(
    providerMethodId: string
  ): Promise<void>;

  /**
   * Verify webhook signature for security
   */
  abstract verifyWebhook(
    payload: string,
    signature: string
  ): Promise<boolean>;
}

/**
 * Provider-specific results
 */
export interface ProviderPaymentResult {
  success: boolean;
  providerTransactionId: string;
  status: PaymentStatus;
  amount: Money;
  failureReason?: string;
  raw?: any;
}

export interface ProviderRefundResult {
  success: boolean;
  providerRefundId: string;
  amount: Money;
  raw?: any;
}

export interface ProviderMethodResult {
  providerMethodId: string;
  type: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  raw?: any;
}

/**
 * Payment creation options
 */
export interface PaymentOptions {
  description?: string;
  captureMethod?: 'automatic' | 'manual';
  metadata?: Record<string, any>;
}
