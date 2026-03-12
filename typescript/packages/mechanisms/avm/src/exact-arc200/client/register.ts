/**
 * AVM Client Registration for Exact-ARC200 Payment Protocol
 */

import { x402Client } from '@x402/core/client'
import type { Network } from '@x402/core/types'
import type { ClientAvmSigner, ClientAvmConfig } from '../../signer'
import { ExactArc200AvmScheme } from './scheme'

export interface ExactArc200ClientConfig {
  signer: ClientAvmSigner
  algodConfig?: ClientAvmConfig
  networks?: Network[]
}

/**
 * Registers exact-arc200 AVM schemes to an x402Client.
 */
export function registerExactArc200AvmScheme(
  client: x402Client,
  config: ExactArc200ClientConfig,
): x402Client {
  const scheme = new ExactArc200AvmScheme(config.signer, config.algodConfig)

  if (config.networks && config.networks.length > 0) {
    config.networks.forEach(network => {
      client.register(network, scheme)
    })
  } else {
    client.register('algorand:*', scheme)
    client.register('voi:*', scheme)
  }

  return client
}
