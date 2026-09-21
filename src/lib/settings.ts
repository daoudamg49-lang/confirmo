import type { MarginRule, Operator } from './types'

const MY_OPERATOR_KEY = 'omega.myOperator'
const MARGIN_RULE_KEY = 'omega.marginRule'
const MY_NUMBER_KEY = 'omega.myNumber'

export function getMyNumber(): string {
  return localStorage.getItem(MY_NUMBER_KEY) ?? ''
}

export function setMyNumber(number: string): void {
  localStorage.setItem(MY_NUMBER_KEY, number)
}

export function getMyOperator(): Operator {
  const raw = localStorage.getItem(MY_OPERATOR_KEY)
  return raw === 'moov' || raw === 'yas' ? raw : 'unknown'
}

export function setMyOperator(operator: Operator): void {
  localStorage.setItem(MY_OPERATOR_KEY, operator)
}

const DEFAULT_MARGIN_RULE: MarginRule = { type: 'flat', value: 100 }

export function getMarginRule(): MarginRule {
  const raw = localStorage.getItem(MARGIN_RULE_KEY)
  if (!raw) return DEFAULT_MARGIN_RULE
  try {
    const parsed = JSON.parse(raw) as MarginRule
    if ((parsed.type === 'flat' || parsed.type === 'percent') && typeof parsed.value === 'number') return parsed
  } catch {
    // fall through to default
  }
  return DEFAULT_MARGIN_RULE
}

export function setMarginRule(rule: MarginRule): void {
  localStorage.setItem(MARGIN_RULE_KEY, JSON.stringify(rule))
}

export function suggestClientCharge(operatorFee: number, amount: number, rule: MarginRule): number {
  const margin = rule.type === 'flat' ? rule.value : Math.round(amount * (rule.value / 100))
  return operatorFee + Math.max(0, margin)
}
