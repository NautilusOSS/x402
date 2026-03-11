/**
 * @module @x402/avm - x402 Payment Protocol AVM Implementation
 *
 * This module provides the AVM-specific implementation of the x402 payment protocol.
 * Supports all AVM-compatible networks: Algorand (mainnet/testnet) and Voi (mainnet).
 *
 * @example Client signer:
 * ```typescript
 * import { toClientAvmSigner } from "@x402/avm";
 *
 * const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
 * ```
 *
 * @example Facilitator signer:
 * ```typescript
 * import { toFacilitatorAvmSigner } from "@x402/avm";
 *
 * const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!);
 * ```
 */

// Exact scheme client
export { ExactAvmScheme } from './exact'

// Signer helpers and interfaces
export {
  isAvmSignerWallet,
  toClientAvmSigner,
  toFacilitatorAvmSigner,
  getAlgokitSigner,
  ALGOKIT_SIGNER,
} from './signer'
export type {
  ClientAvmSigner,
  ClientAvmConfig,
  FacilitatorAvmSigner,
  FacilitatorAvmSignerConfig,
} from './signer'

// Re-export algokit-utils signer types for consumers who want native interop
export type {
  AddressWithTransactionSigner,
  AddressWithSigners,
  TransactionSigner,
} from '@algorandfoundation/algokit-utils/transact'

// Types
export type {
  ExactAvmPayloadV1,
  ExactAvmPayloadV2,
} from './types'
export { isExactAvmPayload } from './types'

// Constants
export {
  // AVM Namespaces
  AVM_NAMESPACES,
  // CAIP-2 Network Identifiers
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_CAIP2,
  VOI_MAINNET_CAIP2,
  CAIP2_NETWORKS,
  // Genesis Hashes & IDs
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_GENESIS_HASH,
  VOI_MAINNET_GENESIS_HASH,
  VOI_MAINNET_GENESIS_ID,
  // V1 Network Identifiers
  V1_ALGORAND_MAINNET,
  V1_ALGORAND_TESTNET,
  V1_VOI_MAINNET,
  V1_NETWORKS,
  V1_TO_CAIP2,
  CAIP2_TO_V1,
  // Stablecoin Configuration
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
  AUSDC_VOI_MAINNET_ID,
  USDC_DECIMALS,
  USDC_CONFIG,
  // Algod Endpoints
  DEFAULT_ALGOD_MAINNET,
  DEFAULT_ALGOD_TESTNET,
  DEFAULT_ALGOD_VOI_MAINNET,
  NETWORK_TO_ALGOD,
  // Transaction Limits
  MAX_ATOMIC_GROUP_SIZE,
  MIN_TXN_FEE,
  MAX_REASONABLE_FEE,
  // Address Validation
  ALGORAND_ADDRESS_REGEX,
} from './constants'

// Re-export algokit-utils constants that consumers may need
export {
  MAX_TRANSACTION_GROUP_SIZE,
  ALGORAND_ADDRESS_LENGTH,
} from '@algorandfoundation/algokit-utils/common'
export { ALGORAND_MIN_TX_FEE } from '@algorandfoundation/algokit-utils/amount'

// Utilities
export {
  encodeTransaction,
  decodeTransaction,
  decodeSignedTransaction,
  decodeUnsignedTransaction,
  isValidAlgorandAddress,
  getSenderFromTransaction,
  convertToTokenAmount,
  convertFromTokenAmount,
  extractGenesisHashFromCaip2,
  getNetworkFromCaip2,
  isAvmNetwork,
  isAlgorandNetwork,
  isTestnetNetwork,
  isVoiMainnetNetwork,
  v1ToCaip2,
  caip2ToV1,
  getGenesisHashFromTransaction,
  validateGroupId,
  getTransactionId,
  hasSignature,
} from './utils'
