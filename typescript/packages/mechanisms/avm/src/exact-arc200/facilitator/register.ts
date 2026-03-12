/**
 * AVM Facilitator Registration for Exact-ARC200 Payment Protocol
 */

import { x402Facilitator } from '@x402/core/facilitator'
import type { Network } from '@x402/core/types'
import type { FacilitatorAvmSigner } from '../../signer'
import { ExactArc200AvmScheme } from './scheme'

export interface ExactArc200FacilitatorConfig {
  signer: FacilitatorAvmSigner
  networks: Network | Network[]
}

/**
 * Registers exact-arc200 AVM schemes to an x402Facilitator.
 */
export function registerExactArc200AvmScheme(
  facilitator: x402Facilitator,
  config: ExactArc200FacilitatorConfig,
): x402Facilitator {
  facilitator.register(config.networks, new ExactArc200AvmScheme(config.signer))
  return facilitator
}
