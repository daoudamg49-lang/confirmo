import { AndroidSmsRetriever } from '@capawesome/capacitor-android-sms-retriever'
import { parseConfirmationSms, hasUsefulData, looksLikeFailure } from '../smsParser'
import { buildUssdPlan } from '../ussd'
import { UssdDialer } from '../ussdDialerPlugin'
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

  return { status: 'success', providerReference: parsed.providerReference, smsInfo: parsed, confirmationSource: 'sms_auto' }
}

/** Opens the native Dialer with the USSD code (no PIN) — fallback for devices/OS versions without the in-app USSD API. */
async function sendViaDialerFallback(request: TransferRequest): Promise<TransferResult> {
  const plan = buildUssdPlan(request.operator, getMyOperator(), request.counterpartyNumber, request.amount)
  if (!plan) {
    return { status: 'failed', failureReason: "Opérateur non reconnu, impossible de composer le code USSD" }
  }
  const smsPromise = listenForSms()
  window.location.href = plan.telUri
  return smsPromise
}

/**
 * Real-money path for a facilitator without a PV/agent code.
 *
 * `send` (depot/transfert) tries the in-app USSD API first: the full request — recipient, amount,
 * and the PIN typed into Confirmo's own keypad — is sent in one shot via `UssdDialerPlugin`, and
 * the operator's response text comes back directly in the app, no Dialer redirect. If that API
 * isn't available (old Android, permission refused), it falls back to opening the native Dialer
 * (PIN entered there instead) and listening for the confirmation SMS, exactly as before.
 *
 * `receive` (retrait) never dials anything — the client sends the money, so this only listens for
 * the incoming-payment SMS on your line.
 */
export class NativeUssdProvider implements TransferProvider {
  async send(request: TransferRequest): Promise<TransferResult> {
    const plan = buildUssdPlan(request.operator, getMyOperator(), request.counterpartyNumber, request.amount)
    if (!plan) {
      return { status: 'failed', failureReason: "Opérateur non reconnu, impossible de composer le code USSD" }
    }

    if (!request.pin) {
      return sendViaDialerFallback(request)
    }

    try {
      const { supported } = await UssdDialer.isSupported()
      if (!supported) return sendViaDialerFallback(request)

      const { response } = await UssdDialer.sendUssd({ code: plan.withPin(request.pin) })
      if (looksLikeFailure(response)) {
        return { status: 'failed', failureReason: response }
      }
      const parsed = parseConfirmationSms(response)
      return {
        status: 'success',
        providerReference: parsed.providerReference,
        smsInfo: parsed,
        confirmationSource: 'ussd_response',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('PERMISSION_DENIED') || message.includes('UNSUPPORTED_OS_VERSION')) {
        return sendViaDialerFallback(request)
      }
      return { status: 'failed', failureReason: "La composition USSD a échoué. Réessayez, ou vérifiez votre solde/numéro." }
    }
  }

  async receive(): Promise<TransferResult> {
    return listenForSms()
  }
}
