import { SubscriptionPlan } from "../core/interfaces";
import { BillingInterval, Money } from "../core/types";

/**
 * Abstract plan management service
 */
export abstract class PlanService {
  /**
   * Create a new subscription plan
   */
  abstract create(
    plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SubscriptionPlan>;

  /**
   * Update an existing plan
   */
  abstract update(
    planId: string,
    updates: Partial<SubscriptionPlan>
  ): Promise<SubscriptionPlan>;

  /**
   * Archive/soft delete a plan
   */
  abstract archive(planId: string): Promise<void>;

  /**
   * Get plan by ID
   */
  abstract getById(planId: string): Promise<SubscriptionPlan | null>;

  /**
   * List all active plans
   */
  abstract listActive(filters?: PlanFilters): Promise<SubscriptionPlan[]>;

  /**
   * Check if a plan can be downgraded to another
   */
  abstract canDowngrade(
    fromPlanId: string,
    toPlanId: string
  ): Promise<boolean>;

  /**
   * Calculate upgrade/downgrade prorations
   */
  abstract calculatePlanChange(
    subscriptionId: string,
    newPlanId: string
  ): Promise<PlanChangeCalculation>;
}

export interface PlanFilters {
  interval?: BillingInterval;
  priceRange?: { min: number; max: number };
  limit?: number;
  offset?: number;
}

export interface PlanChangeCalculation {
  proratedCredit: Money;
  proratedCharge: Money;
  netAmount: Money;
  effectiveDate: Date;
  nextBillingDate: Date;
}
