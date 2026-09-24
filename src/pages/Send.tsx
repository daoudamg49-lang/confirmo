import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OperatorBadge } from '../components/OperatorBadge'
import { PinPad } from '../components/PinPad'
import { VoiceInputField } from '../components/VoiceInputField'
import { formatFcfa, parseSpokenAmount, parseSpokenDigits } from '../lib/frenchNumbers'
import { tapFeedback } from '../lib/haptics'
import {
  cleanTogoNumber,
  detectOperator,
  formatTogoNumber,
  isValidTogoMobileNumber,
  spellOutDigits,
} from '../lib/operator'
import { getMarginRule, getMyNumber, getMyOperator, suggestClientCharge } from '../lib/settings'
import { buildUssdPlan } from '../lib/ussd'
import { speak } from '../lib/voice'
import { useWallet } from '../state/WalletContext'
import type { OperationType, Transaction } from '../lib/types'

type Step =
  | 'type'
  | 'number'
  | 'confirmNumber'
  | 'amount'
  | 'confirmAmount'
  | 'fees'
  | 'review'
  | 'pin'
  | 'processing'
  | 'result'

const TYPE_INFO: Record<OperationType, { title: string; icon: string; numberLabel: string; amountLabel: string }> = {
  depot: {
    title: 'Dépôt',
    icon: '⬇️',
    numberLabel: 'Numéro du client à créditer',
    amountLabel: 'Montant du dépôt (FCFA)',
  },
  retrait: {
    title: 'Retrait',
    icon: '⬆️',
    numberLabel: 'Numéro du client qui vous envoie l’argent',
    amountLabel: 'Montant du retrait (FCFA)',
  },
  transfert: {
    title: 'Transfert',
    icon: '↗️',
    numberLabel: 'Numéro du destinataire final',
    amountLabel: 'Montant à envoyer (FCFA)',
  },
}

export function Send() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isNative, previewOperatorFee, startOperation, retrySmsCapture, resolveManually } = useWallet()

  const presetType = searchParams.get('type') as OperationType | null
  const [step, setStep] = useState<Step>(presetType ? 'number' : 'type')
  const [operationType, setOperationType] = useState<OperationType>(presetType ?? 'transfert')
  const [numberInput, setNumberInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [clientChargeInput, setClientChargeInput] = useState('')
  const [pin, setPin] = useState('')
  const [result, setResult] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const info = TYPE_INFO[operationType]
  const cleanedNumber = cleanTogoNumber(numberInput)
  const operator = detectOperator(cleanedNumber)
  const numberValid = isValidTogoMobileNumber(cleanedNumber)
  const amount = parseInt(amountInput.replace(/[^\d]/g, ''), 10) || 0
  const amountValid = amount > 0
  const clientCharge = parseInt(clientChargeInput.replace(/[^\d]/g, ''), 10) || 0
  const isOutgoing = operationType !== 'retrait'
  const ussdPlan = isOutgoing ? buildUssdPlan(operator, getMyOperator(), cleanedNumber, amount) : null

  const feePreview = useMemo(() => {
    if (!amountValid) return null
    if (operationType === 'retrait') return { fee: 0, documented: true, note: "Vous ne payez pas de frais opérateur sur l'argent que vous recevez." }
    return previewOperatorFee(amount)
  }, [amountValid, operationType, amount, previewOperatorFee])

  const margin = clientCharge - (feePreview?.fee ?? 0)

  useEffect(() => {
    if (step === 'confirmNumber') {
      speak(
        `Vous allez ${operationType === 'retrait' ? 'recevoir de l’argent du' : 'envoyer de l’argent au'} numéro ${spellOutDigits(cleanedNumber)}, chez ${
          operator === 'moov' ? 'Moov Money' : operator === 'yas' ? 'Mixx by Yas' : 'un opérateur non identifié'
        }. Est-ce correct ?`,
      )
    }
    if (step === 'confirmAmount') {
      speak(`Le montant est de ${amount} francs C F A. Confirmez-vous ?`)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function proceedToFees() {
    const fee = operationType === 'retrait' ? 0 : previewOperatorFee(amount).fee
    setClientChargeInput(String(suggestClientCharge(fee, amount, getMarginRule())))
    setStep('fees')
  }

  async function handleConfirmSend(enteredPin?: string) {
    setStep('processing')
    setError(null)
    try {
      const transaction = await startOperation({
        operationType,
        counterpartyNumber: cleanedNumber,
        operator,
        amount,
        clientCharge,
        pin: enteredPin,
      })
      setPin('') // never keep the PIN in memory longer than the single call that needed it
      setResult(transaction)
      if (transaction.status === 'success') speak('Opération confirmée.')
      else if (transaction.status === 'failed') speak("L'opération a échoué.")
      setStep('result')
    } catch (e) {
      setPin('')
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setStep('review')
    }
  }

  const needsInAppPin = isNative && isOutgoing

  async function handleRetryCapture() {
    if (!result) return
    setRetrying(true)
    try {
      const updated = await retrySmsCapture(result.id)
      setResult(updated)
      if (updated.status === 'success') speak('Opération confirmée.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setRetrying(false)
    }
  }

  function handleManualResolve(outcome: 'success' | 'failed') {
    if (!result) return
    resolveManually(result.id, outcome)
    setResult({ ...result, status: outcome, confirmationSource: outcome === 'success' ? 'manual' : result.confirmationSource })
  }

  function reset() {
    setStep(presetType ? 'number' : 'type')
    setNumberInput('')
    setAmountInput('')
    setClientChargeInput('')
    setPin('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-5">
      <h1 className="text-xl font-semibold">
        {info.icon} {info.title}
      </h1>

      <div key={step} className="step-enter flex flex-1 flex-col gap-6">
      {step === 'type' && (
        <div className="flex flex-col gap-3">
          {(Object.keys(TYPE_INFO) as OperationType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setOperationType(type)
                setStep('number')
              }}
              className="flex items-center gap-3 rounded-2xl border p-4 text-left"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
            >
              <span className="text-2xl">{TYPE_INFO[type].icon}</span>
              <div>
                <p className="font-semibold">{TYPE_INFO[type].title}</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {type === 'depot' && 'Un client vous donne du cash, vous le créditez sur son mobile money.'}
                  {type === 'retrait' && 'Un client vous envoie de l’argent, vous lui donnez du cash.'}
                  {type === 'transfert' && "Vous envoyez de l'argent à un tiers pour le compte d'un client."}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 'number' && (
        <div className="flex flex-col gap-4">
          <VoiceInputField
            label={info.numberLabel}
            value={numberInput}
            onChange={setNumberInput}
            parseTranscript={(t) => {
              const digits = parseSpokenDigits(t)
              return digits.length >= 8 ? digits : null
            }}
            placeholder="Ex : 90 12 34 56"
            inputMode="tel"
            helperText="Saisissez au clavier ou appuyez sur le micro pour dicter le numéro, chiffre par chiffre."
            autoFocus
          />
          {numberInput.length > 0 && (
            <div className="flex items-center gap-2">
              <OperatorBadge operator={operator} />
              {!numberValid && (
                <span className="text-sm" style={{ color: 'var(--color-danger)' }}>
                  Numéro togolais invalide (8 chiffres attendus)
                </span>
              )}
            </div>
          )}
          <PrimaryButton disabled={!numberValid} onClick={() => setStep('confirmNumber')}>
            Continuer
          </PrimaryButton>
          {!presetType && <SecondaryButton onClick={() => setStep('type')}>Retour</SecondaryButton>}
        </div>
      )}

      {step === 'confirmNumber' && (
        <Card>
          <p style={{ color: 'var(--color-text-muted)' }}>Vérifiez bien ce numéro avant de continuer</p>
          <p className="text-3xl font-bold tracking-widest">{formatTogoNumber(cleanedNumber)}</p>
          <OperatorBadge operator={operator} />
          <button
            type="button"
            onClick={() =>
              speak(`${spellOutDigits(cleanedNumber)}, chez ${operator === 'moov' ? 'Moov Money' : 'Mixx by Yas'}`)
            }
            className="text-sm underline"
            style={{ color: 'var(--color-primary)' }}
          >
            🔊 Réécouter le numéro
          </button>
          <div className="flex w-full flex-col gap-3">
            <PrimaryButton onClick={() => setStep('amount')}>Oui, ce numéro est correct</PrimaryButton>
            <SecondaryButton onClick={() => setStep('number')}>Non, corriger le numéro</SecondaryButton>
          </div>
        </Card>
      )}

      {step === 'amount' && (
        <div className="flex flex-col gap-4">
          <VoiceInputField
            label={info.amountLabel}
            value={amountInput}
            onChange={setAmountInput}
            parseTranscript={(t) => {
              const parsed = parseSpokenAmount(t)
              return parsed ? String(parsed) : null
            }}
            placeholder="Ex : 5000"
            inputMode="numeric"
            helperText='Dictez un montant, par exemple "cinq mille francs".'
            autoFocus
          />
          <PrimaryButton disabled={!amountValid} onClick={() => setStep('confirmAmount')}>
            Continuer
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep('number')}>Retour</SecondaryButton>
        </div>
      )}

      {step === 'confirmAmount' && (
        <Card>
          <p style={{ color: 'var(--color-text-muted)' }}>Vérifiez bien ce montant avant de continuer</p>
          <p className="text-4xl font-bold">{formatFcfa(amount)}</p>
          <button
            type="button"
            onClick={() => speak(`${amount} francs C F A`)}
            className="text-sm underline"
            style={{ color: 'var(--color-primary)' }}
          >
            🔊 Réécouter le montant
          </button>
          <div className="flex w-full flex-col gap-3">
            <PrimaryButton onClick={proceedToFees}>Oui, ce montant est correct</PrimaryButton>
            <SecondaryButton onClick={() => setStep('amount')}>Non, corriger le montant</SecondaryButton>
          </div>
        </Card>
      )}

      {step === 'fees' && feePreview && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border p-3.5 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
            <p>
              Frais opérateur réel : <strong>{formatFcfa(feePreview.fee)}</strong>
            </p>
            {feePreview.note && (
              <p className="mt-1" style={{ color: feePreview.documented ? 'var(--color-text-muted)' : 'var(--color-danger)' }}>
                {feePreview.documented ? '' : '⚠️ '}
                {feePreview.note}
              </p>
            )}
          </div>

          <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Montant que vous facturez au client (FCFA)
          </label>
          <input
            inputMode="numeric"
            value={clientChargeInput}
            onChange={(e) => setClientChargeInput(e.target.value)}
            className="rounded-xl border px-4 py-3 text-lg outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />

          <div className="rounded-2xl p-3.5 text-sm" style={{ background: 'var(--color-primary-soft)' }}>
            <p>
              Votre gain sur cette opération :{' '}
              <strong style={{ color: margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {formatFcfa(margin)}
              </strong>
            </p>
          </div>

          <PrimaryButton disabled={clientCharge <= 0} onClick={() => setStep('review')}>
            Continuer
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep('confirmAmount')}>Retour</SecondaryButton>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-3xl border p-4"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            <Row label="Opération" value={`${info.icon} ${info.title}`} />
            <Row label={operationType === 'retrait' ? 'Client' : 'Destinataire'} value={formatTogoNumber(cleanedNumber)} />
            <Row label="Opérateur" value={<OperatorBadge operator={operator} />} />
            <Row label="Montant" value={formatFcfa(amount)} />
            <Row label="Frais opérateur (réel)" value={formatFcfa(feePreview?.fee ?? 0)} />
            <Row label="Facturé au client" value={formatFcfa(clientCharge)} />
            <Row label="Votre gain" value={<strong>{formatFcfa(margin)}</strong>} />
          </div>

          {operationType === 'retrait' && getMyNumber() && (
            <div className="rounded-2xl border p-3.5 text-sm" style={{ borderColor: 'var(--color-info)', background: 'var(--color-primary-soft)' }}>
              📱 Donnez ce numéro au client pour qu'il vous envoie l'argent :{' '}
              <strong>{formatTogoNumber(getMyNumber())}</strong>
            </div>
          )}

          {needsInAppPin && ussdPlan && (
            <div className="rounded-2xl border p-3.5 text-sm" style={{ borderColor: 'var(--color-info)', background: 'var(--color-primary-soft)' }}>
              <p className="font-medium">📟 Requête USSD qui sera envoyée :</p>
              <p className="mt-1 font-mono text-base">{ussdPlan.displayCode}</p>
              <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
                À l'étape suivante, vous saisirez votre code secret {ussdPlan.menuLabel} directement dans Confirmo —
                il n'est jamais enregistré, seulement transmis à cette unique opération.
              </p>
            </div>
          )}

          {isNative && !isOutgoing && (
            <div className="rounded-2xl border p-3.5 text-sm" style={{ borderColor: 'var(--color-info)', background: 'var(--color-primary-soft)' }}>
              L'appli va attendre le SMS confirmant la réception de l'argent — rien à composer de votre côté.
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}
          <PrimaryButton
            onClick={() => {
              if (needsInAppPin) setStep('pin')
              else handleConfirmSend()
            }}
          >
            {operationType === 'retrait' ? 'Attendre le paiement du client' : needsInAppPin ? 'Continuer' : 'Confirmer'}
          </PrimaryButton>
          <SecondaryButton onClick={() => setStep('fees')}>Retour</SecondaryButton>
        </div>
      )}

      {step === 'pin' && (
        <div className="flex flex-1 flex-col items-center gap-8 pt-4 text-center">
          <div>
            <p className="text-lg font-semibold">Code secret {ussdPlan?.menuLabel}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Jamais enregistré — utilisé uniquement pour cette opération.
            </p>
          </div>
          <PinPad value={pin} onChange={setPin} maxLength={6} />
          <div className="flex w-full flex-col gap-3">
            <PrimaryButton disabled={pin.length < 4} onClick={() => handleConfirmSend(pin)}>
              Valider et envoyer
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setPin('')
                setStep('review')
              }}
            >
              Retour
            </SecondaryButton>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          {!isOutgoing ? (
            <p className="font-medium">En attente du paiement du client…</p>
          ) : needsInAppPin ? (
            <div className="flex flex-col gap-1">
              <p className="font-medium">Communication avec l'opérateur…</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Si l'appli Téléphone s'ouvre à la place, entrez votre code secret là-bas puis revenez ici.
              </p>
            </div>
          ) : (
            <p>Opération en cours…</p>
          )}
        </div>
      )}

      {step === 'result' && result && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {result.status === 'success' && <p className="text-5xl">✅</p>}
          {result.status === 'failed' && <p className="text-5xl">❌</p>}
          {result.status === 'awaiting_sms' && <p className="text-5xl">⏳</p>}

          <p className="text-xl font-semibold">
            {result.status === 'success' && 'Opération confirmée'}
            {result.status === 'failed' && 'Opération échouée'}
            {result.status === 'awaiting_sms' && 'SMS pas encore reçu'}
          </p>

          {result.status === 'success' && (
            <div className="flex flex-col gap-1">
              <p style={{ color: 'var(--color-text-muted)' }}>
                {formatFcfa(result.amount)} · {formatTogoNumber(result.counterpartyNumber)}
              </p>
              <p className="text-sm">
                Gain : <strong style={{ color: 'var(--color-success)' }}>{formatFcfa(result.margin)}</strong>
              </p>
              {result.providerReference && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Référence opérateur : <strong>{result.providerReference}</strong>
                </p>
              )}
            </div>
          )}

          {result.status === 'failed' && <p style={{ color: 'var(--color-danger)' }}>{result.failureReason}</p>}

          {result.status === 'awaiting_sms' && (
            <div className="flex w-full flex-col gap-3">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {result.failureReason ?? "Le SMS de confirmation n'est pas encore arrivé."}
              </p>
              <SecondaryButton onClick={handleRetryCapture}>
                {retrying ? 'Écoute en cours…' : '🔁 Réessayer la capture du SMS'}
              </SecondaryButton>
              <div className="flex gap-3">
                <SecondaryButton onClick={() => handleManualResolve('success')}>✅ C'est passé</SecondaryButton>
                <SecondaryButton onClick={() => handleManualResolve('failed')}>❌ Ça a échoué</SecondaryButton>
              </div>
            </div>
          )}

          <div className="mt-2 flex w-full flex-col gap-3">
            <PrimaryButton onClick={reset}>Nouvelle opération</PrimaryButton>
            <SecondaryButton onClick={() => navigate('/history')}>Voir l'historique</SecondaryButton>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center gap-6 rounded-3xl border p-6 pt-8 text-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => {
        tapFeedback()
        onClick()
      }}
      disabled={disabled}
      className="rounded-2xl py-3.5 text-base font-semibold text-white transition-all duration-150 disabled:opacity-40 active:scale-[0.96]"
      style={{ background: 'var(--color-primary)' }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        tapFeedback()
        onClick()
      }}
      className="flex-1 rounded-2xl border py-3.5 text-base font-medium transition-all duration-150 active:scale-[0.96]"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    >
      {children}
    </button>
  )
}
