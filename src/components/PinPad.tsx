import { tapFeedback } from '../lib/haptics'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PinPad({
  value,
  onChange,
  maxLength = 6,
}: {
  value: string
  onChange: (value: string) => void
  maxLength?: number
}) {
  function press(key: string) {
    tapFeedback()
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key && value.length < maxLength) {
      onChange(value + key)
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex gap-3">
        {Array.from({ length: Math.max(value.length, 4) }).map((_, i) => (
          <span
            key={i}
            className="h-3.5 w-3.5 rounded-full border-2 transition-all"
            style={{
              borderColor: 'var(--color-primary)',
              background: i < value.length ? 'var(--color-primary)' : 'transparent',
            }}
          />
        ))}
      </div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={!key}
            onClick={() => press(key)}
            className="flex h-16 items-center justify-center rounded-2xl text-2xl font-semibold transition active:scale-90 disabled:opacity-0"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text)' }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}
