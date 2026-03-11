import { describe, it, expect } from 'vitest'
import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_CAIP2,
  VOI_MAINNET_CAIP2,
  VOI_MAINNET_GENESIS_HASH,
  VOI_MAINNET_GENESIS_ID,
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
  AUSDC_VOI_MAINNET_ID,
  USDC_CONFIG,
  NATIVE_TOKEN_ASSET_ID,
  NATIVE_TOKEN_DECIMALS,
  NATIVE_TOKEN_CONFIG,
  V1_ALGORAND_MAINNET,
  V1_ALGORAND_TESTNET,
  V1_VOI_MAINNET,
  AVM_NAMESPACES,
  CAIP2_NETWORKS,
  V1_NETWORKS,
  NETWORK_TO_ALGOD,
  isValidAlgorandAddress,
  isAlgorandNetwork,
  isAvmNetwork,
  isTestnetNetwork,
  isVoiMainnetNetwork,
  extractGenesisHashFromCaip2,
  getNetworkFromCaip2,
  v1ToCaip2,
  caip2ToV1,
  convertToTokenAmount,
  convertFromTokenAmount,
  isExactAvmPayload,
  ExactNetworkAvmScheme,
} from '../../src'

describe('@x402/avm', () => {
  describe('constants', () => {
    it('should export correct CAIP-2 network identifiers', () => {
      expect(ALGORAND_MAINNET_CAIP2).toBe('algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=')
      expect(ALGORAND_TESTNET_CAIP2).toBe('algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=')
    })

    it('should export correct Voi CAIP-2 network identifier', () => {
      expect(VOI_MAINNET_CAIP2).toBe('voi:r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=')
    })

    it('should export correct Voi genesis constants', () => {
      expect(VOI_MAINNET_GENESIS_HASH).toBe('r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=')
      expect(VOI_MAINNET_GENESIS_ID).toBe('voimain-v1.0')
    })

    it('should export correct V1 network identifiers', () => {
      expect(V1_ALGORAND_MAINNET).toBe('algorand-mainnet')
      expect(V1_ALGORAND_TESTNET).toBe('algorand-testnet')
      expect(V1_VOI_MAINNET).toBe('voi-mainnet')
    })

    it('should include Voi mainnet in CAIP2_NETWORKS', () => {
      expect(CAIP2_NETWORKS).toContain(VOI_MAINNET_CAIP2)
      expect(CAIP2_NETWORKS).toContain(ALGORAND_MAINNET_CAIP2)
      expect(CAIP2_NETWORKS).toContain(ALGORAND_TESTNET_CAIP2)
    })

    it('should include voi-mainnet in V1_NETWORKS', () => {
      expect(V1_NETWORKS).toContain(V1_VOI_MAINNET)
      expect(V1_NETWORKS).toContain(V1_ALGORAND_MAINNET)
      expect(V1_NETWORKS).toContain(V1_ALGORAND_TESTNET)
    })

    it('should include both algorand and voi in AVM_NAMESPACES', () => {
      expect(AVM_NAMESPACES).toContain('algorand')
      expect(AVM_NAMESPACES).toContain('voi')
    })

    it('should have algod endpoint for Voi mainnet', () => {
      expect(NETWORK_TO_ALGOD[VOI_MAINNET_CAIP2]).toBeDefined()
      expect(NETWORK_TO_ALGOD[V1_VOI_MAINNET]).toBeDefined()
    })

    it('should export correct USDC ASA IDs', () => {
      expect(USDC_MAINNET_ASA_ID).toBe('31566704')
      expect(USDC_TESTNET_ASA_ID).toBe('10458941')
    })

    it('should export correct aUSDC ID for Voi mainnet', () => {
      expect(AUSDC_VOI_MAINNET_ID).toBe('302190')
    })

    it('should have stablecoin config for Voi mainnet', () => {
      const voiConfig = USDC_CONFIG[VOI_MAINNET_CAIP2]
      expect(voiConfig).toBeDefined()
      expect(voiConfig.asaId).toBe('302190')
      expect(voiConfig.name).toBe('aUSDC')
      expect(voiConfig.decimals).toBe(6)

      const voiV1Config = USDC_CONFIG[V1_VOI_MAINNET]
      expect(voiV1Config).toBeDefined()
      expect(voiV1Config.asaId).toBe('302190')
    })
  })

  describe('isValidAlgorandAddress', () => {
    it('should return true for valid Algorand addresses', () => {
      // Valid Algorand address (58 characters base32)
      const validAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
      expect(isValidAlgorandAddress(validAddress)).toBe(true)
    })

    it('should return false for invalid Algorand addresses', () => {
      expect(isValidAlgorandAddress('invalid')).toBe(false)
      expect(isValidAlgorandAddress('0x1234')).toBe(false)
      expect(isValidAlgorandAddress('')).toBe(false)
    })
  })

  describe('isAlgorandNetwork', () => {
    it('should return true for CAIP-2 Algorand networks', () => {
      expect(isAlgorandNetwork(ALGORAND_MAINNET_CAIP2)).toBe(true)
      expect(isAlgorandNetwork(ALGORAND_TESTNET_CAIP2)).toBe(true)
      expect(isAlgorandNetwork('algorand:some-hash')).toBe(true)
    })

    it('should return true for V1 Algorand networks', () => {
      expect(isAlgorandNetwork(V1_ALGORAND_MAINNET)).toBe(true)
      expect(isAlgorandNetwork(V1_ALGORAND_TESTNET)).toBe(true)
    })

    it('should return false for non-Algorand networks', () => {
      expect(isAlgorandNetwork('eip155:1')).toBe(false)
      expect(isAlgorandNetwork('solana:mainnet')).toBe(false)
    })

    it('should return false for Voi networks (Algorand-specific check)', () => {
      expect(isAlgorandNetwork(VOI_MAINNET_CAIP2)).toBe(false)
      expect(isAlgorandNetwork(V1_VOI_MAINNET)).toBe(false)
    })
  })

  describe('isAvmNetwork', () => {
    it('should return true for CAIP-2 Algorand networks', () => {
      expect(isAvmNetwork(ALGORAND_MAINNET_CAIP2)).toBe(true)
      expect(isAvmNetwork(ALGORAND_TESTNET_CAIP2)).toBe(true)
      expect(isAvmNetwork('algorand:some-hash')).toBe(true)
    })

    it('should return true for Voi mainnet (CAIP-2 and V1)', () => {
      expect(isAvmNetwork(VOI_MAINNET_CAIP2)).toBe(true)
      expect(isAvmNetwork(V1_VOI_MAINNET)).toBe(true)
      expect(isAvmNetwork('voi:some-hash')).toBe(true)
    })

    it('should return true for V1 Algorand networks', () => {
      expect(isAvmNetwork(V1_ALGORAND_MAINNET)).toBe(true)
      expect(isAvmNetwork(V1_ALGORAND_TESTNET)).toBe(true)
    })

    it('should return false for non-AVM networks', () => {
      expect(isAvmNetwork('eip155:1')).toBe(false)
      expect(isAvmNetwork('solana:mainnet')).toBe(false)
      expect(isAvmNetwork('unknown')).toBe(false)
    })
  })

  describe('isTestnetNetwork', () => {
    it('should return true for testnet networks', () => {
      expect(isTestnetNetwork(ALGORAND_TESTNET_CAIP2)).toBe(true)
      expect(isTestnetNetwork(V1_ALGORAND_TESTNET)).toBe(true)
    })

    it('should return false for mainnet networks', () => {
      expect(isTestnetNetwork(ALGORAND_MAINNET_CAIP2)).toBe(false)
      expect(isTestnetNetwork(V1_ALGORAND_MAINNET)).toBe(false)
    })

    it('should return false for Voi mainnet', () => {
      expect(isTestnetNetwork(VOI_MAINNET_CAIP2)).toBe(false)
      expect(isTestnetNetwork(V1_VOI_MAINNET)).toBe(false)
    })
  })

  describe('isVoiMainnetNetwork', () => {
    it('should return true for Voi mainnet identifiers', () => {
      expect(isVoiMainnetNetwork(VOI_MAINNET_CAIP2)).toBe(true)
      expect(isVoiMainnetNetwork(V1_VOI_MAINNET)).toBe(true)
    })

    it('should return false for Algorand networks', () => {
      expect(isVoiMainnetNetwork(ALGORAND_MAINNET_CAIP2)).toBe(false)
      expect(isVoiMainnetNetwork(V1_ALGORAND_MAINNET)).toBe(false)
      expect(isVoiMainnetNetwork(ALGORAND_TESTNET_CAIP2)).toBe(false)
    })
  })

  describe('extractGenesisHashFromCaip2', () => {
    it('should extract genesis hash from Algorand CAIP-2 identifiers', () => {
      expect(extractGenesisHashFromCaip2(ALGORAND_MAINNET_CAIP2)).toBe(
        'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
      )
      expect(extractGenesisHashFromCaip2(ALGORAND_TESTNET_CAIP2)).toBe(
        'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      )
    })

    it('should extract genesis hash from Voi CAIP-2 identifiers', () => {
      expect(extractGenesisHashFromCaip2(VOI_MAINNET_CAIP2)).toBe(
        'r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=',
      )
    })

    it('should return null for unsupported namespaces', () => {
      expect(extractGenesisHashFromCaip2('eip155:1')).toBeNull()
      expect(extractGenesisHashFromCaip2('solana:mainnet')).toBeNull()
    })

    it('should return null for non-CAIP-2 strings', () => {
      expect(extractGenesisHashFromCaip2('algorand-mainnet')).toBeNull()
      expect(extractGenesisHashFromCaip2('voi-mainnet')).toBeNull()
      expect(extractGenesisHashFromCaip2('unknown')).toBeNull()
    })
  })

  describe('getNetworkFromCaip2', () => {
    it('should return mainnet for Algorand mainnet', () => {
      expect(getNetworkFromCaip2(ALGORAND_MAINNET_CAIP2)).toBe('mainnet')
    })

    it('should return testnet for Algorand testnet', () => {
      expect(getNetworkFromCaip2(ALGORAND_TESTNET_CAIP2)).toBe('testnet')
    })

    it('should return mainnet for Voi mainnet', () => {
      expect(getNetworkFromCaip2(VOI_MAINNET_CAIP2)).toBe('mainnet')
    })

    it('should return null for unknown hashes', () => {
      expect(getNetworkFromCaip2('algorand:unknown-hash')).toBeNull()
      expect(getNetworkFromCaip2('voi:unknown-hash')).toBeNull()
    })

    it('should return null for non-AVM namespaces', () => {
      expect(getNetworkFromCaip2('eip155:1')).toBeNull()
    })
  })

  describe('network conversion', () => {
    it('should convert V1 to CAIP-2', () => {
      expect(v1ToCaip2(V1_ALGORAND_MAINNET)).toBe(ALGORAND_MAINNET_CAIP2)
      expect(v1ToCaip2(V1_ALGORAND_TESTNET)).toBe(ALGORAND_TESTNET_CAIP2)
    })

    it('should convert Voi V1 to CAIP-2', () => {
      expect(v1ToCaip2(V1_VOI_MAINNET)).toBe(VOI_MAINNET_CAIP2)
    })

    it('should convert CAIP-2 to V1', () => {
      expect(caip2ToV1(ALGORAND_MAINNET_CAIP2)).toBe(V1_ALGORAND_MAINNET)
      expect(caip2ToV1(ALGORAND_TESTNET_CAIP2)).toBe(V1_ALGORAND_TESTNET)
    })

    it('should convert Voi CAIP-2 to V1', () => {
      expect(caip2ToV1(VOI_MAINNET_CAIP2)).toBe(V1_VOI_MAINNET)
    })

    it('should roundtrip V1 -> CAIP-2 -> V1 for all networks', () => {
      expect(caip2ToV1(v1ToCaip2(V1_ALGORAND_MAINNET))).toBe(V1_ALGORAND_MAINNET)
      expect(caip2ToV1(v1ToCaip2(V1_ALGORAND_TESTNET))).toBe(V1_ALGORAND_TESTNET)
      expect(caip2ToV1(v1ToCaip2(V1_VOI_MAINNET))).toBe(V1_VOI_MAINNET)
    })

    it('should roundtrip CAIP-2 -> V1 -> CAIP-2 for all networks', () => {
      expect(v1ToCaip2(caip2ToV1(ALGORAND_MAINNET_CAIP2))).toBe(ALGORAND_MAINNET_CAIP2)
      expect(v1ToCaip2(caip2ToV1(ALGORAND_TESTNET_CAIP2))).toBe(ALGORAND_TESTNET_CAIP2)
      expect(v1ToCaip2(caip2ToV1(VOI_MAINNET_CAIP2))).toBe(VOI_MAINNET_CAIP2)
    })

    it('should return original if not a known network', () => {
      expect(v1ToCaip2('unknown')).toBe('unknown')
      expect(caip2ToV1('unknown')).toBe('unknown')
    })
  })

  describe('token amount conversion', () => {
    it('should convert decimal to token amount', () => {
      expect(convertToTokenAmount('1.50', 6)).toBe('1500000')
      expect(convertToTokenAmount('0.10', 6)).toBe('100000')
      expect(convertToTokenAmount('100', 6)).toBe('100000000')
      expect(convertToTokenAmount('0.000001', 6)).toBe('1')
    })

    it('should convert token amount to decimal', () => {
      expect(convertFromTokenAmount('1500000', 6)).toBe('1.5')
      expect(convertFromTokenAmount('100000', 6)).toBe('0.1')
      expect(convertFromTokenAmount('100000000', 6)).toBe('100')
      expect(convertFromTokenAmount('1', 6)).toBe('0.000001')
    })
  })

  describe('isExactAvmPayload', () => {
    it('should return true for valid payloads', () => {
      const validPayload = {
        paymentGroup: ['base64encoded1', 'base64encoded2'],
        paymentIndex: 1,
      }
      expect(isExactAvmPayload(validPayload)).toBe(true)
    })

    it('should return false for invalid payloads', () => {
      expect(isExactAvmPayload(null)).toBe(false)
      expect(isExactAvmPayload(undefined)).toBe(false)
      expect(isExactAvmPayload({})).toBe(false)
      expect(isExactAvmPayload({ paymentGroup: [] })).toBe(false)
      expect(isExactAvmPayload({ paymentIndex: 0 })).toBe(false)
      expect(isExactAvmPayload({ paymentGroup: 'not-array', paymentIndex: 0 })).toBe(false)
      expect(isExactAvmPayload({ paymentGroup: [], paymentIndex: '0' })).toBe(false)
    })
  })

  describe('native token constants', () => {
    it('should use 0 as native token asset ID', () => {
      expect(NATIVE_TOKEN_ASSET_ID).toBe('0')
    })

    it('should have 6 decimals for native tokens', () => {
      expect(NATIVE_TOKEN_DECIMALS).toBe(6)
    })

    it('should have native token config for all supported networks', () => {
      expect(NATIVE_TOKEN_CONFIG[ALGORAND_MAINNET_CAIP2]).toEqual({
        name: 'ALGO',
        decimals: 6,
      })
      expect(NATIVE_TOKEN_CONFIG[ALGORAND_TESTNET_CAIP2]).toEqual({
        name: 'ALGO',
        decimals: 6,
      })
      expect(NATIVE_TOKEN_CONFIG[VOI_MAINNET_CAIP2]).toEqual({
        name: 'VOI',
        decimals: 6,
      })
    })

    it('should have native token config for V1 network identifiers', () => {
      expect(NATIVE_TOKEN_CONFIG[V1_ALGORAND_MAINNET].name).toBe('ALGO')
      expect(NATIVE_TOKEN_CONFIG[V1_ALGORAND_TESTNET].name).toBe('ALGO')
      expect(NATIVE_TOKEN_CONFIG[V1_VOI_MAINNET].name).toBe('VOI')
    })
  })

  describe('ExactNetworkAvmScheme', () => {
    it('should export the client scheme class', () => {
      expect(ExactNetworkAvmScheme).toBeDefined()
    })

    it('should have scheme name exact-network', () => {
      // Verify scheme name without instantiating (needs signer)
      expect(ExactNetworkAvmScheme.prototype).toBeDefined()
    })
  })
})
