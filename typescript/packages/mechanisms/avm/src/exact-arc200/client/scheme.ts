/**
 * AVM Client Scheme for Exact-ARC200 Payment Protocol
 *
 * Creates atomic transaction groups with ARC-200 application calls
 * for x402 payments. The payment transaction calls arc200_transfer
 * on the ARC-200 token contract.
 */

import {
  Transaction,
  TransactionType,
  OnApplicationComplete,
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
import { DEFAULT_ALGOD_TESTNET, ARC200_TRANSFER_SELECTOR, ARC200_DEFAULT_TOKEN_CONFIG } from '../../constants'
import type { AlgodClient } from '@algorandfoundation/algokit-utils/algod-client'

/**
 * AVM client implementation for the exact-arc200 payment scheme.
 *
 * Creates atomic transaction groups with ARC-200 application calls for x402 payments.
 * Supports optional fee payer transactions for gasless payments.
 */
export class ExactArc200AvmScheme implements SchemeNetworkClient {
  readonly scheme = 'exact-arc200'

  constructor(
    private readonly signer: ClientAvmSigner,
    private readonly config?: ClientAvmConfig,
  ) {}

  async createPaymentPayload(
    x402Version: number,
    paymentRequirements: PaymentRequirements,
  ): Promise<PaymentPayloadResult> {
    const { amount, asset, payTo, network, extra } = paymentRequirements

    const algodClient = (this.config?.algodClient ??
      createAlgodClient(
        network,
        this.config?.algodUrl ?? DEFAULT_ALGOD_TESTNET,
        this.config?.algodToken,
      )) as AlgodClient

    const suggestedParams = await algodClient.suggestedParams()

    const contractId = this.getContractId(asset, network)
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

    // Build ARC-200 transfer application call
    const appCallFee = feePayer ? BigInt(0) : (suggestedParams.fee ?? minFee)
    const receiverAddress = Address.fromString(payTo)
    const receiverBytes = receiverAddress.publicKey
    const amountBytes = encodeUint256(BigInt(amount))

    const appCallTxn = new Transaction({
      type: TransactionType.AppCall,
      sender: Address.fromString(this.signer.address),
      fee: appCallFee,
      firstValid: suggestedParams.firstValid,
      lastValid: suggestedParams.lastValid,
      genesisHash: suggestedParams.genesisHash,
      genesisId: suggestedParams.genesisId,
      note: new Uint8Array(Buffer.from(`x402-payment-v${x402Version}-${Date.now()}`)),
      appCall: {
        appId: BigInt(contractId),
        onComplete: OnApplicationComplete.NoOp,
        args: [
          new Uint8Array(ARC200_TRANSFER_SELECTOR),
          receiverBytes,
          amountBytes,
        ],
        accountReferences: [receiverAddress],
      },
    })
    transactions.push(appCallTxn)

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

    console.log('[x402 AVM Client] Creating ARC-200 payment:', {
      sender: this.signer.address,
      receiver: payTo,
      amount: amount,
      contractId,
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

  private getContractId(asset: string, network: string): string {
    if (/^\d+$/.test(asset)) {
      return asset
    }

    const config = ARC200_DEFAULT_TOKEN_CONFIG[network]
    if (config) {
      return config.contractId
    }

    return asset
  }
}

/**
 * Encodes a BigInt as a 32-byte big-endian uint256.
 */
function encodeUint256(value: bigint): Uint8Array {
  const buf = new Uint8Array(32)
  let v = value
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(v & BigInt(0xff))
    v >>= BigInt(8)
  }
  return buf
}
