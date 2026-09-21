import type { TransferRequest, TransferResult } from '../types'
import type { TransferProvider } from './types'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simulates both directions of a payment. No money moves anywhere — a stand-in for the real Android provider. */
export class MockProvider implements TransferProvider {
  async send(request: TransferRequest): Promise<TransferResult> {
    await delay(1400 + Math.random() * 800)

    if (request.operator === 'unknown') {
      return { status: 'failed', failureReason: "Opérateur non reconnu pour ce numéro" }
    }
    if (Math.random() < 0.04) {
      return { status: 'failed', failureReason: "Le réseau de l'opérateur n'a pas répondu, veuillez réessayer" }
    }

    return { status: 'success', providerReference: `SIM-${Date.now().toString(36).toUpperCase()}` }
  }

  async receive(request: TransferRequest): Promise<TransferResult> {
    await delay(1800 + Math.random() * 1000)

    if (request.operator === 'unknown') {
      return { status: 'failed', failureReason: "Opérateur non reconnu pour ce numéro" }
    }

    return { status: 'success', providerReference: `SIM-${Date.now().toString(36).toUpperCase()}` }
  }
}
