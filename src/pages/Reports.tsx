import { useMemo, useState } from 'react'
import { MonthCalendar } from '../components/MonthCalendar'
import { TransactionRow } from '../components/TransactionRow'
import { formatFcfa } from '../lib/frenchNumbers'
import { dailyTotals, grandTotals, totalsForDay } from '../lib/reports'
import { useWallet } from '../state/WalletContext'

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Reports() {
  const { transactions } = useWallet()
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedKey, setSelectedKey] = useState(() => todayKey())

  const totalsByDay = useMemo(() => dailyTotals(transactions), [transactions])
  const grand = useMemo(() => grandTotals(transactions), [transactions])
  const selectedTotals = useMemo(() => totalsForDay(transactions, selectedKey), [transactions, selectedKey])
  const selectedTransactions = useMemo(
    () => transactions.filter((t) => t.status === 'success' && t.createdAt.slice(0, 10) === selectedKey),
    [transactions, selectedKey],
  )

  function changeMonth(delta: number) {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <h1 className="text-xl font-semibold">Rapports</h1>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Total envoyé" value={formatFcfa(grand.volume)} />
        <StatCard label="Encaissé en frais" value={formatFcfa(grand.clientCharge)} />
        <StatCard label="Gain total" value={formatFcfa(grand.margin)} highlight />
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          ← Précédent
        </button>
        <p className="text-sm font-semibold capitalize">{MONTH_FORMATTER.format(monthDate)}</p>
        <button type="button" onClick={() => changeMonth(1)} className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          Suivant →
        </button>
      </div>

      <MonthCalendar monthDate={monthDate} totalsByDay={totalsByDay} selectedKey={selectedKey} onSelect={setSelectedKey} />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">
          {new Date(selectedKey).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="grid grid-cols-3 gap-2.5 text-sm">
          <StatCard label="Opérations" value={String(selectedTotals.count)} compact />
          <StatCard label="Volume" value={formatFcfa(selectedTotals.volume)} compact />
          <StatCard label="Gain" value={formatFcfa(selectedTotals.margin)} compact highlight />
        </div>
        {selectedTransactions.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            Aucune opération réussie ce jour-là.
          </p>
        )}
        <div className="flex flex-col gap-2.5">
          {selectedTransactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight, compact }: { label: string; value: string; highlight?: boolean; compact?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-3 text-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p
        className={compact ? 'mt-0.5 text-sm font-semibold' : 'mt-0.5 font-semibold'}
        style={{ color: highlight ? 'var(--color-success)' : 'var(--color-text)' }}
      >
        {value}
      </p>
    </div>
  )
}
