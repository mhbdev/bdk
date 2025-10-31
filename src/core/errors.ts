import { Money } from "./types";

/**
 * Base error class for billing system
 */
export abstract class BillingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Payment-related errors
 */
export class PaymentError extends BillingError {
  constructor(message: string, code: string = 'PAYMENT_ERROR') {
    super(message, code, 400);
  }
}

export class PaymentProviderError extends BillingError {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly providerError?: any
  ) {
    super(message, 'PAYMENT_PROVIDER_ERROR', 502);
  }
}

/**
 * Subscription-related errors
 */
export class SubscriptionError extends BillingError {
  constructor(message: string, code: string = 'SUBSCRIPTION_ERROR') {
    super(message, code, 400);
  }
}

export class SubscriptionNotFoundError extends SubscriptionError {
  constructor(subscriptionId: string) {
    super(`Subscription not found: ${subscriptionId}`, 'SUBSCRIPTION_NOT_FOUND');
    this.statusCode = 404;
  }
}

/**
 * Balance-related errors
 */
export class InsufficientBalanceError extends BillingError {
  constructor(
    public readonly required: Money,
    public readonly available: Money
  ) {
    super(
      `Insufficient balance: required ${required.amount} ${required.currency}, available ${available.amount} ${available.currency}`,
      'INSUFFICIENT_BALANCE',
      402
    );
  }
}