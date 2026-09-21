import { Link } from 'react-router-dom'

export function IconTile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-2 rounded-2xl border py-3.5 text-center transition active:scale-95"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
        style={{ background: 'var(--color-primary-soft)' }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
    </Link>
  )
}
