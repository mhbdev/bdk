import { BillingCore, InMemoryStorage } from '../src';
import { Plan, UsageRecord } from '../src/core/models/types';
import { CurrencyConversionService } from '../src/services/currency/CurrencyConversionService';
import { HybridPricingService } from '../src/services/pricing/HybridPricingService';

async function main() {
  const storage = new InMemoryStorage();
  const core = new BillingCore({ storage });

  // Mixed-currency hybrid plan: base in USD, usage in BTC (priced per operation in satoshis)
  const plan: Plan = {
    id: 'hybrid_fx', productId: 'prod_fx', name: 'Hybrid FX', currency: 'USD',
    pricing: [
      { id: 'price_base_usd', type: 'flat', currency: 'USD', unitAmount: 10_000, billingInterval: 'month' }, // $100 base
      { id: 'price_usage_btc', type: 'usage', currency: 'BTC', unitAmount: 100_000, metric: 'ops' }, // 100k satoshi per op (0.001 BTC)
    ],
    strategy: 'hybrid',
  };

  const usage: UsageRecord[] = [
    { id: 'u1', customerId: 'cust_fx', subscriptionId: 'sub_fx', metric: 'ops', quantity: 250, timestamp: new Date() },
  ];

  // Configure conversion: 1 BTC = $50,000 USD
  const converter = new CurrencyConversionService();
  converter.setRate('BTC', 'USD', 50_000);

  const pricing = new HybridPricingService(converter);
  const out = await pricing.computeChargeWithConversion({
    plan,
    usage,
    periodStart: new Date('2024-08-01'),
    periodEnd: new Date('2024-08-31'),
    targetCurrency: 'USD',
  });

  // usage: 250 ops * 100,000 satoshi = 25,000,000 satoshi = 0.25 BTC -> $12,500
  // total: base $100 + usage $12,500 = $12,600 => 1,260,000 cents
  const invoice = {
    id: `inv_fx_${Date.now()}`,
    customerId: 'cust_fx',
    currency: out.total.currency,
    items: out.items,
    total: out.total.amount,
    status: 'open' as const,
    issuedAt: new Date(),
  };

  await storage.recordInvoice(invoice);
  console.log('Hybrid FX Invoice:', invoice);
}

main().catch((e) => console.error(e));