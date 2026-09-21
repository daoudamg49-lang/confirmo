import type { Operator } from './types'

/**
 * Real operator transfer ("envoi") tariffs — this is what actually gets deducted from the
 * facilitator's own line when they send money, since they have no PV/agent code and therefore
 * always move money as an ordinary P2P transfer, never through the official agent cash-out
 * channel. Sourced from momocalc.com/fr/togo (Flooz, Mixx by Yas fee pages) as of 2026-09-21.
 *
 * The daily free allowance resets at local midnight and is counted per the facilitator's own
 * operator line, across `depot` + `transfert` operations they initiate (a `retrait` doesn't
 * count — they're the recipient, not the sender, on those).
 */
const FREE_TRANSFERS_PER_DAY: Record<Exclude<Operator, 'unknown'>, number> = {
  moov: 3,
  yas: 6,
}

/** 10% "TAF" (taxe sur les activités financières) applies to the FEE, never to the principal. */
const TAF_RATE = 0.1

export interface OperatorFeeResult {
  fee: number
  /** False when the tariff beyond the free tier isn't publicly documented — the number shown is a placeholder. */
  documented: boolean
  note?: string
}

/**
 * `transferIndexToday` is 1-based: 1 for the first transfer sent today on this line, 2 for the
 * second, etc. (including the one being priced).
 */
export function computeOperatorFee(operator: Operator, transferIndexToday: number, amount: number): OperatorFeeResult {
  if (operator === 'unknown') return { fee: 0, documented: false, note: 'Opérateur non identifié' }

  const freeAllowance = FREE_TRANSFERS_PER_DAY[operator]
  if (transferIndexToday <= freeAllowance) {
    return { fee: 0, documented: true, note: `Transfert gratuit (${transferIndexToday}/${freeAllowance} aujourd'hui)` }
  }

  if (operator === 'moov') {
    return {
      fee: 0,
      documented: false,
      note: "Tarif Flooz au-delà du 3e transfert/jour non documenté publiquement — vérifiez le montant réellement prélevé sur votre téléphone.",
    }
  }

  // yas: 1% of the amount, plus 10% TAF tax on that fee.
  const baseFee = Math.round(amount * 0.01)
  const fee = Math.round(baseFee * (1 + TAF_RATE))
  return { fee, documented: true, note: `1% + TAF 10% sur les frais (au-delà des ${freeAllowance} transferts gratuits/jour)` }
}

/**
 * Official agent cash-out ("retrait") tariff, kept for reference only — it applies at a real,
 * registered point-of-sale (PV code), which this facilitator doesn't have. Not used to price
 * any transaction automatically.
 */
export const OFFICIAL_WITHDRAWAL_TARIFF: Record<Exclude<Operator, 'unknown'>, { upTo: number; fee: number }[]> = {
  moov: [
    { upTo: 500, fee: 50 },
    { upTo: 1000, fee: 75 },
    { upTo: 5000, fee: 100 },
    { upTo: 15000, fee: 280 },
    { upTo: 20000, fee: 320 },
    { upTo: 50000, fee: 600 },
    { upTo: 100000, fee: 1000 },
    { upTo: Infinity, fee: 3300 },
  ],
  yas: [
    { upTo: 500, fee: 50 },
    { upTo: 5000, fee: 100 },
    { upTo: 20000, fee: 300 },
    { upTo: 50000, fee: 600 },
    { upTo: 100000, fee: 1000 },
    { upTo: 200000, fee: 3100 },
    { upTo: 300000, fee: 3700 },
    { upTo: 500000, fee: 4200 },
    { upTo: Infinity, fee: 4400 },
  ],
}
