/**
 * AVM Network Constants for x402 Implementation
 *
 * Supports all AVM-compatible networks (Algorand, Voi).
 * CAIP-2 Network Identifiers use the format: <namespace>:<genesis-hash-base64>
 * Genesis hashes uniquely identify each network.
 */

// ============================================================================
// Supported AVM Namespaces
// ============================================================================

/**
 * CAIP-2 namespaces for all supported AVM-compatible networks.
 * Used to validate whether a network identifier belongs to a known AVM chain.
 */
export const AVM_NAMESPACES = ['algorand', 'voi'] as const

// ============================================================================
// CAIP-2 Network Identifiers (V2)
// ============================================================================

/**
 * CAIP-2 network identifier for Algorand Mainnet
 * Format: algorand:<genesis-hash-base64>
 */
export const ALGORAND_MAINNET_CAIP2 = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='

/**
 * CAIP-2 network identifier for Algorand Testnet
 * Format: algorand:<genesis-hash-base64>
 */
export const ALGORAND_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='

/**
 * CAIP-2 network identifier for Voi Mainnet
 * Format: voi:<genesis-hash-base64>
 */
export const VOI_MAINNET_CAIP2 = 'voi:r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk='

/**
 * All supported CAIP-2 network identifiers
 */
export const CAIP2_NETWORKS = [
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_CAIP2,
  VOI_MAINNET_CAIP2,
] as const

// ============================================================================
// Genesis Hashes & IDs
// ============================================================================

/**
 * Algorand Mainnet genesis hash (base64 encoded)
 */
export const ALGORAND_MAINNET_GENESIS_HASH = 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='

/**
 * Algorand Testnet genesis hash (base64 encoded)
 */
export const ALGORAND_TESTNET_GENESIS_HASH = 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='

/**
 * Voi Mainnet genesis hash (base64 encoded)
 */
export const VOI_MAINNET_GENESIS_HASH = 'r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk='

/**
 * Voi Mainnet genesis ID
 */
export const VOI_MAINNET_GENESIS_ID = 'voimain-v1.0'

// ============================================================================
// V1 Network Identifiers (Backward Compatibility)
// ============================================================================

/**
 * V1 network identifier for Algorand Mainnet
 */
export const V1_ALGORAND_MAINNET = 'algorand-mainnet'

/**
 * V1 network identifier for Algorand Testnet
 */
export const V1_ALGORAND_TESTNET = 'algorand-testnet'

/**
 * V1 network identifier for Voi Mainnet
 */
export const V1_VOI_MAINNET = 'voi-mainnet'

/**
 * All V1 network identifiers
 */
export const V1_NETWORKS = [V1_ALGORAND_MAINNET, V1_ALGORAND_TESTNET, V1_VOI_MAINNET] as const

/**
 * Mapping from V1 network identifiers to CAIP-2 identifiers
 */
export const V1_TO_CAIP2: Record<string, string> = {
  [V1_ALGORAND_MAINNET]: ALGORAND_MAINNET_CAIP2,
  [V1_ALGORAND_TESTNET]: ALGORAND_TESTNET_CAIP2,
  [V1_VOI_MAINNET]: VOI_MAINNET_CAIP2,
}

/**
 * Mapping from CAIP-2 identifiers to V1 network identifiers
 */
export const CAIP2_TO_V1: Record<string, string> = {
  [ALGORAND_MAINNET_CAIP2]: V1_ALGORAND_MAINNET,
  [ALGORAND_TESTNET_CAIP2]: V1_ALGORAND_TESTNET,
  [VOI_MAINNET_CAIP2]: V1_VOI_MAINNET,
}

// ============================================================================
// Stablecoin Configuration
//
// Each AVM network maps to its primary USDC-equivalent stablecoin.
// - Algorand: USDC (ASA)
// - Voi: aUSDC (ARC-200 contract, treated as an ASA ID for payment purposes)
// ============================================================================

/**
 * USDC ASA ID on Algorand Mainnet
 *
 * @see https://algoexplorer.io/asset/31566704
 */
export const USDC_MAINNET_ASA_ID = '31566704'

/**
 * USDC ASA ID on Algorand Testnet
 *
 * @see https://testnet.algoexplorer.io/asset/10458941
 */
export const USDC_TESTNET_ASA_ID = '10458941'

/**
 * aUSDC contract ID on Voi Mainnet (ARC-200 bridged USDC)
 */
export const AUSDC_VOI_MAINNET_ID = '302190'

/**
 * USDC decimals (same across all networks)
 */
export const USDC_DECIMALS = 6

/**
 * Stablecoin configuration per network.
 * Maps both CAIP-2 and V1 network identifiers to the default stablecoin.
 */
export const USDC_CONFIG: Record<string, { asaId: string; name: string; decimals: number }> = {
  [ALGORAND_MAINNET_CAIP2]: {
    asaId: USDC_MAINNET_ASA_ID,
    name: 'USDC',
    decimals: USDC_DECIMALS,
  },
  [ALGORAND_TESTNET_CAIP2]: {
    asaId: USDC_TESTNET_ASA_ID,
    name: 'USDC',
    decimals: USDC_DECIMALS,
  },
  [VOI_MAINNET_CAIP2]: {
    asaId: AUSDC_VOI_MAINNET_ID,
    name: 'aUSDC',
    decimals: USDC_DECIMALS,
  },
  // V1 network mappings
  [V1_ALGORAND_MAINNET]: {
    asaId: USDC_MAINNET_ASA_ID,
    name: 'USDC',
    decimals: USDC_DECIMALS,
  },
  [V1_ALGORAND_TESTNET]: {
    asaId: USDC_TESTNET_ASA_ID,
    name: 'USDC',
    decimals: USDC_DECIMALS,
  },
  [V1_VOI_MAINNET]: {
    asaId: AUSDC_VOI_MAINNET_ID,
    name: 'aUSDC',
    decimals: USDC_DECIMALS,
  },
}

// ============================================================================
// Native Token Configuration
//
// Used by the exact-network scheme for payments in ALGO / VOI.
// ============================================================================

/**
 * Conventional asset identifier for native tokens in PaymentRequirements.
 * Native tokens don't have an ASA ID; '0' is used as a sentinel value.
 */
export const NATIVE_TOKEN_ASSET_ID = '0'

/**
 * Native token decimals (6 for both ALGO and VOI — amounts are in micro-units)
 */
export const NATIVE_TOKEN_DECIMALS = 6

/**
 * Native token configuration per network.
 * Maps both CAIP-2 and V1 network identifiers to the native token metadata.
 */
export const NATIVE_TOKEN_CONFIG: Record<string, { name: string; decimals: number }> = {
  [ALGORAND_MAINNET_CAIP2]: { name: 'ALGO', decimals: NATIVE_TOKEN_DECIMALS },
  [ALGORAND_TESTNET_CAIP2]: { name: 'ALGO', decimals: NATIVE_TOKEN_DECIMALS },
  [VOI_MAINNET_CAIP2]: { name: 'VOI', decimals: NATIVE_TOKEN_DECIMALS },
  [V1_ALGORAND_MAINNET]: { name: 'ALGO', decimals: NATIVE_TOKEN_DECIMALS },
  [V1_ALGORAND_TESTNET]: { name: 'ALGO', decimals: NATIVE_TOKEN_DECIMALS },
  [V1_VOI_MAINNET]: { name: 'VOI', decimals: NATIVE_TOKEN_DECIMALS },
}

// ============================================================================
// Algod API Endpoints
// ============================================================================

/**
 * Fallback Algod API endpoint for Algorand Mainnet (AlgoNode)
 * Used when ALGOD_MAINNET_URL environment variable is not set.
 *
 * @see https://algonode.io/
 */
export const FALLBACK_ALGOD_MAINNET = 'https://mainnet-api.algonode.cloud'

/**
 * Fallback Algod API endpoint for Algorand Testnet (AlgoNode)
 * Used when ALGOD_TESTNET_URL environment variable is not set.
 *
 * @see https://algonode.io/
 */
export const FALLBACK_ALGOD_TESTNET = 'https://testnet-api.algonode.cloud'

/**
 * Fallback Algod API endpoint for Voi Mainnet (Nodely)
 * Used when ALGOD_VOI_MAINNET_URL environment variable is not set.
 *
 * @see https://nodely.io/
 */
export const FALLBACK_ALGOD_VOI_MAINNET = 'https://mainnet-api.voi.nodely.dev'

/**
 * Get the Algod API endpoint for Algorand Mainnet.
 * Checks ALGOD_MAINNET_URL environment variable first, falls back to AlgoNode.
 *
 * Set the environment variable to use a custom endpoint:
 * ```
 * ALGOD_MAINNET_URL=https://your-node.example.com
 * ```
 */
export const DEFAULT_ALGOD_MAINNET =
  (typeof process !== 'undefined' && process.env?.ALGOD_MAINNET_URL) || FALLBACK_ALGOD_MAINNET

/**
 * Get the Algod API endpoint for Algorand Testnet.
 * Checks ALGOD_TESTNET_URL environment variable first, falls back to AlgoNode.
 *
 * Set the environment variable to use a custom endpoint:
 * ```
 * ALGOD_TESTNET_URL=https://your-node.example.com
 * ```
 */
export const DEFAULT_ALGOD_TESTNET =
  (typeof process !== 'undefined' && process.env?.ALGOD_TESTNET_URL) || FALLBACK_ALGOD_TESTNET

/**
 * Get the Algod API endpoint for Voi Mainnet.
 * Checks ALGOD_VOI_MAINNET_URL environment variable first, falls back to Nodely.
 *
 * Set the environment variable to use a custom endpoint:
 * ```
 * ALGOD_VOI_MAINNET_URL=https://your-node.example.com
 * ```
 */
export const DEFAULT_ALGOD_VOI_MAINNET =
  (typeof process !== 'undefined' && process.env?.ALGOD_VOI_MAINNET_URL) ||
  FALLBACK_ALGOD_VOI_MAINNET

/**
 * Mapping from network identifiers to Algod endpoints.
 * Endpoints are determined by environment variables if set, otherwise uses fallbacks.
 */
export const NETWORK_TO_ALGOD: Record<string, string> = {
  [ALGORAND_MAINNET_CAIP2]: DEFAULT_ALGOD_MAINNET,
  [ALGORAND_TESTNET_CAIP2]: DEFAULT_ALGOD_TESTNET,
  [VOI_MAINNET_CAIP2]: DEFAULT_ALGOD_VOI_MAINNET,
  [V1_ALGORAND_MAINNET]: DEFAULT_ALGOD_MAINNET,
  [V1_ALGORAND_TESTNET]: DEFAULT_ALGOD_TESTNET,
  [V1_VOI_MAINNET]: DEFAULT_ALGOD_VOI_MAINNET,
}

// ============================================================================
// Transaction Limits
// ============================================================================

/**
 * Maximum number of transactions in an AVM atomic group
 */
export const MAX_ATOMIC_GROUP_SIZE = 16

/**
 * Minimum transaction fee in microAlgos / microVoi
 */
export const MIN_TXN_FEE = 1000

/**
 * Maximum reasonable fee for fee payer transactions (16000 micro-units)
 * Used as a sanity check during verification to prevent fee extraction attacks.
 * AVM fees are flat (min 1000 micro-units per txn), so the fee payer's
 * per-transaction fee should never exceed a small multiple of the minimum.
 */
export const MAX_REASONABLE_FEE = 16000

// ============================================================================
// Address Validation
// ============================================================================

/**
 * AVM address regex (58-character base32 string).
 * Shared across all AVM-compatible networks (Algorand, Voi).
 */
export const ALGORAND_ADDRESS_REGEX = /^[A-Z2-7]{58}$/

/**
 * AVM address length in characters
 */
export const ALGORAND_ADDRESS_LENGTH = 58
