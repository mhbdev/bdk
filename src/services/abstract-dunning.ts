import { DunningAttempt, DunningCampaign, DunningCampaignConfig, Payment } from "../core";

/**
 * Abstract dunning (failed payment recovery) service
 */
export abstract class DunningService {
  /**
   * Create a dunning campaign
   */
  abstract createCampaign(
    config: DunningCampaignConfig
  ): Promise<DunningCampaign>;

  /**
   * Handle a failed payment
   */
  abstract handleFailedPayment(
    paymentId: string
  ): Promise<DunningAttempt>;

  /**
   * Retry a failed payment
   */
  abstract retryPayment(
    subscriptionId: string,
    attemptNumber: number
  ): Promise<Payment>;

  /**
   * Pause dunning for a subscription
   */
  abstract pauseDunning(
    subscriptionId: string,
    pauseUntil?: Date
  ): Promise<void>;

  /**
   * Resume dunning
   */
  abstract resumeDunning(subscriptionId: string): Promise<void>;
}