import { describe, it, expect } from 'vitest'
import { ExactArc200AvmScheme } from '../../src/exact-arc200/server/scheme'
import { ExactArc200AvmScheme as ExactArc200Facilitator } from '../../src/exact-arc200/facilitator/scheme'
import {
  WAD_VOI_MAINNET_ID,
  VOI_MAINNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  ARC200_TRANSFER_SELECTOR,
  ARC200_TRANSFER_METHOD_SIG,
  ARC200_DEFAULT_TOKEN_CONFIG,
} from '../../src'
import type { Network } from '@x402/core/types'

describe('exact-arc200 constants', () => {
  it('should have correct method selector bytes', () => {
    expect(ARC200_TRANSFER_SELECTOR).toBeInstanceOf(Uint8Array)
    expect(ARC200_TRANSFER_SELECTOR.length).toBe(4)
    expect(ARC200_TRANSFER_SELECTOR[0]).toBe(0xda)
    expect(ARC200_TRANSFER_SELECTOR[1]).toBe(0x70)
    expect(ARC200_TRANSFER_SELECTOR[2]).toBe(0x25)
    expect(ARC200_TRANSFER_SELECTOR[3]).toBe(0xb9)
  })

  it('should have correct method signature', () => {
    expect(ARC200_TRANSFER_METHOD_SIG).toBe('arc200_transfer(address,uint256)bool')
  })

  it('should have Voi mainnet in ARC200_DEFAULT_TOKEN_CONFIG with WAD', () => {
    const voiConfig = ARC200_DEFAULT_TOKEN_CONFIG[VOI_MAINNET_CAIP2]
    expect(voiConfig).toBeDefined()
    expect(voiConfig.contractId).toBe(WAD_VOI_MAINNET_ID)
    expect(voiConfig.contractId).toBe('47138068')
    expect(voiConfig.name).toBe('WAD')
    expect(voiConfig.decimals).toBe(6)
  })

  it('should not have Algorand mainnet in ARC200_DEFAULT_TOKEN_CONFIG', () => {
    const algoConfig = ARC200_DEFAULT_TOKEN_CONFIG[ALGORAND_MAINNET_CAIP2]
    expect(algoConfig).toBeUndefined()
  })
})

describe('exact-arc200 server scheme', () => {
  describe('parsePrice', () => {
    it('should pass through AssetAmount directly', async () => {
      const scheme = new ExactArc200AvmScheme()
      const result = await scheme.parsePrice(
        { amount: '1500000', asset: '47138068' },
        VOI_MAINNET_CAIP2 as Network,
      )
      expect(result.amount).toBe('1500000')
      expect(result.asset).toBe('47138068')
    })

    it('should throw if AssetAmount has no asset', async () => {
      const scheme = new ExactArc200AvmScheme()
      await expect(
        scheme.parsePrice(
          { amount: '1000000', asset: '' },
          VOI_MAINNET_CAIP2 as Network,
        ),
      ).rejects.toThrow('ARC-200 contract ID must be specified')
    })

    it('should convert decimal amount to WAD on Voi mainnet', async () => {
      const scheme = new ExactArc200AvmScheme()
      const result = await scheme.parsePrice(1.5, VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('1500000')
      expect(result.asset).toBe(WAD_VOI_MAINNET_ID)
      expect(result.extra?.name).toBe('WAD')
      expect(result.extra?.decimals).toBe(6)
    })

    it('should convert string money to WAD on Voi mainnet', async () => {
      const scheme = new ExactArc200AvmScheme()
      const result = await scheme.parsePrice('$0.10', VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('100000')
      expect(result.asset).toBe(WAD_VOI_MAINNET_ID)
    })

    it('should throw for unsupported network without custom parser', async () => {
      const scheme = new ExactArc200AvmScheme()
      await expect(
        scheme.parsePrice(1.0, ALGORAND_MAINNET_CAIP2 as Network),
      ).rejects.toThrow('No default ARC-200 token configured')
    })

    it('should use custom MoneyParser when registered', async () => {
      const scheme = new ExactArc200AvmScheme()

      scheme.registerMoneyParser(async (usdAmount, _network) => {
        return {
          amount: Math.floor(usdAmount * 1e6).toString(),
          asset: '999999',
          extra: { source: 'custom' },
        }
      })

      const result = await scheme.parsePrice(5, ALGORAND_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('5000000')
      expect(result.asset).toBe('999999')
      expect(result.extra?.source).toBe('custom')
    })

    it('should fall through to default when MoneyParser returns null', async () => {
      const scheme = new ExactArc200AvmScheme()

      scheme.registerMoneyParser(async () => null)

      const result = await scheme.parsePrice(2, VOI_MAINNET_CAIP2 as Network)
      expect(result.amount).toBe('2000000')
      expect(result.asset).toBe(WAD_VOI_MAINNET_ID)
    })

    it('should throw on invalid money format', async () => {
      const scheme = new ExactArc200AvmScheme()
      await expect(
        scheme.parsePrice('not-a-number', VOI_MAINNET_CAIP2 as Network),
      ).rejects.toThrow('Invalid money format')
    })
  })

  describe('enhancePaymentRequirements', () => {
    it('should add decimals from stablecoin config', async () => {
      const scheme = new ExactArc200AvmScheme()
      const base = {
        scheme: 'exact-arc200',
        network: VOI_MAINNET_CAIP2 as Network,
        asset: WAD_VOI_MAINNET_ID,
        amount: '1000000',
        payTo: 'ADDR',
        maxTimeoutSeconds: 3600,
      }
      const result = await scheme.enhancePaymentRequirements(
        base,
        { x402Version: 2, scheme: 'exact-arc200', network: VOI_MAINNET_CAIP2 as Network },
        [],
      )
      expect(result.extra?.decimals).toBe(6)
    })

    it('should add feePayer from supportedKind.extra', async () => {
      const scheme = new ExactArc200AvmScheme()
      const base = {
        scheme: 'exact-arc200',
        network: VOI_MAINNET_CAIP2 as Network,
        asset: WAD_VOI_MAINNET_ID,
        amount: '1000000',
        payTo: 'ADDR',
        maxTimeoutSeconds: 3600,
      }
      const result = await scheme.enhancePaymentRequirements(
        base,
        {
          x402Version: 2,
          scheme: 'exact-arc200',
          network: VOI_MAINNET_CAIP2 as Network,
          extra: { feePayer: 'FEE_PAYER_ADDR' },
        },
        [],
      )
      expect(result.extra?.feePayer).toBe('FEE_PAYER_ADDR')
    })
  })
})

describe('exact-arc200 facilitator scheme', () => {
  const mockSigner = {
    getAddresses: () =>
      ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'] as readonly string[],
    signTransaction: async () => new Uint8Array(),
    getAlgodClient: () => ({}),
    simulateTransactions: async () => ({}),
    sendTransactions: async () => '',
    waitForConfirmation: async () => ({}),
  }

  it('should have correct scheme name', () => {
    const scheme = new ExactArc200Facilitator(mockSigner)
    expect(scheme.scheme).toBe('exact-arc200')
  })

  it('should return feePayer in getExtra', () => {
    const scheme = new ExactArc200Facilitator(mockSigner)
    const extra = scheme.getExtra('any-network')
    expect(extra?.feePayer).toBe(
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
    )
  })

  it('should return undefined getExtra when no signers', () => {
    const emptySigner = {
      ...mockSigner,
      getAddresses: () => [] as readonly string[],
    }
    const scheme = new ExactArc200Facilitator(emptySigner)
    expect(scheme.getExtra('any-network')).toBeUndefined()
  })

  it('should reject invalid payload format', async () => {
    const scheme = new ExactArc200Facilitator(mockSigner)
    const result = await scheme.verify(
      { x402Version: 2, scheme: 'exact-arc200', payload: { invalid: true } },
      {
        scheme: 'exact-arc200',
        network: VOI_MAINNET_CAIP2 as Network,
        asset: WAD_VOI_MAINNET_ID,
        amount: '1000000',
        payTo: 'ADDR',
        maxTimeoutSeconds: 3600,
      },
    )
    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('Invalid payload format')
  })

  it('should reject group size exceeding maximum', async () => {
    const scheme = new ExactArc200Facilitator(mockSigner)
    const bigGroup = Array(17).fill('dHhuAAA=') // 17 dummy transactions
    const result = await scheme.verify(
      {
        x402Version: 2,
        scheme: 'exact-arc200',
        payload: { paymentGroup: bigGroup, paymentIndex: 0 },
      },
      {
        scheme: 'exact-arc200',
        network: VOI_MAINNET_CAIP2 as Network,
        asset: WAD_VOI_MAINNET_ID,
        amount: '1000000',
        payTo: 'ADDR',
        maxTimeoutSeconds: 3600,
      },
    )
    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('Transaction group exceeds maximum size')
  })

  it('should reject invalid payment index', async () => {
    const scheme = new ExactArc200Facilitator(mockSigner)
    const result = await scheme.verify(
      {
        x402Version: 2,
        scheme: 'exact-arc200',
        payload: { paymentGroup: ['dHhuAAA='], paymentIndex: 5 },
      },
      {
        scheme: 'exact-arc200',
        network: VOI_MAINNET_CAIP2 as Network,
        asset: WAD_VOI_MAINNET_ID,
        amount: '1000000',
        payTo: 'ADDR',
        maxTimeoutSeconds: 3600,
      },
    )
    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('Payment index out of bounds')
  })
})
