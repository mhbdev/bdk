import { DatabaseDunningService } from '../services/database-dunning-service';
import { DatabasePaymentService } from '../services/database-payment-service';
import { SizPayProvider } from '../provider/sizpay-provider';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from '../strategies/default-strategy';

async function run() {
  const registry = new InMemoryPaymentProviderRegistry();
  const provider = new SizPayProvider();
  registry.register(provider);
  const strategy = new DefaultProviderSelectionStrategy(registry);
  const paymentService = new DatabasePaymentService(registry, strategy);
  const dunningService = new DatabaseDunningService(paymentService);
  console.log('Dunning worker initialized. Scheduling demo attempt...');
  const attempt = await dunningService.handleFailedPayment('demo_payment_id');
  console.log('Scheduled attempt:', attempt);
}

run();