import type { Transaction } from './types'

function dateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

/**
 * 1-based index of the next transfer sent today, counting only depot/transfert (you as sender —
 * a retrait doesn't count, you're the recipient). All of these ride on your single own line, so
 * this isn't split by the counterparty's operator.
 */
export function nextTransferIndexToday(transactions: Transaction[], now = new Date()): number {
  const todayKey = now.toISOString().slice(0, 10)
  const count = transactions.filter(
    (t) =>
      (t.operationType === 'depot' || t.operationType === 'transfert') &&
      t.status !== 'failed' &&
      dateKey(t.createdAt) === todayKey,
  ).length
  return count + 1
}

export interface Totals {
  count: number
  volume: number
  operatorFee: number
  clientCharge: number
  margin: number
}

function emptyTotals(): Totals {
  return { count: 0, volume: 0, operatorFee: 0, clientCharge: 0, margin: 0 }
}

function accumulate(totals: Totals, t: Transaction): Totals {
  return {
    count: totals.count + 1,
    volume: totals.volume + t.amount,
    operatorFee: totals.operatorFee + t.operatorFee,
    clientCharge: totals.clientCharge + t.clientCharge,
    margin: totals.margin + t.margin,
  }
}

/** Only completed (successful) transactions count toward earnings/volume totals. */
export function grandTotals(transactions: Transaction[]): Totals {
  return transactions.filter((t) => t.status === 'success').reduce(accumulate, emptyTotals())
}

export function dailyTotals(transactions: Transaction[]): Map<string, Totals> {
  const map = new Map<string, Totals>()
  for (const t of transactions) {
    if (t.status !== 'success') continue
    const key = dateKey(t.createdAt)
    map.set(key, accumulate(map.get(key) ?? emptyTotals(), t))
  }
  return map
}

export function totalsForDay(transactions: Transaction[], key: string): Totals {
  return transactions.filter((t) => t.status === 'success' && dateKey(t.createdAt) === key).reduce(accumulate, emptyTotals())
}
