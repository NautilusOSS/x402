/**
 * AVM Server Registration for Exact-Network Payment Protocol
 */

import { x402ResourceServer } from '@x402/core/server'
import type { Network } from '@x402/core/types'
import { ExactNetworkAvmScheme } from './scheme'

export interface ExactNetworkServerConfig {
  networks?: Network[]
}

/**
 * Registers exact-network AVM schemes to an x402ResourceServer.
 */
export function registerExactNetworkAvmScheme(
  server: x402ResourceServer,
  config: ExactNetworkServerConfig = {},
): x402ResourceServer {
  const scheme = new ExactNetworkAvmScheme()

  if (config.networks && config.networks.length > 0) {
    config.networks.forEach(network => {
      server.register(network, scheme)
    })
  } else {
    server.register('algorand:*', scheme)
    server.register('voi:*', scheme)
  }

  return server
}
