import { describe, it, expect } from 'vitest'
import { ExactNetworkAvmScheme } from '../../src/exact-network/server/scheme'
import { ExactNetworkAvmScheme as ExactNetworkFacilitator } from '../../src/exact-network/facilitator/scheme'
import {
  ALGORAND_MAINNET_CAIP2,
  VOI_MAINNET_CAIP2,
  NATIVE_TOKEN_ASSET_ID,
} from '../../src'
import type { Network } from '@x402/core/types'

describe('exact-network server scheme', () => {
  describe('parsePrice', () => {
    it('should pass through AssetAmount directly', async () => {
      const scheme = new ExactNetworkAvmScheme()
      const result = await scheme.parsePrice(
        { amount: '5000000', asset: '0' },
        VOI_MAINNET_CAIP2 as Network,
      )
      expect(result.amount).toBe('5000000')
      expect(result.asset).toBe('0')
    })

    it('should default asset to native token when not specified in AssetAmount', async () => {
      const scheme = new ExactNetworkAvmScheme()
      const result = await scheme.parsePrice(
        { amount: '1000000', asset: '' },
        VOI_MAINNET_CAIP2 as Network,
      )
      expect(result.asset).toBe(NATIVE_TOKEN_ASSET_ID)
    })

    it('should convert decimal amount to micro-units via default conversion', async () => {
      const scheme = new ExactNetworkAvmScheme()
      const result = await scheme.parsePrice(10, VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('10000000')
      expect(result.asset).toBe(NATIVE_TOKEN_ASSET_ID)
      expect(result.extra?.name).toBe('VOI')
    })

    it('should convert decimal amount for Algorand mainnet', async () => {
      const scheme = new ExactNetworkAvmScheme()
      const result = await scheme.parsePrice(1.5, ALGORAND_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('1500000')
      expect(result.asset).toBe(NATIVE_TOKEN_ASSET_ID)
      expect(result.extra?.name).toBe('ALGO')
    })

    it('should use custom MoneyParser when registered', async () => {
      const scheme = new ExactNetworkAvmScheme()

      scheme.registerMoneyParser(async (usdAmount, _network) => {
        const voiPerUsd = 20
        const nativeAmount = usdAmount * voiPerUsd
        return {
          amount: Math.floor(nativeAmount * 1e6).toString(),
          asset: NATIVE_TOKEN_ASSET_ID,
          extra: { source: 'oracle' },
        }
      })

      const result = await scheme.parsePrice(5, VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('100000000') // 5 USD * 20 VOI/USD * 1e6
      expect(result.extra?.source).toBe('oracle')
    })

    it('should fall through to default when MoneyParser returns null', async () => {
      const scheme = new ExactNetworkAvmScheme()

      scheme.registerMoneyParser(async () => null)

      const result = await scheme.parsePrice(2, VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('2000000')
      expect(result.asset).toBe(NATIVE_TOKEN_ASSET_ID)
    })

    it('should handle string money format', async () => {
      const scheme = new ExactNetworkAvmScheme()
      const result = await scheme.parsePrice('$10.50', VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('10500000')
    })
  })
})

describe('exact-network facilitator scheme', () => {
  it('should have correct scheme name', () => {
    const mockSigner = {
      getAddresses: () => ['ADDR'] as readonly string[],
      signTransaction: async () => new Uint8Array(),
      getAlgodClient: () => ({}),
      simulateTransactions: async () => ({}),
      sendTransactions: async () => '',
      waitForConfirmation: async () => ({}),
    }

    const scheme = new ExactNetworkFacilitator(mockSigner)
    expect(scheme.scheme).toBe('exact-network')
  })

  it('should return feePayer in getExtra', () => {
    const mockSigner = {
      getAddresses: () =>
        ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'] as readonly string[],
      signTransaction: async () => new Uint8Array(),
      getAlgodClient: () => ({}),
      simulateTransactions: async () => ({}),
      sendTransactions: async () => '',
      waitForConfirmation: async () => ({}),
    }

    const scheme = new ExactNetworkFacilitator(mockSigner)
    const extra = scheme.getExtra('any-network')
    expect(extra?.feePayer).toBe(
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
    )
  })

  it('should reject invalid payload format', async () => {
    const mockSigner = {
      getAddresses: () => [] as readonly string[],
      signTransaction: async () => new Uint8Array(),
      getAlgodClient: () => ({}),
      simulateTransactions: async () => ({}),
      sendTransactions: async () => '',
      waitForConfirmation: async () => ({}),
    }

    const scheme = new ExactNetworkFacilitator(mockSigner)
    const result = await scheme.verify(
      { x402Version: 2, scheme: 'exact-network', payload: { invalid: true } },
      {
        scheme: 'exact-network',
        network: VOI_MAINNET_CAIP2 as Network,
        asset: NATIVE_TOKEN_ASSET_ID,
        amount: '1000000',
        payTo: 'ADDR',
        maxTimeoutSeconds: 3600,
      },
    )
    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('Invalid payload format')
  })
})
