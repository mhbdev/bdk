import { ProviderSelectionStrategy, ProviderSelectionContext } from '@mhbdev/bdk/providers';
import { PaymentProvider } from '@mhbdev/bdk/core';
import { InMemoryPaymentProviderRegistry } from '../registry/in-memory-registry';

export class DefaultProviderSelectionStrategy extends ProviderSelectionStrategy {
  constructor(private registry: InMemoryPaymentProviderRegistry) { super(); }
  async selectProvider(context: ProviderSelectionContext): Promise<PaymentProvider> {
    // Single provider for demo; extend with country/amount routing if needed
    return this.registry.getDefaultProvider();
  }
}