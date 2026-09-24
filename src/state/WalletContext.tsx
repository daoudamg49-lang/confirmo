import { Capacitor } from '@capacitor/core'
import { AndroidSmsRetriever } from '@capawesome/capacitor-android-sms-retriever'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cancelStaleOperations } from '../lib/autoCancel'
import { computeOperatorFee } from '../lib/operatorFees'
import { MockProvider } from '../lib/providers/mockProvider'
import { NativeUssdProvider } from '../lib/providers/nativeUssdProvider'
import { nextTransferIndexToday } from '../lib/reports'
import { getMyOperator } from '../lib/settings'
import { parseConfirmationSms, hasUsefulData } from '../lib/smsParser'
import * as storage from '../lib/storage'
import type { OperationType, Transaction, TransferRequest } from '../lib/types'

const isNative = Capacitor.isNativePlatform()
const provider = isNative ? new NativeUssdProvider() : new MockProvider()
const STALE_CHECK_INTERVAL_MS = 60_000

export interface StartOperationInput {
  operationType: OperationType
  counterpartyNumber: string
  operator: Transaction['operator']
  amount: number
  clientCharge: number
  /** Only for depot/transfert on Android — never persisted. */
  pin?: string
}

interface WalletContextValue {
  transactions: Transaction[]
  isNative: boolean
  previewOperatorFee: (amount: number) => ReturnType<typeof computeOperatorFee>
  startOperation: (input: StartOperationInput) => Promise<Transaction>
  retrySmsCapture: (transactionId: string) => Promise<Transaction>
  resolveManually: (transactionId: string, outcome: 'success' | 'failed') => void
  refresh: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    cancelStaleOperations()
    return storage.getTransactions()
  })

  const refresh = useCallback(() => {
    cancelStaleOperations()
    setTransactions(storage.getTransactions())
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (cancelStaleOperations()) setTransactions(storage.getTransactions())
    }, STALE_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const previewOperatorFee = useCallback((amount: number) => {
    const index = nextTransferIndexToday(storage.getTransactions())
    return computeOperatorFee(getMyOperator(), index, amount)
  }, [])

  const startOperation = useCallback(async (input: StartOperationInput): Promise<Transaction> => {
    const { operationType, counterpartyNumber, operator, amount, clientCharge, pin } = input
    const feeResult =
      operationType === 'retrait'
        ? { fee: 0, documented: true } // you don't pay the operator fee on money coming in
        : computeOperatorFee(getMyOperator(), nextTransferIndexToday(storage.getTransactions()), amount)

    const pending: Transaction = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      operationType,
      counterpartyNumber,
      operator,
      amount,
      operatorFee: feeResult.fee,
      clientCharge,
      margin: clientCharge - feeResult.fee,
      status: 'pending',
    }
    storage.saveTransaction(pending)
    setTransactions(storage.getTransactions())

    const request: TransferRequest = { counterpartyNumber, operator, amount, pin }
    const result = operationType === 'retrait' ? await provider.receive(request) : await provider.send(request)

    if (result.status === 'success') {
      storage.updateTransaction(pending.id, {
        status: 'success',
        confirmationSource: result.confirmationSource ?? 'manual',
        providerReference: result.providerReference ?? result.smsInfo?.providerReference,
        withdrawalCode: result.smsInfo?.withdrawalCode,
        balanceAfterSms: result.smsInfo?.balanceAfter,
        confirmedAt: new Date().toISOString(),
        rawSms: result.smsInfo?.raw,
      })
    } else if (result.status === 'awaiting_sms') {
      storage.updateTransaction(pending.id, {
        status: 'awaiting_sms',
        failureReason: result.failureReason,
        rawSms: result.smsInfo?.raw,
      })
    } else {
      storage.updateTransaction(pending.id, { status: 'failed', failureReason: result.failureReason })
    }

    const updated = storage.getTransactions()
    setTransactions(updated)
    return updated.find((t) => t.id === pending.id)!
  }, [])

  /** Re-listens for the confirmation SMS without redialing, for when the first capture timed out. */
  const retrySmsCapture = useCallback(async (transactionId: string): Promise<Transaction> => {
    const tx = storage.getTransactions().find((t) => t.id === transactionId)
    if (!tx) throw new Error('Transaction introuvable')
    if (!isNative) throw new Error('La capture SMS automatique nécessite l’application Android.')

    const smsResult = await AndroidSmsRetriever.retrieveSms().catch(() => null)
    if (!smsResult) throw new Error('Toujours aucun SMS reçu. Réessayez dans quelques instants.')

    const parsed = parseConfirmationSms(smsResult.message)
    if (hasUsefulData(parsed)) {
      storage.updateTransaction(transactionId, {
        status: 'success',
        confirmationSource: 'sms_auto',
        providerReference: parsed.providerReference,
        withdrawalCode: parsed.withdrawalCode,
        balanceAfterSms: parsed.balanceAfter,
        confirmedAt: new Date().toISOString(),
        rawSms: parsed.raw,
      })
    } else {
      storage.updateTransaction(transactionId, { rawSms: parsed.raw })
    }

    const updated = storage.getTransactions()
    setTransactions(updated)
    return updated.find((t) => t.id === transactionId)!
  }, [])

  /** Manual escape hatch when SMS capture never resolves — the facilitator confirms the real outcome. */
  const resolveManually = useCallback((transactionId: string, outcome: 'success' | 'failed') => {
    if (outcome === 'success') {
      storage.updateTransaction(transactionId, {
        status: 'success',
        confirmationSource: 'manual',
        confirmedAt: new Date().toISOString(),
      })
    } else {
      storage.updateTransaction(transactionId, { status: 'failed', failureReason: 'Marqué comme échoué manuellement' })
    }
    setTransactions(storage.getTransactions())
  }, [])

  const value = useMemo<WalletContextValue>(
    () => ({ transactions, isNative, previewOperatorFee, startOperation, retrySmsCapture, resolveManually, refresh }),
    [transactions, previewOperatorFee, startOperation, retrySmsCapture, resolveManually, refresh],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
