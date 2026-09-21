import { AndroidSmsRetriever } from '@capawesome/capacitor-android-sms-retriever'
import { parseConfirmationSms, hasUsefulData } from '../smsParser'
import { buildUssdPlan } from '../ussd'
import { getMyOperator } from '../settings'
import type { TransferRequest, TransferResult } from '../types'
import type { TransferProvider } from './types'

async function listenForSms(): Promise<TransferResult> {
  const smsResult = await AndroidSmsRetriever.retrieveSms().catch(() => null)
  if (!smsResult) {
    return {
      status: 'awaiting_sms',
      failureReason: "Aucun SMS reçu dans les 5 minutes. Vérifiez sur votre téléphone si l'opération a bien eu lieu.",
    }
  }

  const parsed = parseConfirmationSms(smsResult.message)
  if (!hasUsefulData(parsed)) {
    return {
      status: 'awaiting_sms',
      failureReason: "SMS reçu mais son contenu n'a pas pu être compris automatiquement.",
      smsInfo: parsed,
    }
  }

  return { status: 'success', providerReference: parsed.providerReference, smsInfo: parsed }
}

/**
 * Real-money path for a facilitator without a PV/agent code. `send` dials the operator's USSD
 * transfer menu on the native phone dialer (the PIN is entered there, never inside this app),
 * then listens for the confirmation SMS. `receive` (a `retrait`, where the client sends money to
 * you) never dials anything — it just listens for the incoming-payment SMS the client's transfer
 * triggers on your own line.
 *
 * Only usable inside the Capacitor Android shell.
 */
export class NativeUssdProvider implements TransferProvider {
  async send(request: TransferRequest): Promise<TransferResult> {
    const plan = buildUssdPlan(request.operator, getMyOperator(), request.counterpartyNumber, request.amount)
    if (!plan) {
      return { status: 'failed', failureReason: "Opérateur non reconnu, impossible de composer le code USSD" }
    }

    const smsPromise = listenForSms()
    window.location.href = plan.telUri
    return smsPromise
  }

  async receive(): Promise<TransferResult> {
    return listenForSms()
  }
}
