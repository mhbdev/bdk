import { WebhookService } from '../../src/services/webhook/WebhookService';
import { BillingCore } from '../../src';
import { InMemoryStorage } from '../../src/storage/inMemory';

async function main() {
  const core = new BillingCore({ storage: new InMemoryStorage() });
  const webhook = new WebhookService();

  // Simulate a Stripe webhook event
  const stripeEvent = { id: 'evt_123', type: 'invoice.finalized', data: { object: { id: 'in_123' } } };
  const normalized = webhook.normalize(stripeEvent, 'stripe');
  core.on((evt) => {
    if (evt.type === 'invoice.generated') {
      console.log('Observed normalized webhook event:', evt);
    }
  });
  // Forward normalized event to core for consumers
  core.receiveEvent(normalized);
}

main().catch((e) => console.error(e));