import type { Operator } from './types'

const YAS_PREFIXES = ['90', '91', '92', '93', '70', '71', '72', '73']
const MOOV_PREFIXES = ['96', '97', '98', '99', '78', '79']

/** Strips spaces, dots, dashes and a leading Togo country code (228 / +228 / 00228). */
export function cleanTogoNumber(raw: string): string {
  let digits = raw.replace(/[^\d]/g, '')
  if (digits.startsWith('00228')) digits = digits.slice(5)
  else if (digits.startsWith('228') && digits.length > 8) digits = digits.slice(3)
  return digits
}

export function isValidTogoMobileNumber(raw: string): boolean {
  const digits = cleanTogoNumber(raw)
  if (digits.length !== 8) return false
  const prefix = digits.slice(0, 2)
  return [...YAS_PREFIXES, ...MOOV_PREFIXES].includes(prefix)
}

export function detectOperator(raw: string): Operator {
  const digits = cleanTogoNumber(raw)
  if (digits.length < 2) return 'unknown'
  const prefix = digits.slice(0, 2)
  if (YAS_PREFIXES.includes(prefix)) return 'yas'
  if (MOOV_PREFIXES.includes(prefix)) return 'moov'
  return 'unknown'
}

export function formatTogoNumber(raw: string): string {
  const digits = cleanTogoNumber(raw)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

/** Reads a number out digit by digit, e.g. "9 0 1 2 3 4 5 6", for unambiguous voice read-back. */
export function spellOutDigits(raw: string): string {
  const digits = cleanTogoNumber(raw)
  return digits.split('').join(' ')
}

export const OPERATOR_LABEL: Record<Operator, string> = {
  moov: 'Moov Money (Flooz)',
  yas: 'Mixx by Yas',
  unknown: 'Opérateur inconnu',
}

export const OPERATOR_COLOR: Record<Operator, string> = {
  moov: '#0ea5e9',
  yas: '#f97316',
  unknown: '#9ca3af',
}
