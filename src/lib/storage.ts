import type { Transaction } from './types'

const TRANSACTIONS_KEY = 'omega.transactions'

export function getTransactions(): Transaction[] {
  const raw = localStorage.getItem(TRANSACTIONS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Transaction[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTransaction(transaction: Transaction): void {
  const all = getTransactions()
  all.unshift(transaction)
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(all))
}

export function updateTransaction(id: string, patch: Partial<Transaction>): void {
  const all = getTransactions()
  const index = all.findIndex((t) => t.id === id)
  if (index === -1) return
  all[index] = { ...all[index], ...patch }
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(all))
}
