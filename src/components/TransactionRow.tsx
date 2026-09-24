import { useState } from 'react'
import { formatFcfa } from '../lib/frenchNumbers'
import { errorFeedback, successFeedback, tapFeedback } from '../lib/haptics'
import { OPERATOR_COLOR } from '../lib/operator'
import { formatTogoNumber } from '../lib/operator'
import { useWallet } from '../state/WalletContext'
import type { Transaction } from '../lib/types'
import { StatusBadge } from './StatusBadge'

const CONFIRMATION_LABEL: Record<NonNullable<Transaction['confirmationSource']>, string> = {
  sms_auto: '📩 Confirmé par SMS',
  ussd_response: '📟 Confirmé par USSD',
  manual: '✍️ Confirmé manuellement',
  simulated: '🧪 Simulation',
}

const OPERATION_LABEL: Record<Transaction['operationType'], string> = {
  depot: '⬇️ Dépôt',
  retrait: '⬆️ Retrait',
  transfert: '↗️ Transfert',
}

const RETRYABLE_STATUSES: Transaction['status'][] = ['pending', 'awaiting_sms']

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { isNative, retrySmsCapture } = useWallet()
  const [retrying, setRetrying] = useState(false)
  const time = new Date(transaction.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const canRetry = isNative && RETRYABLE_STATUSES.includes(transaction.status)

  async function handleRetry() {
    tapFeedback()
    setRetrying(true)
    try {
      const updated = await retrySmsCapture(transaction.id)
      if (updated.status === 'success') successFeedback()
    } catch {
      errorFeedback()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border p-3.5 transition-shadow"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: OPERATOR_COLOR[transaction.operator] }}
      >
        {transaction.operator === 'moov' ? 'M' : transaction.operator === 'yas' ? 'Y' : '?'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{formatTogoNumber(transaction.counterpartyNumber)}</p>
          <p className="shrink-0 font-semibold">{formatFcfa(transaction.amount)}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {OPERATION_LABEL[transaction.operationType]}
          </span>
          <StatusBadge status={transaction.status} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {time}
          </span>
        </div>
        {transaction.status === 'success' && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Facturé {formatFcfa(transaction.clientCharge)} · Frais réel {formatFcfa(transaction.operatorFee)} · Gain{' '}
            <strong style={{ color: transaction.margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {formatFcfa(transaction.margin)}
            </strong>
          </p>
        )}
        {transaction.confirmationSource && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {CONFIRMATION_LABEL[transaction.confirmationSource]}
            {transaction.providerReference ? ` · Réf. ${transaction.providerReference}` : ''}
          </p>
        )}
        {(transaction.status === 'failed' || transaction.status === 'cancelled') && transaction.failureReason && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
            {transaction.failureReason}
          </p>
        )}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          aria-label="Relancer la vérification"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition active:scale-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
        >
          <span className={retrying ? 'inline-block animate-spin' : 'inline-block'}>🔁</span>
        </button>
      )}
    </div>
  )
}
