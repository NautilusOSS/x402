/**
 * AVM Server Registration for Exact-ARC200 Payment Protocol
 */

import { x402ResourceServer } from '@x402/core/server'
import type { Network } from '@x402/core/types'
import { ExactArc200AvmScheme } from './scheme'

export interface ExactArc200ServerConfig {
  networks?: Network[]
}

/**
 * Registers exact-arc200 AVM schemes to an x402ResourceServer.
 */
export function registerExactArc200AvmScheme(
  server: x402ResourceServer,
  config: ExactArc200ServerConfig = {},
): x402ResourceServer {
  const scheme = new ExactArc200AvmScheme()

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
