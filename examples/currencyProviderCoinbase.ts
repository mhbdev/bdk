import { Currency } from '../src/core/models/types';
import { CurrencyConversionService } from '../src/services/currency/CurrencyConversionService';
import { CoinbaseRateProvider } from '../src/services/currency/providers/CoinbaseRateProvider';

async function main() {
  const provider = new CoinbaseRateProvider({ ttlMs: 60_000, maxRetries: 3, backoffMs: 250 });
  const converter = new CurrencyConversionService({ provider });

  // Example 1: Convert 0.02 ETH to USD cents using live rates
  const ethWei = Math.round(0.02 * 1_000_000_000_000_000_000);
  const usdCents = await converter.convert(ethWei, 'ETH', 'USD');
  console.log('ETH->USD cents:', usdCents);

  // Example 2: Convert 500 EUR cents to GBP pennies via multi-fiat
  const eurCents = 500;
  const gbpPennies = await converter.convert(eurCents, 'EUR', 'GBP');
  console.log('EUR->GBP pennies:', gbpPennies);

  // Example 3: Demonstrate inverse computation (if USD->EUR cached, compute EUR->USD via inverse or vice versa)
  const usdToEurRateMinor = await converter.convert(100, 'USD', 'EUR'); // $1 to EUR minor
  const eurToUsdRateMinor = await converter.convert(100, 'EUR', 'USD'); // €1 to USD minor
  console.log('USD->EUR minor for $1:', usdToEurRateMinor);
  console.log('EUR->USD minor for €1:', eurToUsdRateMinor);
}

main().catch((e) => console.error(e));