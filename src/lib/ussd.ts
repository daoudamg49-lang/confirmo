import type { Operator } from './types'

/**
 * USSD templates for launching a real transfer on the phone's native dialer. The secret PIN is
 * deliberately NEVER part of these strings — the operator's own USSD session prompts for it on
 * the next screen, which is the whole point: the code never passes through this app.
 *
 * Sourced from public operator documentation (Moov Africa Togo, Yas Togo) as of 2026-09-21.
 * Exact menu digits can change or vary by SIM/firmware — always show the user the composed
 * string before dialing, and offer the base code as a manual fallback.
 */
interface UssdTemplate {
  /** `{number}` and `{amount}` placeholders, PIN intentionally omitted. */
  sameNetwork: string
  otherNetwork: string
  /** Base code to fall back to if the shortcut doesn't work on the user's device. */
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
  /** Human-readable code, e.g. "*155*1*1*90123456*5000#" */
  displayCode: string
  /** Same code, URL-encoded for a tel: link ("#" -> "%23"). */
  telUri: string
  manualBase: string
  menuLabel: string
  crossNetwork: boolean
}

/**
 * Builds the USSD dial plan for a transfer. `myOperator` is the sender's own line — needed
 * because the same-network vs. other-network menu path differs.
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
  }
}
