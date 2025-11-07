import { BillingEvent } from '../../core/models/types';

export class WebhookService {
  private normalizers: Record<string, (event: any) => BillingEvent> = {};

  register(provider: string, normalizer: (event: any) => BillingEvent): void {
    this.normalizers[provider] = normalizer;
  }

  normalize(event: any, provider: string): BillingEvent {
    const normalizer = this.normalizers[provider];
    if (normalizer) {
      return normalizer(event);
    }
    const type = inferType(event, provider);
    return {
      id: String(event?.id ?? Date.now()),
      type,
      provider,
      createdAt: new Date(),
      payload: event,
    };
  }
}

function inferType(_event: any, provider: string): BillingEvent['type'] {
  switch (provider) {
    case 'stripe':
      return 'invoice.generated';
    case 'paypal':
      return 'payment.succeeded';
    default:
      return 'usage.recorded';
  }
}