import { Currency } from '../src/core/models/types';
import { CurrencyConversionService, CurrencyRateProvider } from '../src/services/currency/CurrencyConversionService';

class CoinGeckoRateProvider implements CurrencyRateProvider {
  async getRate(from: Currency, to: Currency): Promise<number> {
    // Example supports USD as the platform base currency
    if (to !== 'USD') throw new Error('Example provider supports only USD as target');
    const idMap: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether' };
    const id = idMap[from];
    if (!id) throw new Error(`Unsupported currency: ${from}`);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch rate: ${res.status}`);
    const json: any = await res.json();
    const usd = json[id]?.usd;
    if (typeof usd !== 'number') throw new Error('Invalid rate payload');
    // Return USD per 1 unit of from currency (major units)
    return usd;
  }
}

async function main() {
  const provider = new CoinGeckoRateProvider();
  const converter = new CurrencyConversionService({ provider });

  // Convert 0.25 BTC (25,000,000 satoshis) into USD cents using live rate
  const satoshis = 25_000_000;
  const cents = await converter.convert(satoshis, 'BTC', 'USD');
  console.log('Converted cents:', cents);
}

main().catch((e) => console.error(e));