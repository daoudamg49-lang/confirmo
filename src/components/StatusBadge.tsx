import type { TransactionStatus } from '../lib/types'

const LABELS: Record<TransactionStatus, string> = {
  pending: 'En cours',
  awaiting_sms: 'Attente SMS',
  success: 'Réussi',
  failed: 'Échoué',
  cancelled: 'Annulé',
}

const COLORS: Record<TransactionStatus, string> = {
  pending: '#f5a524',
  awaiting_sms: '#0ea5e9',
  success: 'var(--color-success)',
  failed: 'var(--color-danger)',
  cancelled: 'var(--color-text-muted)',
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ background: COLORS[status] }}
    >
      {LABELS[status]}
    </span>
  )
}
