/**
 * Abstract webhook service for receiving provider notifications
 */
export abstract class WebhookService {
  /**
   * Process incoming webhook
   */
  abstract processWebhook(
    providerId: string,
    payload: string,
    signature: string,
    headers: Record<string, string>
  ): Promise<WebhookProcessResult>;

  /**
   * Register webhook endpoints with providers
   */
  abstract registerWebhook(
    providerId: string,
    url: string,
    events: string[]
  ): Promise<WebhookRegistration>;

  /**
   * Handle specific webhook events
   */
  abstract handlePaymentEvent(
    providerId: string,
    event: any
  ): Promise<void>;

  abstract handleSubscriptionEvent(
    providerId: string,
    event: any
  ): Promise<void>;

  abstract handleRefundEvent(
    providerId: string,
    event: any
  ): Promise<void>;
}

export interface WebhookProcessResult {
  success: boolean;
  eventType: string;
  processed: boolean;
  error?: string;
}

export interface WebhookRegistration {
  id: string;
  providerId: string;
  url: string;
  events: string[];
  secret: string;
}