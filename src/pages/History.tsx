import { useMemo, useState } from 'react'
import { TransactionRow } from '../components/TransactionRow'
import { formatFcfa } from '../lib/frenchNumbers'
import type { TransactionStatus } from '../lib/types'
import { useWallet } from '../state/WalletContext'

type Filter = 'all' | TransactionStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'success', label: 'Réussis' },
  { key: 'awaiting_sms', label: 'Attente SMS' },
  { key: 'pending', label: 'En cours' },
  { key: 'failed', label: 'Échoués' },
]

function groupByDay(transactions: { createdAt: string }[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  transactions.forEach((t, index) => {
    const key = new Date(t.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(index)
  })
  return map
}

export function History() {
  const { transactions } = useWallet()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false
      if (query && !t.counterpartyNumber.includes(query.replace(/\D/g, ''))) return false
      return true
    })
  }, [transactions, filter, query])

  const grouped = useMemo(() => groupByDay(filtered), [filtered])

  const totalSent = useMemo(
    () => transactions.filter((t) => t.status === 'success').reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-5">
      <h1 className="text-xl font-semibold">Historique</h1>

      <div
        className="rounded-2xl p-3.5 text-sm"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
      >
        Total envoyé (réussi) : <strong>{formatFcfa(totalSent)}</strong> sur {transactions.length} transaction(s)
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par numéro"
        inputMode="tel"
        className="rounded-xl border px-4 py-2.5 outline-none"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              background: filter === f.key ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter === f.key ? 'white' : 'var(--color-text)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p
          className="rounded-2xl border border-dashed p-6 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          Aucune transaction trouvée.
        </p>
      )}

      {[...grouped.entries()].map(([day, indices]) => (
        <div key={day} className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {day}
          </p>
          {indices.map((i) => (
            <TransactionRow key={filtered[i].id} transaction={filtered[i]} />
          ))}
        </div>
      ))}
    </div>
  )
}
