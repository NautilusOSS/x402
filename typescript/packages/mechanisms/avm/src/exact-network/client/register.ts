/**
 * AVM Client Registration for Exact-Network Payment Protocol
 */

import { x402Client } from '@x402/core/client'
import type { Network } from '@x402/core/types'
import type { ClientAvmSigner, ClientAvmConfig } from '../../signer'
import { ExactNetworkAvmScheme } from './scheme'

export interface ExactNetworkClientConfig {
  signer: ClientAvmSigner
  algodConfig?: ClientAvmConfig
  networks?: Network[]
}

/**
 * Registers exact-network AVM schemes to an x402Client.
 */
export function registerExactNetworkAvmScheme(
  client: x402Client,
  config: ExactNetworkClientConfig,
): x402Client {
  const scheme = new ExactNetworkAvmScheme(config.signer, config.algodConfig)

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
