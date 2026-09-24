export type Operator = 'moov' | 'yas' | 'unknown'

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'awaiting_sms' | 'cancelled'

/** How the transaction's final details were obtained. */
export type ConfirmationSource = 'simulated' | 'sms_auto' | 'ussd_response' | 'manual'

/**
 * From the facilitator's point of view (not a registered agent — no PV/point-of-sale code):
 * - `depot`: a client hands over cash, you send that amount from your own line to the client's number.
 * - `retrait`: a client sends you money from their own phone, you hand over the equivalent cash.
 * - `transfert`: a client asks you to send money on their behalf to a third party.
 * `depot` and `transfert` both mean you dial out; `retrait` means you're the recipient, waiting.
 */
export type OperationType = 'depot' | 'retrait' | 'transfert'

export interface Transaction {
  id: string
  createdAt: string
  operationType: OperationType
  /** The other party's number: the client for depot/retrait, the final recipient for transfert. */
  counterpartyNumber: string
  operator: Operator
  amount: number
  /** The real fee the operator charges on this movement (your actual cost), per their public tariff. */
  operatorFee: number
  /** What you actually charged the client for the service (fee-equivalent they paid you). */
  clientCharge: number
  /** Your take-home on this operation: clientCharge - operatorFee. Can be 0 or negative if undercharged. */
  margin: number
  status: TransactionStatus
  note?: string
  failureReason?: string
  confirmationSource?: ConfirmationSource
  /** The operator's own transaction reference, extracted from the confirmation SMS. */
  providerReference?: string
  /** Flooz-style 6-digit withdrawal code the recipient needs, if present in the SMS. */
  withdrawalCode?: string
  /** Sender's balance as stated in the confirmation SMS, if present. */
  balanceAfterSms?: number
  /** Exact timestamp extracted from the SMS, or from the automatic-capture moment. */
  confirmedAt?: string
  /** Raw confirmation SMS text, kept for audit/troubleshooting. */
  rawSms?: string
}

export interface TransferRequest {
  counterpartyNumber: string
  operator: Operator
  amount: number
  /** Transient — used only for the single in-app USSD call, never persisted or logged. */
  pin?: string
}

export interface ParsedSmsInfo {
  providerReference?: string
  withdrawalCode?: string
  amount?: number
  fee?: number
  balanceAfter?: number
  dateTime?: string
  raw: string
}

export interface TransferResult {
  status: 'success' | 'failed' | 'awaiting_sms'
  providerReference?: string
  failureReason?: string
  smsInfo?: ParsedSmsInfo
  confirmationSource?: ConfirmationSource
}

export type MarginRuleType = 'flat' | 'percent'

export interface MarginRule {
  type: MarginRuleType
  value: number
}
