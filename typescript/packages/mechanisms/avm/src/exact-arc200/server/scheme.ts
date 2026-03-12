/**
 * AVM Server Scheme for Exact-ARC200 Payment Protocol
 *
 * Parses prices and builds payment requirements for ARC-200 token transfers.
 * Default stablecoin is WAD on Voi; other networks require explicit AssetAmount
 * or a registered MoneyParser.
 */

import type {
  AssetAmount,
  Network,
  PaymentRequirements,
  Price,
  SchemeNetworkServer,
  MoneyParser,
} from '@x402/core/types'
import { ARC200_DEFAULT_TOKEN_CONFIG } from '../../constants'

export class ExactArc200AvmScheme implements SchemeNetworkServer {
  readonly scheme = 'exact-arc200'
  private moneyParsers: MoneyParser[] = []

  /**
   * Register a custom money parser in the parser chain.
   *
   * @example
   * ```typescript
   * avmServer.registerMoneyParser(async (amount, network) => {
   *   // Custom ARC-200 token conversion
   *   const contractId = getPreferredArc200Token(network);
   *   return {
   *     amount: Math.floor(amount * 1e6).toString(),
   *     asset: contractId,
   *   };
   * });
   * ```
   */
  registerMoneyParser(parser: MoneyParser): ExactArc200AvmScheme {
    this.moneyParsers.push(parser)
    return this
  }

  async parsePrice(price: Price, network: Network): Promise<AssetAmount> {
    if (typeof price === 'object' && price !== null && 'amount' in price) {
      if (!price.asset) {
        throw new Error(`ARC-200 contract ID must be specified for AssetAmount on network ${network}`)
      }
      return {
        amount: price.amount,
        asset: price.asset,
        extra: price.extra || {},
      }
    }

    const amount = this.parseMoneyToDecimal(price)

    for (const parser of this.moneyParsers) {
      const result = await parser(amount, network)
      if (result !== null) {
        return result
      }
    }

    return this.defaultMoneyConversion(amount, network)
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

    const tokenConfig = ARC200_DEFAULT_TOKEN_CONFIG[supportedKind.network]
    const decimals = tokenConfig?.decimals ?? 6

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

  private defaultMoneyConversion(amount: number, network: Network): AssetAmount {
    const assetInfo = this.getDefaultAsset(network)
    const tokenAmount = this.convertToTokenAmount(amount.toString(), assetInfo.decimals)

    return {
      amount: tokenAmount,
      asset: assetInfo.contractId,
      extra: {
        name: assetInfo.name,
        decimals: assetInfo.decimals,
      },
    }
  }

  private convertToTokenAmount(decimalAmount: string, decimals: number): string {
    const amount = parseFloat(decimalAmount)
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${decimalAmount}`)
    }

    const [intPart, decPart = ''] = String(amount).split('.')
    const paddedDec = decPart.padEnd(decimals, '0').slice(0, decimals)
    const tokenAmount = (intPart + paddedDec).replace(/^0+/, '') || '0'

    return tokenAmount
  }

  private getDefaultAsset(network: Network): {
    contractId: string
    name: string
    decimals: number
  } {
    const assetInfo = ARC200_DEFAULT_TOKEN_CONFIG[network]
    if (!assetInfo) {
      throw new Error(
        `No default ARC-200 token configured for network ${network}. ` +
          'Provide an explicit AssetAmount or register a MoneyParser.',
      )
    }

    return assetInfo
  }
}
