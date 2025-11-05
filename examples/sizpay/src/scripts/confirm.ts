import { DatabasePaymentService } from '../services/database-payment-service';
import { SizPayProvider } from '../provider/sizpay-provider';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from '../strategies/default-strategy';

// Simulate confirm callback by retrying pending payment using provider transaction id
async function run() {
  const registry = new InMemoryPaymentProviderRegistry();
  const provider = new SizPayProvider();
  registry.register(provider);
  const strategy = new DefaultProviderSelectionStrategy(registry);
  const paymentService = new DatabasePaymentService(registry, strategy);
  const paymentId = process.argv[2];
  if (!paymentId) { console.error('Usage: pnpm run:confirm -- <paymentId>'); process.exit(1); }
  const updated = await paymentService.retry(paymentId);
  console.log('Payment updated:', updated);
}

run();