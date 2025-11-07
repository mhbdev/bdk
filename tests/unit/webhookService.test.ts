import { describe, it, expect } from 'vitest';
import { WebhookService } from '../../src/services/webhook/WebhookService';

describe('WebhookService abstraction', () => {
  it('normalizes with default inference when no normalizer registered', () => {
    const svc = new WebhookService();
    const evt = svc.normalize({ id: 'abc' }, 'stripe');
    expect(evt.type).toBe('invoice.generated');
    expect(evt.provider).toBe('stripe');
  });

  it('uses registered normalizer for provider', () => {
    const svc = new WebhookService();
    svc.register('custom', (event: any) => ({
      id: String(event.id ?? 'evt'),
      type: 'payment.succeeded',
      provider: 'custom',
      createdAt: new Date(),
      payload: event,
    }));
    const evt = svc.normalize({ id: 'xyz' }, 'custom');
    expect(evt.type).toBe('payment.succeeded');
    expect(evt.provider).toBe('custom');
    expect(evt.id).toBe('xyz');
  });

  it('infers paypal type when no normalizer registered', () => {
    const svc = new WebhookService();
    const evt = svc.normalize({ id: 'p1' }, 'paypal');
    expect(evt.type).toBe('payment.succeeded');
    expect(evt.provider).toBe('paypal');
  });

  it('infers default type for unknown provider', () => {
    const svc = new WebhookService();
    const evt = svc.normalize({ id: 'u1' }, 'other');
    expect(evt.type).toBe('usage.recorded');
    expect(evt.provider).toBe('other');
  });
});