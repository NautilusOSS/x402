/**
 * AVM Facilitator Scheme for Exact-ARC200 Payment Protocol
 *
 * Verifies and settles ARC-200 smart contract token transfers.
 * Same atomic-group structure as exact, but the payment transaction
 * is an `appl` (application call) that invokes arc200_transfer on the
 * token contract instead of an `axfer` (ASA transfer).
 */

import {
  decodeTransaction as decodeUnsignedTxn,
  decodeSignedTransaction as decodeSignedTxn,
  encodeTransactionRaw,
  encodeSignedTransaction,
  bytesForSigning,
} from '@algorandfoundation/algokit-utils/transact'
import type { Transaction, SignedTransaction } from '@algorandfoundation/algokit-utils/transact'
import { ed25519Verifier } from '@algorandfoundation/algokit-utils/crypto'
import { encodeAddress } from '@algorandfoundation/algokit-utils/common'
import type {
  Network,
  PaymentPayload,
  PaymentRequirements,
  SchemeNetworkFacilitator,
  SettleResponse,
  VerifyResponse,
} from '@x402/core/types'
import type { FacilitatorAvmSigner } from '../../signer'
import type { ExactAvmPayloadV2 } from '../../types'
import { isExactAvmPayload } from '../../types'
import { decodeTransaction, hasSignature, extractGenesisHashFromCaip2 } from '../../utils'
import { MAX_ATOMIC_GROUP_SIZE, MAX_REASONABLE_FEE, ARC200_TRANSFER_SELECTOR } from '../../constants'

export const VerifyErrorReason = {
  INVALID_PAYLOAD_FORMAT: 'Invalid payload format',
  GROUP_SIZE_EXCEEDED: 'Transaction group exceeds maximum size',
  INVALID_PAYMENT_INDEX: 'Payment index out of bounds',
  INVALID_TRANSACTION: 'Invalid transaction encoding',
  INVALID_GROUP_ID: 'Transactions have inconsistent group IDs',
  PAYMENT_NOT_APP_CALL: 'Payment transaction is not an application call',
  INVALID_METHOD_SELECTOR: 'Application call is not an arc200_transfer',
  INVALID_APP_ARGS: 'Application call has invalid arguments',
  AMOUNT_MISMATCH: 'Payment amount does not match requirements',
  RECEIVER_MISMATCH: 'Payment receiver does not match payTo address',
  ASSET_MISMATCH: 'Application ID does not match requirements asset',
  INVALID_FEE_PAYER: 'Fee payer transaction has invalid parameters',
  FEE_TOO_HIGH: 'Fee payer transaction fee exceeds maximum',
  PAYMENT_NOT_SIGNED: 'Payment transaction is not signed',
  INVALID_SIGNATURE: 'Payment transaction signature does not match sender',
  SIMULATION_FAILED: 'Transaction simulation failed',
  FACILITATOR_TRANSFERRING_FUNDS: 'Facilitator signer cannot be the payment sender',
  GENESIS_HASH_MISMATCH: 'Transaction genesis hash does not match expected network',
  UNSIGNED_NON_FACILITATOR_TXN: 'Unsigned transaction from non-facilitator address',
  SECURITY_REKEY_NOT_ALLOWED: 'Rekey transactions are not allowed',
  SECURITY_CLOSE_TO_NOT_ALLOWED: 'Close-to transactions are not allowed',
  SECURITY_KEYREG_NOT_ALLOWED: 'Key registration transactions are not allowed',
} as const

/**
 * AVM facilitator implementation for the exact-arc200 payment scheme.
 *
 * Verifies atomic transaction groups and settles ARC-200 token transfers.
 * The payment transaction is an application call to the ARC-200 contract's
 * arc200_transfer(address,uint256)bool method.
 * Supports gasless transactions by signing fee payer transactions.
 */
export class ExactArc200AvmScheme implements SchemeNetworkFacilitator {
  readonly scheme = 'exact-arc200'
  readonly caipFamily = 'algorand:*'

  constructor(private readonly signer: FacilitatorAvmSigner) {}

  getExtra(_: string): Record<string, unknown> | undefined {
    const addresses = this.signer.getAddresses()
    if (addresses.length === 0) return undefined
    const randomIndex = Math.floor(Math.random() * addresses.length)
    return { feePayer: addresses[randomIndex] }
  }

  getSigners(_: string): string[] {
    return [...this.signer.getAddresses()]
  }

  async verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<VerifyResponse> {
    const rawPayload = payload.payload as unknown

    if (!isExactAvmPayload(rawPayload)) {
      return { isValid: false, invalidReason: VerifyErrorReason.INVALID_PAYLOAD_FORMAT }
    }

    const { paymentGroup, paymentIndex } = rawPayload as ExactAvmPayloadV2

    if (paymentGroup.length > MAX_ATOMIC_GROUP_SIZE) {
      return { isValid: false, invalidReason: VerifyErrorReason.GROUP_SIZE_EXCEEDED }
    }
    if (paymentIndex < 0 || paymentIndex >= paymentGroup.length) {
      return { isValid: false, invalidReason: VerifyErrorReason.INVALID_PAYMENT_INDEX }
    }

    const facilitatorAddresses = this.signer.getAddresses()

    const decoded = this.decodeTransactionGroup(paymentGroup, facilitatorAddresses)
    if ('error' in decoded) return decoded.error

    const paymentTxn = decoded.txns[paymentIndex].txn
    const payer = paymentTxn.sender.toString()

    // Validate genesis hash matches network (works for any AVM namespace)
    const networkStr = String(requirements.network)
    const expectedGenesisHash = extractGenesisHashFromCaip2(networkStr)
    if (expectedGenesisHash) {
      for (const stxn of decoded.txns) {
        const txnGenesisHash = stxn.txn.genesisHash
          ? Buffer.from(stxn.txn.genesisHash).toString('base64')
          : ''
        if (txnGenesisHash !== expectedGenesisHash) {
          return { isValid: false, invalidReason: VerifyErrorReason.GENESIS_HASH_MISMATCH }
        }
      }
    }

    if (facilitatorAddresses.includes(payer)) {
      return { isValid: false, invalidReason: VerifyErrorReason.FACILITATOR_TRANSFERRING_FUNDS }
    }

    const securityCheck = this.verifySecurityConstraints(decoded.txns)
    if (!securityCheck.isValid) return securityCheck

    const paymentCheck = await this.verifyPaymentTransaction(
      decoded.txns[paymentIndex],
      requirements,
      paymentGroup[paymentIndex],
    )
    if (!paymentCheck.isValid) return paymentCheck

    const prepared = await this.prepareSignedGroup(decoded.txns, paymentGroup)
    if ('error' in prepared) return prepared.error

    const simResult = await this.simulateTransactionGroup(prepared.signedTxns, requirements.network)
    if (!simResult.isValid) return simResult

    return { isValid: true, payer }
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    const verification = await this.verify(payload, requirements)
    if (!verification.isValid) {
      return {
        success: false,
        errorReason: verification.invalidReason,
        transaction: '',
        network: requirements.network,
        payer: verification.payer,
      }
    }

    const avmPayload = payload.payload as unknown as ExactAvmPayloadV2
    const { paymentGroup, paymentIndex } = avmPayload

    const facilitatorAddresses = this.signer.getAddresses()
    const signedTxns: Uint8Array[] = []

    for (let i = 0; i < paymentGroup.length; i++) {
      const txnBytes = decodeTransaction(paymentGroup[i])

      let txn: Transaction
      let isAlreadySigned = false
      try {
        const stxn = decodeSignedTxn(txnBytes)
        if (!stxn.txn.type || stxn.txn.type === 'unknown') {
          throw new Error('Invalid signed transaction: missing type')
        }
        txn = stxn.txn
        isAlreadySigned =
          stxn.sig !== undefined || stxn.lsig !== undefined || stxn.msig !== undefined
      } catch {
        txn = decodeUnsignedTxn(txnBytes)
        isAlreadySigned = false
      }

      const sender = txn.sender.toString()

      if (facilitatorAddresses.includes(sender)) {
        const unsignedTxn = encodeTransactionRaw(txn)
        const signedTxn = await this.signer.signTransaction(unsignedTxn, sender)
        signedTxns.push(signedTxn)
      } else if (isAlreadySigned) {
        signedTxns.push(txnBytes)
      } else {
        return {
          success: false,
          errorReason: `Transaction at index ${i} is unsigned but sender ${sender} is not a facilitator address`,
          transaction: '',
          network: requirements.network,
        }
      }
    }

    try {
      await this.signer.sendTransactions(signedTxns, requirements.network)

      const paymentTxnBytes = signedTxns[paymentIndex]
      const paymentStxn = decodeSignedTxn(paymentTxnBytes)
      const paymentTxId = paymentStxn.txn.txId()

      return {
        success: true,
        transaction: paymentTxId,
        network: requirements.network,
        payer: verification.payer,
      }
    } catch (error) {
      return {
        success: false,
        errorReason: `Failed to submit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        transaction: '',
        network: requirements.network,
        payer: verification.payer,
      }
    }
  }

  /**
   * Verifies the payment transaction is a valid ARC-200 transfer
   * matching the requirements.
   *
   * Checks:
   * 1. Transaction type is `appl` (application call)
   * 2. Application ID matches requirements.asset
   * 3. Method selector matches arc200_transfer
   * 4. Decoded receiver and amount match requirements
   */
  private async verifyPaymentTransaction(
    stxn: SignedTransaction,
    requirements: PaymentRequirements,
    encodedTxn: string,
  ): Promise<VerifyResponse> {
    const txn = stxn.txn

    if (txn.type !== 'appl') {
      return {
        isValid: false,
        invalidReason: VerifyErrorReason.PAYMENT_NOT_APP_CALL,
      }
    }

    const appCallFields = txn.appCall
    if (!appCallFields) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.PAYMENT_NOT_APP_CALL}: missing appCall data`,
      }
    }

    // Verify application ID matches the ARC-200 contract
    const appId = appCallFields.appId?.toString() ?? ''
    if (appId !== requirements.asset) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.ASSET_MISMATCH}: expected ${requirements.asset}, got ${appId}`,
      }
    }

    // Verify method selector and arguments
    const args = appCallFields.args
    if (!args || args.length < 3) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_APP_ARGS}: expected at least 3 app args (selector, address, uint256)`,
      }
    }

    // appArgs[0] = 4-byte method selector
    const selector = args[0]
    if (
      selector.length !== 4 ||
      selector[0] !== ARC200_TRANSFER_SELECTOR[0] ||
      selector[1] !== ARC200_TRANSFER_SELECTOR[1] ||
      selector[2] !== ARC200_TRANSFER_SELECTOR[2] ||
      selector[3] !== ARC200_TRANSFER_SELECTOR[3]
    ) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_METHOD_SELECTOR}: expected 0x${Buffer.from(ARC200_TRANSFER_SELECTOR).toString('hex')}, got 0x${Buffer.from(selector).toString('hex')}`,
      }
    }

    // appArgs[1] = 32-byte receiver address (public key)
    const receiverBytes = args[1]
    if (receiverBytes.length !== 32) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_APP_ARGS}: receiver address must be 32 bytes, got ${receiverBytes.length}`,
      }
    }
    const receiver = encodeAddress(receiverBytes)
    if (receiver !== requirements.payTo) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.RECEIVER_MISMATCH}: expected ${requirements.payTo}, got ${receiver}`,
      }
    }

    // appArgs[2] = 32-byte uint256 amount (big-endian)
    const amountBytes = args[2]
    if (amountBytes.length !== 32) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_APP_ARGS}: amount must be 32 bytes, got ${amountBytes.length}`,
      }
    }
    const amount = decodeUint256(amountBytes)
    if (amount !== BigInt(requirements.amount)) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.AMOUNT_MISMATCH}: expected ${requirements.amount}, got ${amount.toString()}`,
      }
    }

    // Verify signature exists
    const txnBytes = decodeTransaction(encodedTxn)
    if (!hasSignature(txnBytes)) {
      return {
        isValid: false,
        invalidReason: VerifyErrorReason.PAYMENT_NOT_SIGNED,
      }
    }

    // Verify the ed25519 signature was actually made by the sender
    if (stxn.sig) {
      const signedMsg = bytesForSigning.transaction(txn)
      const isValidSig = await ed25519Verifier(stxn.sig, signedMsg, txn.sender.publicKey)
      if (!isValidSig) {
        return {
          isValid: false,
          invalidReason: VerifyErrorReason.INVALID_SIGNATURE,
        }
      }
    }

    return { isValid: true }
  }

  private decodeTransactionGroup(
    paymentGroup: string[],
    facilitatorAddresses: readonly string[],
  ): { txns: SignedTransaction[] } | { error: VerifyResponse } {
    const txns: SignedTransaction[] = []

    for (let i = 0; i < paymentGroup.length; i++) {
      try {
        const bytes = decodeTransaction(paymentGroup[i])

        try {
          const stxn = decodeSignedTxn(bytes)
          if (!stxn.txn.type || stxn.txn.type === 'unknown') {
            throw new Error('Invalid signed transaction: missing type')
          }
          txns.push(stxn)
        } catch {
          const unsignedTxn = decodeUnsignedTxn(bytes)
          const sender = unsignedTxn.sender.toString()

          if (!facilitatorAddresses.includes(sender)) {
            return {
              error: {
                isValid: false,
                invalidReason: `${VerifyErrorReason.UNSIGNED_NON_FACILITATOR_TXN}: transaction at index ${i} from ${sender}`,
              },
            }
          }

          const encodedForSimulate = encodeSignedTransaction({ txn: unsignedTxn })
          txns.push(decodeSignedTxn(encodedForSimulate))
        }
      } catch {
        return {
          error: {
            isValid: false,
            invalidReason: `${VerifyErrorReason.INVALID_TRANSACTION}: Failed to decode transaction at index ${i}`,
          },
        }
      }
    }

    if (txns.length > 1) {
      const firstGroup = txns[0].txn.group
      const firstGroupId = firstGroup ? Buffer.from(firstGroup).toString('base64') : null

      for (let i = 1; i < txns.length; i++) {
        const group = txns[i].txn.group
        const groupId = group ? Buffer.from(group).toString('base64') : null
        if (groupId !== firstGroupId) {
          return {
            error: { isValid: false, invalidReason: VerifyErrorReason.INVALID_GROUP_ID },
          }
        }
      }
    }

    return { txns }
  }

  private async prepareSignedGroup(
    decodedTxns: SignedTransaction[],
    paymentGroup: string[],
  ): Promise<{ signedTxns: Uint8Array[] } | { error: VerifyResponse }> {
    const facilitatorAddresses = this.signer.getAddresses()
    const signedTxns: Uint8Array[] = []

    for (let i = 0; i < decodedTxns.length; i++) {
      const txn = decodedTxns[i].txn
      const sender = txn.sender.toString()

      if (facilitatorAddresses.includes(sender)) {
        const feeCheck = this.verifyFeePayerTransaction(txn)
        if (!feeCheck.isValid) return { error: feeCheck }

        try {
          const signedTxn = await this.signer.signTransaction(encodeTransactionRaw(txn), sender)
          signedTxns.push(signedTxn)
        } catch (error) {
          return {
            error: {
              isValid: false,
              invalidReason: `Failed to sign fee payer transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          }
        }
      } else {
        signedTxns.push(decodeTransaction(paymentGroup[i]))
      }
    }

    return { signedTxns }
  }

  private async simulateTransactionGroup(
    signedTxns: Uint8Array[],
    network: Network,
  ): Promise<VerifyResponse> {
    try {
      const simResult = (await this.signer.simulateTransactions(signedTxns, network)) as {
        txnGroups?: Array<{ failureMessage?: string }>
      }

      if (simResult.txnGroups?.[0]?.failureMessage) {
        return {
          isValid: false,
          invalidReason: `${VerifyErrorReason.SIMULATION_FAILED}: ${simResult.txnGroups[0].failureMessage}`,
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.SIMULATION_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  private verifyFeePayerTransaction(txn: Transaction): VerifyResponse {
    if (txn.type !== 'pay') {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_FEE_PAYER}: expected payment transaction, got ${txn.type}`,
      }
    }

    const paymentFields = txn.payment
    const payAmount = paymentFields?.amount ?? BigInt(0)
    if (payAmount > BigInt(0)) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_FEE_PAYER}: amount must be 0`,
      }
    }

    if (paymentFields?.receiver) {
      const receiverAddr = paymentFields.receiver.toString()
      const senderAddr = txn.sender.toString()
      if (receiverAddr !== senderAddr) {
        return {
          isValid: false,
          invalidReason: `${VerifyErrorReason.INVALID_FEE_PAYER}: receiver must be same as sender (self-payment)`,
        }
      }
    }

    if (paymentFields?.closeRemainderTo) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_FEE_PAYER}: closeRemainderTo not allowed`,
      }
    }

    if (txn.rekeyTo) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.INVALID_FEE_PAYER}: rekeyTo not allowed`,
      }
    }

    const fee = Number(txn.fee ?? 0)
    if (fee > MAX_REASONABLE_FEE) {
      return {
        isValid: false,
        invalidReason: `${VerifyErrorReason.FEE_TOO_HIGH}: ${fee} exceeds maximum ${MAX_REASONABLE_FEE}`,
      }
    }

    return { isValid: true }
  }

  private verifySecurityConstraints(txns: SignedTransaction[]): VerifyResponse {
    for (let i = 0; i < txns.length; i++) {
      const txn = txns[i].txn

      if (txn.type === 'keyreg') {
        return {
          isValid: false,
          invalidReason: `${VerifyErrorReason.SECURITY_KEYREG_NOT_ALLOWED}: Transaction at index ${i} is a key registration transaction`,
        }
      }

      if (txn.rekeyTo) {
        return {
          isValid: false,
          invalidReason: `${VerifyErrorReason.SECURITY_REKEY_NOT_ALLOWED}: Transaction at index ${i} has rekeyTo set`,
        }
      }

      if (txn.type === 'pay') {
        if (txn.payment?.closeRemainderTo) {
          return {
            isValid: false,
            invalidReason: `${VerifyErrorReason.SECURITY_CLOSE_TO_NOT_ALLOWED}: Transaction at index ${i} has CloseRemainderTo set`,
          }
        }
      }

      if (txn.type === 'axfer') {
        if (txn.assetTransfer?.closeRemainderTo) {
          return {
            isValid: false,
            invalidReason: `${VerifyErrorReason.SECURITY_CLOSE_TO_NOT_ALLOWED}: Transaction at index ${i} has AssetCloseTo set`,
          }
        }
      }
    }

    return { isValid: true }
  }
}

/**
 * Decodes a 32-byte big-endian uint256 to a BigInt.
 */
function decodeUint256(bytes: Uint8Array): bigint {
  let value = BigInt(0)
  for (let i = 0; i < 32; i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i])
  }
  return value
}
