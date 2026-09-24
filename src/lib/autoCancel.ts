import * as storage from './storage'

const STALE_AFTER_MS = 30 * 60 * 1000

/**
 * An operation stuck at `pending` or `awaiting_sms` for more than 30 minutes almost certainly
 * never completed — the SMS never arrived, or the USSD session was abandoned. Marking it
 * `cancelled` keeps the history honest instead of leaving a permanently ambiguous "in progress".
 * Returns true if anything changed, so callers know whether to re-read transactions.
 */
export function cancelStaleOperations(): boolean {
  const all = storage.getTransactions()
  const now = Date.now()
  let changed = false

  for (const t of all) {
    if ((t.status === 'pending' || t.status === 'awaiting_sms') && now - new Date(t.createdAt).getTime() > STALE_AFTER_MS) {
      storage.updateTransaction(t.id, {
        status: 'cancelled',
        failureReason: 'Annulé automatiquement : aucune confirmation reçue après 30 minutes.',
      })
      changed = true
    }
  }

  return changed
}
