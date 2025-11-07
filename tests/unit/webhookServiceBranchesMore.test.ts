import { describe, it, expect } from 'vitest';
import { WebhookService } from '../../src/services/webhook/WebhookService';

describe('WebhookService branch coverage', () => {
  it('uses registered normalizer if available', () => {
    const svc = new WebhookService();
    svc.register('stripe', (event: any) => ({ id: 'n1', type: 'invoice.paid', provider: 'stripe', createdAt: new Date(), payload: event }));
    const out = svc.normalize({ id: 'evt_1' }, 'stripe');
    expect(out.id).toBe('n1');
    expect(out.type).toBe('invoice.paid');
    expect(out.provider).toBe('stripe');
  });

  it('infers type for stripe when no normalizer and preserves event id', () => {
    const svc = new WebhookService();
    const out = svc.normalize({ id: 'evt_keep' }, 'stripe');
    expect(out.type).toBe('invoice.generated');
    expect(out.id).toBe('evt_keep');
  });

  it('falls back to generated id when event has no id', () => {
    const svc = new WebhookService();
    const out = svc.normalize({}, 'custom');
    expect(typeof out.id).toBe('string');
    expect(out.type).toBe('usage.recorded');
  });
});