import { useRef, useState } from 'react'
import { isSpeechRecognitionSupported, listenOnce } from '../lib/voice'

interface VoiceInputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  parseTranscript: (transcript: string) => string | null
  placeholder?: string
  inputMode?: 'numeric' | 'tel' | 'text'
  helperText?: string
  autoFocus?: boolean
}

export function VoiceInputField({
  label,
  value,
  onChange,
  parseTranscript,
  placeholder,
  inputMode = 'text',
  helperText,
  autoFocus,
}: VoiceInputFieldProps) {
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const stopRef = useRef<() => void>(() => {})
  const voiceSupported = isSpeechRecognitionSupported()

  function startListening() {
    setVoiceError(null)
    setListening(true)
    stopRef.current = listenOnce(
      (transcript) => {
        const parsed = parseTranscript(transcript)
        if (parsed) {
          onChange(parsed)
        } else {
          setVoiceError(`Je n'ai pas compris : "${transcript}". Réessayez ou saisissez au clavier.`)
        }
      },
      (error) => {
        if (error === 'unsupported') {
          setVoiceError("La note vocale n'est pas prise en charge par ce navigateur.")
        } else if (error === 'not-allowed' || error === 'permission-denied') {
          setVoiceError('Autorisez le micro pour utiliser la note vocale.')
        } else {
          setVoiceError('Erreur de reconnaissance vocale, réessayez.')
        }
        setListening(false)
      },
      () => setListening(false),
    )
  }

  function stopListening() {
    stopRef.current()
    setListening(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          autoFocus={autoFocus}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border px-4 py-3 text-lg outline-none focus:ring-2"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            aria-label={listening ? 'Arrêter la note vocale' : 'Dicter par note vocale'}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition"
            style={{
              background: listening ? 'var(--color-danger)' : 'var(--color-primary)',
              color: 'white',
            }}
          >
            {listening ? '■' : '🎙️'}
          </button>
        )}
      </div>
      {listening && (
        <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
          Je vous écoute…
        </p>
      )}
      {voiceError && (
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {voiceError}
        </p>
      )}
      {helperText && !voiceError && !listening && (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {helperText}
        </p>
      )}
    </div>
  )
}
