export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

type RecognitionResultHandler = (transcript: string) => void
type RecognitionErrorHandler = (error: string) => void

/** Starts a one-shot French speech recognition session and returns a stop function. */
export function listenOnce(
  onResult: RecognitionResultHandler,
  onError: RecognitionErrorHandler,
  onEnd?: () => void,
): () => void {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionCtor) {
    onError('unsupported')
    return () => {}
  }

  const recognition = new SpeechRecognitionCtor()
  recognition.lang = 'fr-FR'
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0]?.[0]?.transcript ?? ''
    onResult(transcript)
  }
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    onError(event.error)
  }
  recognition.onend = () => {
    onEnd?.()
  }

  try {
    recognition.start()
  } catch {
    onError('start-failed')
  }

  return () => {
    try {
      recognition.stop()
    } catch {
      // ignore
    }
  }
}

export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechSynthesisSupported()) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  utterance.rate = 0.95
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
}
