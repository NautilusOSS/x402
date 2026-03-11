/**
 * AVM Server Scheme for Exact-Network Payment Protocol
 *
 * Parses prices and builds payment requirements for native token (ALGO/VOI) transfers.
 * The default money conversion returns micro-units at a 1:1 rate.
 * In practice, callers should register a MoneyParser that converts USD to
 * native token amounts using an oracle feed.
 */

import type {
  AssetAmount,
  Network,
  PaymentRequirements,
  Price,
  SchemeNetworkServer,
  MoneyParser,
} from '@x402/core/types'
import {
  NATIVE_TOKEN_ASSET_ID,
  NATIVE_TOKEN_DECIMALS,
  NATIVE_TOKEN_CONFIG,
} from '../../constants'

export class ExactNetworkAvmScheme implements SchemeNetworkServer {
  readonly scheme = 'exact-network'
  private moneyParsers: MoneyParser[] = []

  /**
   * Register a custom money parser — typically an oracle-based USD-to-native converter.
   *
   * @example
   * ```typescript
   * avmServer.registerMoneyParser(async (usdAmount, network) => {
   *   const rate = await getOracleRate(network); // e.g. 0.05 USD per VOI
   *   const nativeAmount = usdAmount / rate;
   *   return {
   *     amount: Math.floor(nativeAmount * 1e6).toString(),
   *     asset: '0',
   *   };
   * });
   * ```
   */
  registerMoneyParser(parser: MoneyParser): ExactNetworkAvmScheme {
    this.moneyParsers.push(parser)
    return this
  }

  async parsePrice(price: Price, network: Network): Promise<AssetAmount> {
    // If already an AssetAmount, return it directly
    if (typeof price === 'object' && price !== null && 'amount' in price) {
      return {
        amount: price.amount,
        asset: price.asset || NATIVE_TOKEN_ASSET_ID,
        extra: price.extra || {},
      }
    }

    const amount = this.parseMoneyToDecimal(price)

    // Try each custom money parser in order (oracle-based conversion)
    for (const parser of this.moneyParsers) {
      const result = await parser(amount, network)
      if (result !== null) {
        return result
      }
    }

    // Fallback: treat the decimal value as the native token amount directly.
    // This is useful for testing and non-USD-denominated setups.
    // Production deployments should register a MoneyParser with oracle pricing.
    return this.defaultNativeConversion(amount, network)
  }

  enhancePaymentRequirements(
    paymentRequirements: PaymentRequirements,
    supportedKind: {
      x402Version: number
      scheme: string
      network: Network
      extra?: Record<string, unknown>
    },
    extensionKeys: string[],
  ): Promise<PaymentRequirements> {
    void extensionKeys

    const tokenConfig = NATIVE_TOKEN_CONFIG[supportedKind.network]
    const decimals = tokenConfig?.decimals ?? NATIVE_TOKEN_DECIMALS

    const enhanced: PaymentRequirements = {
      ...paymentRequirements,
      extra: {
        ...paymentRequirements.extra,
        decimals,
      },
    }

    if (supportedKind.extra?.feePayer) {
      enhanced.extra = {
        ...enhanced.extra,
        feePayer: supportedKind.extra.feePayer,
      }
    }

    return Promise.resolve(enhanced)
  }

  private parseMoneyToDecimal(money: string | number): number {
    if (typeof money === 'number') {
      return money
    }

    const cleanMoney = money.replace(/^\$/, '').trim()
    const amount = parseFloat(cleanMoney)

    if (isNaN(amount)) {
      throw new Error(`Invalid money format: ${money}`)
    }

    return amount
  }

  /**
   * Default conversion: treat the decimal value as native token amount
   * and convert to micro-units (6 decimals).
   */
  private defaultNativeConversion(amount: number, network: Network): AssetAmount {
    const tokenConfig = NATIVE_TOKEN_CONFIG[network]
    const decimals = tokenConfig?.decimals ?? NATIVE_TOKEN_DECIMALS
    const name = tokenConfig?.name ?? 'NATIVE'

    const [intPart, decPart = ''] = String(amount).split('.')
    const paddedDec = decPart.padEnd(decimals, '0').slice(0, decimals)
    const tokenAmount = (intPart + paddedDec).replace(/^0+/, '') || '0'

    return {
      amount: tokenAmount,
      asset: NATIVE_TOKEN_ASSET_ID,
      extra: {
        name,
        decimals,
      },
    }
  }
}
