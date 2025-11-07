import { BillingCore } from '../src';
import { BillingProvider } from '../src/core/interfaces';
import { BillingEvent, Customer, Invoice, Plan, Subscription, UsageRecord } from '../src/core/models/types';
import { InMemoryStorage } from '../src/storage/inMemory';
import { CurrencyConversionService } from '../src/services/currency/CurrencyConversionService';

class CryptoProvider implements BillingProvider {
  constructor(private opts: { coin: 'BTC' | 'ETH' | 'USDT'; address: string; converter: CurrencyConversionService }) {}

  async createCustomer(data: Customer): Promise<string> {
    return `crypto_cust_${data.id}`;
  }

  async createSubscription(sub: Subscription, _plan: Plan): Promise<Subscription> {
    return { ...sub, externalId: `crypto_sub_${sub.id}` };
  }

  async cancelSubscription(id: string): Promise<void> {
    // No-op example
  }

  async recordUsage(_record: UsageRecord): Promise<void> {
    // No-op example: metered usage may be tracked off-chain or via separate ledger
  }

  async generateInvoice(inv: Invoice): Promise<Invoice> {
    // Convert invoice total from its currency into target coin minor units
    const coin = this.opts.coin;
    // Ensure bidirectional rates are configured (USD->COIN and COIN->USD)
    const coinAmountMinor = await this.opts.converter.convert(inv.total, inv.currency, coin);
    const externalId = `crypto_tx_${Date.now()}`;
    const metadata = {
      ...(inv.metadata ?? {}),
      coin,
      coinAddress: this.opts.address,
      coinAmountMinor,
    };
    return { ...inv, externalId, metadata };
  }

  async handleWebhook(event: any): Promise<BillingEvent> {
    return { id: String(event.id ?? Date.now()), type: 'payment.succeeded', provider: 'crypto', createdAt: new Date(), payload: event };
  }
}

async function main() {
  const storage = new InMemoryStorage();
  const core = new BillingCore({ storage });

  const converter = new CurrencyConversionService();
  // Example fixed rates; real apps should supply a provider for live rates and set both directions
  converter.setRate('BTC', 'USD', 50_000);
  converter.setRate('USD', 'BTC', 1 / 50_000);

  const crypto = new CryptoProvider({ coin: 'BTC', address: 'bc1qexampleaddress', converter });
  core.use('crypto', crypto);
  core.setProvider('crypto');

  const plan: Plan = {
    id: 'flat_usd_plan', productId: 'prod_flat', name: 'Flat USD', currency: 'USD',
    pricing: [ { id: 'flat', type: 'flat', currency: 'USD', unitAmount: 20_000, billingInterval: 'month' } ],
    strategy: 'flat',
  };

  // Generate a simple base-only invoice via strategy
  const invoice = await core.generateInvoiceFromStrategy('cust_crypto', plan, {
    periodStart: new Date('2024-09-01'),
    periodEnd: new Date('2024-09-30'),
  } as any);

  const finalized = await core.finalizeInvoiceWithProvider(invoice);
  console.log('Finalized crypto invoice:', finalized);
}

main().catch((e) => console.error(e));