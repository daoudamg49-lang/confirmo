/**
 * Simulated fee schedule, loosely tiered like typical Togo mobile-money transfer fees.
 * Not connected to any operator's real pricing — replace with the aggregator's fee
 * response once a real provider (e.g. Money Fusion) is wired in.
 */
export function estimateFee(amount: number): number {
  if (amount <= 0) return 0
  if (amount <= 1000) return 50
  if (amount <= 5000) return 100
  if (amount <= 10000) return 150
  if (amount <= 25000) return 250
  if (amount <= 50000) return 400
  if (amount <= 100000) return 600
  return Math.round(amount * 0.008)
}
