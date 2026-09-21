const DIGIT_WORDS: Record<string, string> = {
  zéro: '0',
  zero: '0',
  un: '1',
  une: '1',
  deux: '2',
  trois: '3',
  quatre: '4',
  cinq: '5',
  six: '6',
  sept: '7',
  huit: '8',
  neuf: '9',
}

const UNITS: Record<string, number> = {
  zéro: 0,
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  'dix-sept': 17,
  'dix-huit': 18,
  'dix-neuf': 19,
}

const TENS: Record<string, number> = {
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9àâéèêëîïôùûüç\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Extracts a phone number spoken digit-by-digit, e.g. "neuf zéro un deux trois quatre cinq six"
 * or a mix like "90 12 34 56", into a plain digit string.
 */
export function parseSpokenDigits(text: string): string {
  const tokens = normalize(text)
  let out = ''
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      out += token
    } else if (token in DIGIT_WORDS) {
      out += DIGIT_WORDS[token]
    }
  }
  return out
}

/**
 * Parses a spoken French amount ("cinq mille", "vingt mille cinq cents", "dix mille francs")
 * or a plain numeric utterance ("5000") into an integer amount in FCFA.
 */
export function parseSpokenAmount(text: string): number | null {
  const cleaned = text.toLowerCase().replace(/francs?( cfa)?|f ?cfa|xof/g, '').trim()

  // Already numeric, possibly with spaces as thousand separators: "5 000", "20000"
  const numericOnly = cleaned.replace(/[^\d]/g, '')
  if (numericOnly && /^[\d\s]+$/.test(cleaned.replace(/\s+/g, ' '))) {
    const value = parseInt(numericOnly, 10)
    if (!Number.isNaN(value) && value > 0) return value
  }

  const tokens = normalize(cleaned)
  if (tokens.length === 0) return null

  let total = 0
  let current = 0
  let matchedAny = false

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      current += parseInt(token, 10)
      matchedAny = true
      continue
    }
    if (token === 'et') continue
    if (token in UNITS) {
      current += UNITS[token]
      matchedAny = true
    } else if (token in TENS) {
      current += TENS[token]
      matchedAny = true
    } else if (token === 'cent' || token === 'cents') {
      current = current === 0 ? 100 : current * 100
      matchedAny = true
    } else if (token === 'mille') {
      current = current === 0 ? 1000 : current * 1000
      total += current
      current = 0
      matchedAny = true
    } else if (token === 'million' || token === 'millions') {
      current = current === 0 ? 1_000_000 : current * 1_000_000
      total += current
      current = 0
      matchedAny = true
    }
  }

  total += current
  if (!matchedAny || total <= 0) return null
  return total
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}
