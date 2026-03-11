/**
 * AVM Client Scheme for Exact-Network Payment Protocol
 *
 * Creates atomic transaction groups for native token (ALGO/VOI) transfers.
 */

import {
  Transaction,
  TransactionType,
  encodeTransactionRaw,
  groupTransactions,
} from '@algorandfoundation/algokit-utils/transact'
import { Address } from '@algorandfoundation/algokit-utils/common'
import type {
  PaymentRequirements,
  SchemeNetworkClient,
  PaymentPayloadResult,
} from '@x402/core/types'
import type { ClientAvmSigner, ClientAvmConfig } from '../../signer'
import type { ExactAvmPayloadV2 } from '../../types'
import { createAlgodClient, encodeTransaction } from '../../utils'
import { DEFAULT_ALGOD_TESTNET } from '../../constants'
import type { AlgodClient } from '@algorandfoundation/algokit-utils/algod-client'

/**
 * AVM client implementation for the exact-network payment scheme.
 *
 * Creates atomic transaction groups with native token payments for x402 payments.
 * Supports optional fee payer transactions for gasless payments.
 */
export class ExactNetworkAvmScheme implements SchemeNetworkClient {
  readonly scheme = 'exact-network'

  constructor(
    private readonly signer: ClientAvmSigner,
    private readonly config?: ClientAvmConfig,
  ) {}

  async createPaymentPayload(
    x402Version: number,
    paymentRequirements: PaymentRequirements,
  ): Promise<PaymentPayloadResult> {
    const { amount, payTo, network, extra } = paymentRequirements

    const algodClient = (this.config?.algodClient ??
      createAlgodClient(
        network,
        this.config?.algodUrl ?? DEFAULT_ALGOD_TESTNET,
        this.config?.algodToken,
      )) as AlgodClient

    const suggestedParams = await algodClient.suggestedParams()

    const feePayer = extra?.feePayer as string | undefined

    const transactions: Transaction[] = []
    let paymentIndex = 0

    const totalTxnCount = feePayer ? 2 : 1
    const minFee = suggestedParams.minFee ?? BigInt(1000)

    // Build fee payer transaction if specified
    if (feePayer) {
      const feePayerTxn = new Transaction({
        type: TransactionType.Payment,
        sender: Address.fromString(feePayer),
        fee: minFee * BigInt(totalTxnCount),
        firstValid: suggestedParams.firstValid,
        lastValid: suggestedParams.lastValid,
        genesisHash: suggestedParams.genesisHash,
        genesisId: suggestedParams.genesisId,
        note: new Uint8Array(Buffer.from(`x402-fee-payer-${Date.now()}`)),
        payment: {
          receiver: Address.fromString(feePayer),
          amount: BigInt(0),
        },
      })
      transactions.push(feePayerTxn)
      paymentIndex = 1
    }

    // Build native token payment transaction
    const paymentFee = feePayer ? BigInt(0) : (suggestedParams.fee ?? minFee)

    const paymentTxn = new Transaction({
      type: TransactionType.Payment,
      sender: Address.fromString(this.signer.address),
      fee: paymentFee,
      firstValid: suggestedParams.firstValid,
      lastValid: suggestedParams.lastValid,
      genesisHash: suggestedParams.genesisHash,
      genesisId: suggestedParams.genesisId,
      note: new Uint8Array(Buffer.from(`x402-payment-v${x402Version}-${Date.now()}`)),
      payment: {
        receiver: Address.fromString(payTo),
        amount: BigInt(amount),
      },
    })
    transactions.push(paymentTxn)

    // Assign group ID if multiple transactions
    let groupedTxns = transactions
    if (transactions.length > 1) {
      groupedTxns = groupTransactions(transactions)
    }

    const encodedTxns = groupedTxns.map(txn => encodeTransactionRaw(txn))

    // Client signs all except fee payer transactions
    const clientIndexes = groupedTxns
      .map((txn, i) => {
        const sender = txn.sender.toString()
        return sender === this.signer.address ? i : -1
      })
      .filter(i => i !== -1)

    console.log('[x402 AVM Client] Creating native payment:', {
      sender: this.signer.address,
      receiver: payTo,
      amount: amount,
      network,
      clientIndexes,
      txnCount: groupedTxns.length,
      hasFeePayer: !!feePayer,
    })

    const signedTxns = await this.signer.signTransactions(encodedTxns, clientIndexes)

    // Build payment group with signed/unsigned transactions
    const paymentGroup: string[] = encodedTxns.map((txnBytes, i) => {
      const signedTxn = signedTxns[i]
      if (signedTxn) {
        return encodeTransaction(signedTxn)
      }
      return encodeTransaction(txnBytes)
    })

    const payload: ExactAvmPayloadV2 = {
      paymentGroup,
      paymentIndex,
    }

    return {
      x402Version,
      payload: payload as unknown as Record<string, unknown>,
    }
  }
}
