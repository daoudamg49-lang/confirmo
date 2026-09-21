import type { TransferRequest, TransferResult } from '../types'

/**
 * Common contract for the two ways money can move for an unregistered facilitator:
 * - `send`: you dial out (depot to a client, or transfert to a third party).
 * - `receive`: the client dials, sending money to you (retrait) — you only ever listen.
 *
 * Today `MockProvider` simulates both for the web/demo build. `NativeUssdProvider` implements
 * them for real on Android: `send` opens the native USSD dialer, `receive` just listens for the
 * incoming-payment SMS. Swapping in a different real backend later means implementing this same
 * interface — nothing in the UI layer needs to change.
 */
export interface TransferProvider {
  send(request: TransferRequest): Promise<TransferResult>
  receive(request: TransferRequest): Promise<TransferResult>
}
