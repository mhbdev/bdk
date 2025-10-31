import { Balance, Invoice, LedgerEntry, Payment, Subscription } from "../core/interfaces";
import { Money, SubscriptionStatus } from "../core/types";

/**
 * Event types for the billing system
 */
export enum BillingEventType {
  // Payment events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_PAUSED = 'subscription.paused',
  SUBSCRIPTION_RESUMED = 'subscription.resumed',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription.trial_ending',
  
  // Invoice events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_FINALIZED = 'invoice.finalized',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  
  // Balance events
  BALANCE_UPDATED = 'balance.updated',
  CREDIT_ADDED = 'credit.added',
}

/**
 * Event payload definitions
 */
export interface BillingEventPayloads {
  [BillingEventType.PAYMENT_CREATED]: PaymentEventPayload;
  [BillingEventType.PAYMENT_SUCCEEDED]: PaymentEventPayload;
  [BillingEventType.PAYMENT_FAILED]: PaymentEventPayload;
  [BillingEventType.PAYMENT_REFUNDED]: PaymentEventPayload;
  
  [BillingEventType.SUBSCRIPTION_CREATED]: SubscriptionEventPayload;
  [BillingEventType.SUBSCRIPTION_UPDATED]: SubscriptionEventPayload;
  [BillingEventType.SUBSCRIPTION_CANCELED]: SubscriptionEventPayload;
  [BillingEventType.SUBSCRIPTION_PAUSED]: SubscriptionEventPayload;
  [BillingEventType.SUBSCRIPTION_RESUMED]: SubscriptionEventPayload;
  [BillingEventType.SUBSCRIPTION_RENEWED]: SubscriptionRenewalPayload;
  [BillingEventType.SUBSCRIPTION_TRIAL_ENDING]: SubscriptionEventPayload;
  
  [BillingEventType.INVOICE_CREATED]: InvoiceEventPayload;
  [BillingEventType.INVOICE_FINALIZED]: InvoiceEventPayload;
  [BillingEventType.INVOICE_PAID]: InvoiceEventPayload;
  [BillingEventType.INVOICE_PAYMENT_FAILED]: InvoiceEventPayload;
  
  [BillingEventType.BALANCE_UPDATED]: BalanceEventPayload;
  [BillingEventType.CREDIT_ADDED]: CreditEventPayload;
}

export interface PaymentEventPayload {
  payment: Payment;
  customerId: string;
  subscriptionId?: string;
}

export interface SubscriptionEventPayload {
  subscription: Subscription;
  customerId: string;
  previousStatus?: SubscriptionStatus;
}

export interface SubscriptionRenewalPayload extends SubscriptionEventPayload {
  payment: Payment;
  invoice?: Invoice;
}

export interface InvoiceEventPayload {
  invoice: Invoice;
  customerId: string;
  subscriptionId?: string;
}

export interface BalanceEventPayload {
  balance: Balance;
  customerId: string;
  previousBalance: Money;
}

export interface CreditEventPayload {
  ledgerEntry: LedgerEntry;
  customerId: string;
  newBalance: Money;
}

/**
 * Type-safe event handler function
 */
export type EventHandler<T extends BillingEventType> = (
  payload: BillingEventPayloads[T],
  metadata?: EventMetadata
) => Promise<void> | void;

/**
 * Event metadata for context
 */
export interface EventMetadata {
  eventId: string;
  timestamp: Date;
  source: string;
  idempotencyKey?: string;
  correlationId?: string;
}

/**
 * Abstract event emitter for the billing system
 */
export abstract class BillingEventEmitter {
  /**
   * Register an event handler
   */
  abstract on<T extends BillingEventType>(
    event: T,
    handler: EventHandler<T>
  ): void;

  /**
   * Remove an event handler
   */
  abstract off<T extends BillingEventType>(
    event: T,
    handler: EventHandler<T>
  ): void;

  /**
   * Emit an event
   */
  abstract emit<T extends BillingEventType>(
    event: T,
    payload: BillingEventPayloads[T],
    metadata?: Partial<EventMetadata>
  ): Promise<void>;

  /**
   * Register a one-time event handler
   */
  abstract once<T extends BillingEventType>(
    event: T,
    handler: EventHandler<T>
  ): void;
}
