import { SubscriptionCreateOptions } from "../services/abstract-subscription";

/**
 * Abstract validator interface for input validation
 */
export abstract class Validator<T> {
  abstract validate(data: unknown): T;
  abstract validatePartial(data: unknown): Partial<T>;
}

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Example validator interface for subscription creation
 */
export interface SubscriptionCreateValidator extends Validator<SubscriptionCreateOptions> {
  validateCustomerId(customerId: string): boolean;
  validatePlanId(planId: string): boolean;
  validatePaymentMethod(paymentMethodId: string): boolean;
}
