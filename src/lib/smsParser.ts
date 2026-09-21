import type { ParsedSmsInfo } from './types'

/**
 * Best-effort parser for Flooz / Mixx by Yas confirmation SMS. Operators don't publish a
 * fixed template and wording can change, so every field is optional and matched with several
 * fallback patterns. Never throws — an SMS that matches nothing still returns `{ raw }` so the
 * transaction can be reviewed manually instead of silently failing.
 */
export function parseConfirmationSms(text: string): ParsedSmsInfo {
  const raw = text.trim()

  const providerReference = firstMatch(raw, [
    /(?:id|réf(?:érence)?|ref)\s*(?:de\s*(?:la\s*)?transaction)?\s*[:.]?\s*([A-Z0-9.-]{6,})/i,
    /transaction\s*(?:n[°o]|numéro)?\s*[:.]?\s*([A-Z0-9.-]{6,})/i,
  ])

  const withdrawalCode = firstMatch(raw, [
    /code\s*(?:de\s*)?retrait\s*[:.]?\s*(\d{4,8})/i,
    /code\s*secret\s*[:.]?\s*(\d{4,8})/i,
  ])

  const amount = firstAmount(raw, [
    /(?:vous\s*avez\s*)?(?:envoyé|transféré)\s*(?:un\s*montant\s*de\s*)?([\d\s.,]+)\s*(?:f\s*cfa|fcfa|xof|f\b)/i,
    /montant\s*[:.]?\s*([\d\s.,]+)\s*(?:f\s*cfa|fcfa|xof|f\b)/i,
  ])

  const fee = firstAmount(raw, [/frais\s*[:.]?\s*([\d\s.,]+)\s*(?:f\s*cfa|fcfa|xof|f\b)/i])

  const balanceAfter = firstAmount(raw, [
    /nouveau\s*solde\s*[:.]?\s*([\d\s.,]+)\s*(?:f\s*cfa|fcfa|xof|f\b)/i,
    /solde\s*(?:disponible|actuel)?\s*[:.]?\s*([\d\s.,]+)\s*(?:f\s*cfa|fcfa|xof|f\b)/i,
  ])

  const dateTime = firstMatch(raw, [
    /(\d{2}[/-]\d{2}[/-]\d{2,4}\s+\d{1,2}[:h]\d{2}(?::\d{2})?)/i,
    /(\d{1,2}[:h]\d{2}(?::\d{2})?\s+(?:le\s*)?\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ])

  return {
    providerReference: providerReference ?? undefined,
    withdrawalCode: withdrawalCode ?? undefined,
    amount: amount ?? undefined,
    fee: fee ?? undefined,
    balanceAfter: balanceAfter ?? undefined,
    dateTime: dateTime ?? undefined,
    raw,
  }
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function firstAmount(text: string, patterns: RegExp[]): number | null {
  const match = firstMatch(text, patterns)
  if (!match) return null
  const digits = match.replace(/[^\d]/g, '')
  if (!digits) return null
  const value = parseInt(digits, 10)
  return Number.isFinite(value) ? value : null
}

/** True when the parser found at least one usable field beyond the raw text. */
export function hasUsefulData(info: ParsedSmsInfo): boolean {
  return Boolean(
    info.providerReference || info.withdrawalCode || info.amount || info.fee || info.balanceAfter || info.dateTime,
  )
}
