import { sizpayConfig, returnUrl } from '../config';
import { SizPayProvider } from '../provider/sizpay-provider';
import { DatabasePaymentService } from '../services/database-payment-service';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from '../strategies/default-strategy';
import { Money } from '@mhbdev/bdk/core';

async function run() {
  const registry = new InMemoryPaymentProviderRegistry();
  const provider = new SizPayProvider();
  registry.register(provider);
  const strategy = new DefaultProviderSelectionStrategy(registry);
  const paymentService = new DatabasePaymentService(registry, strategy);
  const amount: Money = { amount: 15000, currency: 'IRT' };
  const pmId = 'pm_default_customer_1';
  const payment = await paymentService.process('customer_1', amount, pmId, { description: 'Test payment', metadata: { returnUrl } });
  console.log('Payment created:', payment);
  console.log('Redirect user to:', (payment.metadata as any)?.redirectUrl);
}

run();