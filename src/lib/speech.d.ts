interface SpeechRecognitionEventResultItem {
  transcript: string
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionEventResultItem
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultLike[]
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}
