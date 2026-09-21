import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/send', label: 'Opération', icon: '↗️' },
  { to: '/history', label: 'Historique', icon: '🕒' },
  { to: '/reports', label: 'Rapports', icon: '📊' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 flex border-t"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${isActive ? '' : ''}`
          }
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
          })}
        >
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
