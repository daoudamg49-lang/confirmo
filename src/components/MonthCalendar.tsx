import type { Totals } from '../lib/reports'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Monday-first day-of-week index (0-6) for a date. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function MonthCalendar({
  monthDate,
  totalsByDay,
  selectedKey,
  onSelect,
}: {
  monthDate: Date
  totalsByDay: Map<string, Totals>
  selectedKey: string
  onSelect: (key: string) => void
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = mondayIndex(firstOfMonth)
  const todayKey = toKey(new Date())

  const cells: (string | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(year, month, i + 1)))]

  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <span key={i} />
          const totals = totalsByDay.get(key)
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          const dayNumber = parseInt(key.slice(-2), 10)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition"
              style={{
                background: isSelected ? 'var(--color-primary)' : totals ? 'var(--color-primary-soft)' : 'transparent',
                color: isSelected ? 'white' : 'var(--color-text)',
                outline: isToday && !isSelected ? '1px solid var(--color-primary)' : 'none',
              }}
            >
              <span className="font-medium">{dayNumber}</span>
              {totals && (
                <span
                  className="mt-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: isSelected ? 'white' : 'var(--color-primary)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
