/**
 * AVM Facilitator Registration for Exact-Network Payment Protocol
 */

import { x402Facilitator } from '@x402/core/facilitator'
import type { Network } from '@x402/core/types'
import type { FacilitatorAvmSigner } from '../../signer'
import { ExactNetworkAvmScheme } from './scheme'

export interface ExactNetworkFacilitatorConfig {
  signer: FacilitatorAvmSigner
  networks: Network | Network[]
}

/**
 * Registers exact-network AVM schemes to an x402Facilitator.
 */
export function registerExactNetworkAvmScheme(
  facilitator: x402Facilitator,
  config: ExactNetworkFacilitatorConfig,
): x402Facilitator {
  facilitator.register(config.networks, new ExactNetworkAvmScheme(config.signer))
  return facilitator
}
