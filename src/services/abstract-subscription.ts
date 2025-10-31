import { Payment, Subscription, SubscriptionStatus } from "../core";

/**
 * Abstract subscription management service
 * Extend this class to implement your subscription business logic
 */
export abstract class SubscriptionService {
  /**
   * Create a new subscription for a customer
   */
  abstract create(
    customerId: string,
    planId: string,
    options?: SubscriptionCreateOptions
  ): Promise<Subscription>;

  /**
   * Update an existing subscription
   */
  abstract update(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription>;

  /**
   * Cancel a subscription
   */
  abstract cancel(
    subscriptionId: string,
    options?: SubscriptionCancelOptions
  ): Promise<Subscription>;

  /**
   * Pause a subscription
   */
  abstract pause(
    subscriptionId: string,
    options?: SubscriptionPauseOptions
  ): Promise<Subscription>;

  /**
   * Resume a paused subscription
   */
  abstract resume(subscriptionId: string): Promise<Subscription>;

  /**
   * Get subscription by ID
   */
  abstract getById(subscriptionId: string): Promise<Subscription | null>;

  /**
   * List subscriptions for a customer
   */
  abstract listByCustomer(
    customerId: string,
    filters?: SubscriptionFilters
  ): Promise<Subscription[]>;

  /**
   * Process subscription renewal
   */
  abstract processRenewal(subscriptionId: string): Promise<Payment>;
}

export interface SubscriptionCreateOptions {
  trialPeriodDays?: number;
  paymentMethodId?: string;
  startDate?: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionCancelOptions {
  immediately?: boolean;
  reason?: string;
  refund?: boolean;
}

export interface SubscriptionPauseOptions {
  resumeAt?: Date;
  resumeBehavior?: 'immediate' | 'billing_cycle';
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus[];
  planId?: string;
  limit?: number;
  offset?: number;
}