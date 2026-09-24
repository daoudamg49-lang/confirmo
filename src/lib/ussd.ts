import type { Operator } from './types'

/**
 * USSD templates for a transfer. Sourced from public operator documentation (Moov Africa Togo,
 * Yas Togo) as of 2026-09-21. Exact menu digits can change or vary by SIM/firmware — always show
 * the user the composed string before sending, and offer the base code as a manual fallback.
 *
 * Two ways to use these:
 * - `displayCode` (no PIN) is shown in the review screen for transparency, and is what's dialed
 *   via the native Dialer when the in-app USSD API isn't available on the device.
 * - `withPin()` appends the PIN for the in-app path (`UssdDialerPlugin.sendUssd`), which requires
 *   the whole request — including the PIN — in one shot since Android has no public API to
 *   continue an interactive USSD session. The PIN only ever exists in memory for this one call.
 */
interface UssdTemplate {
  /** `{number}` and `{amount}` placeholders, no PIN. */
  sameNetwork: string
  otherNetwork: string
  manualBase: string
  menuLabel: string
}

const TEMPLATES: Record<Exclude<Operator, 'unknown'>, UssdTemplate> = {
  moov: {
    sameNetwork: '*155*1*1*{number}*{amount}#',
    otherNetwork: '*155*1*2*{number}*{amount}#',
    manualBase: '*155#',
    menuLabel: 'Flooz (Moov Money)',
  },
  yas: {
    sameNetwork: '*145*1*{number}*{amount}#',
    otherNetwork: '*145*1*{number}*{amount}#',
    manualBase: '*145#',
    menuLabel: 'Mixx by Yas',
  },
}

export interface UssdPlan {
  /** Human-readable code without the PIN, e.g. "*155*1*1*90123456*5000#" */
  displayCode: string
  /** Same code, URL-encoded for a tel: link ("#" -> "%23") — Dialer fallback only. */
  telUri: string
  manualBase: string
  menuLabel: string
  crossNetwork: boolean
  /** Inserts the PIN before the final "#" for the one-shot in-app USSD call. */
  withPin: (pin: string) => string
}

/**
 * Builds the USSD plan for a transfer. `myOperator` is the sender's own line — needed because
 * the same-network vs. other-network menu path differs.
 */
export function buildUssdPlan(recipientOperator: Operator, myOperator: Operator, number: string, amount: number): UssdPlan | null {
  if (recipientOperator === 'unknown') return null
  const template = TEMPLATES[recipientOperator]
  const crossNetwork = myOperator !== 'unknown' && myOperator !== recipientOperator
  const pattern = crossNetwork ? template.otherNetwork : template.sameNetwork
  const displayCode = pattern.replace('{number}', number).replace('{amount}', String(amount))

  return {
    displayCode,
    telUri: `tel:${displayCode.replace(/#/g, '%23')}`,
    manualBase: template.manualBase,
    menuLabel: template.menuLabel,
    crossNetwork,
    withPin: (pin: string) => `${displayCode.slice(0, -1)}*${pin}#`,
  }
}
