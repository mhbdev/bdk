import { WebhookService, WebhookProcessResult, WebhookRegistration } from '@mhbdev/bdk/services';

export class DatabaseWebhookService extends WebhookService {
  async processWebhook(providerId: string, payload: string, signature: string, headers: Record<string, string>): Promise<WebhookProcessResult> {
    return { success: false, eventType: 'unknown', processed: false, error: 'SizPay does not provide REST webhooks' };
  }
  async registerWebhook(providerId: string, url: string, events: string[]): Promise<WebhookRegistration> {
    return { id: 'noop', providerId, url, events, secret: 'n/a' };
  }
  async handlePaymentEvent(providerId: string, event: any): Promise<void> { }
  async handleSubscriptionEvent(providerId: string, event: any): Promise<void> { }
  async handleRefundEvent(providerId: string, event: any): Promise<void> { }
}