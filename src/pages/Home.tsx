import { Link } from 'react-router-dom'
import { IconTile } from '../components/IconTile'
import { TransactionRow } from '../components/TransactionRow'
import { formatFcfa } from '../lib/frenchNumbers'
import { totalsForDay } from '../lib/reports'
import { useWallet } from '../state/WalletContext'

export function Home() {
  const { transactions, isNative } = useWallet()
  const recent = transactions.slice(0, 5)
  const todayKey = new Date().toISOString().slice(0, 10)
  const today = totalsForDay(transactions, todayKey)

  return (
    <div className="page-enter flex flex-1 flex-col gap-5 p-5">
      <div
        className="rounded-3xl p-6 text-white"
        style={{ background: 'var(--gradient-hero)', boxShadow: 'var(--shadow-hero)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium opacity-80">Aujourd'hui</p>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
            {isNative ? '🟢 Mode réel (USSD)' : '🧪 Mode démo'}
          </span>
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight">{formatFcfa(today.margin)}</p>
        <p className="text-sm opacity-80">de gain sur {today.count} opération(s)</p>
        <div className="mt-4 flex gap-4 text-sm opacity-90">
          <div>
            <p className="opacity-70">Volume déplacé</p>
            <p className="font-semibold">{formatFcfa(today.volume)}</p>
          </div>
          <div>
            <p className="opacity-70">Facturé aux clients</p>
            <p className="font-semibold">{formatFcfa(today.clientCharge)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <IconTile to="/send" icon="↗️" label="Opération" />
        <IconTile to="/history" icon="🕒" label="Historique" />
        <IconTile to="/reports" icon="📊" label="Rapports" />
        <IconTile to="/settings" icon="⚙️" label="Réglages" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Opérations récentes</h2>
          <Link to="/history" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            Voir tout
          </Link>
        </div>
        {recent.length === 0 && (
          <p
            className="rounded-2xl border border-dashed p-6 text-center text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            Aucune opération pour le moment.
          </p>
        )}
        <div className="flex flex-col gap-2.5">
          {recent.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      </div>
    </div>
  )
}
