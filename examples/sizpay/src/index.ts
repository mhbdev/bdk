import { SizPayProvider } from './provider/sizpay-provider';
import { InMemoryPaymentProviderRegistry } from './registry/in-memory-registry';
import { DefaultProviderSelectionStrategy } from './strategies/default-strategy';
import { DatabasePaymentService } from './services/database-payment-service';
import { Money } from '@mhbdev/bdk/core';
import { returnUrl } from './config';

async function main() {
  const registry = new InMemoryPaymentProviderRegistry();
  const sizpay = new SizPayProvider();
  registry.register(sizpay);
  const strategy = new DefaultProviderSelectionStrategy(registry);

  const paymentService = new DatabasePaymentService(registry, strategy);

  const pmId = 'pm_default_customer_1';
  const amount: Money = { amount: 10000, currency: 'IRT' };
  const payment = await paymentService.process('customer_1', amount, pmId, { description: 'Demo payment', metadata: { returnUrl } });
  console.log('Redirect to:', (payment.metadata as any)?.redirectUrl);
}

main();