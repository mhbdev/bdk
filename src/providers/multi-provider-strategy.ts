import { PaymentProvider } from "../core/abstract-classes";
import { PaymentMethod } from "../core/interfaces";
import { Money } from "../core/types";

/**
 * Strategy for selecting payment provider based on context
 */
export abstract class ProviderSelectionStrategy {
  /**
   * Select the appropriate provider for a payment
   */
  abstract selectProvider(
    context: ProviderSelectionContext
  ): Promise<PaymentProvider>;
}

export interface ProviderSelectionContext {
  customerId: string;
  amount: Money;
  paymentMethod?: PaymentMethod;
  country?: string;
  preferences?: Record<string, any>;
}

/**
 * Example strategies you might implement:
 * - GeographicProviderStrategy: Select based on customer location
 * - CostOptimizedProviderStrategy: Select based on transaction fees
 * - FailoverProviderStrategy: Try primary, fallback to secondary
 * - CustomerPreferenceStrategy: Respect customer's preferred provider
 */