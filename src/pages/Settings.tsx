import { useState } from 'react'
import { OperatorBadge } from '../components/OperatorBadge'
import { cleanTogoNumber, formatTogoNumber, OPERATOR_LABEL } from '../lib/operator'
import { getMarginRule, getMyNumber, getMyOperator, setMarginRule, setMyNumber, setMyOperator } from '../lib/settings'
import type { MarginRule, Operator } from '../lib/types'
import { useWallet } from '../state/WalletContext'

const OPERATOR_CHOICES: Exclude<Operator, 'unknown'>[] = ['moov', 'yas']

export function Settings() {
  const { isNative } = useWallet()
  const [myOperator, setMyOperatorState] = useState<Operator>(() => getMyOperator())
  const [myNumber, setMyNumberState] = useState(() => getMyNumber())
  const [marginRule, setMarginRuleState] = useState<MarginRule>(() => getMarginRule())

  function chooseOperator(op: Operator) {
    setMyOperator(op)
    setMyOperatorState(op)
  }

  function updateNumber(raw: string) {
    setMyNumberState(raw)
    setMyNumber(cleanTogoNumber(raw))
  }

  function updateMarginType(type: MarginRule['type']) {
    const next = { ...marginRule, type }
    setMarginRuleState(next)
    setMarginRule(next)
  }

  function updateMarginValue(value: number) {
    const next = { ...marginRule, value: Number.isFinite(value) ? value : 0 }
    setMarginRuleState(next)
    setMarginRule(next)
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <h1 className="text-xl font-semibold">Réglages</h1>

      <section className="flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div>
          <h2 className="font-semibold">Mon opérateur</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            La ligne que vous utilisez pour vos opérations. Sert à composer le bon code USSD et à calculer le vrai
            tarif opérateur qui s'applique.
          </p>
        </div>
        <div className="flex gap-3">
          {OPERATOR_CHOICES.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => chooseOperator(op)}
              className="flex-1 rounded-xl border py-3 text-sm font-medium transition"
              style={{
                borderColor: myOperator === op ? 'var(--color-primary)' : 'var(--color-border)',
                background: myOperator === op ? 'var(--color-primary-soft)' : 'transparent',
                color: 'var(--color-text)',
              }}
            >
              {OPERATOR_LABEL[op]}
            </button>
          ))}
        </div>
        {myOperator !== 'unknown' && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Sélectionné : <OperatorBadge operator={myOperator} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div>
          <h2 className="font-semibold">Mon numéro</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Affiché lors d'un retrait, pour le communiquer facilement au client qui doit vous envoyer l'argent.
          </p>
        </div>
        <input
          value={myNumber}
          onChange={(e) => updateNumber(e.target.value)}
          placeholder="Ex : 96 12 34 56"
          inputMode="tel"
          className="rounded-xl border px-4 py-2.5 outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
        {myNumber && <p className="text-sm">{formatTogoNumber(myNumber)}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div>
          <h2 className="font-semibold">Ma marge</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Ce que vous ajoutez au vrai frais opérateur pour facturer vos clients — c'est votre gain. Pré-remplit le
            montant facturé lors d'une opération, modifiable à chaque fois.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateMarginType('flat')}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
            style={{
              borderColor: marginRule.type === 'flat' ? 'var(--color-primary)' : 'var(--color-border)',
              background: marginRule.type === 'flat' ? 'var(--color-primary-soft)' : 'transparent',
            }}
          >
            Montant fixe (FCFA)
          </button>
          <button
            type="button"
            onClick={() => updateMarginType('percent')}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
            style={{
              borderColor: marginRule.type === 'percent' ? 'var(--color-primary)' : 'var(--color-border)',
              background: marginRule.type === 'percent' ? 'var(--color-primary-soft)' : 'transparent',
            }}
          >
            Pourcentage (%)
          </button>
        </div>
        <input
          type="number"
          value={marginRule.value}
          onChange={(e) => updateMarginValue(parseInt(e.target.value, 10))}
          className="rounded-xl border px-4 py-2.5 outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 className="font-semibold">Mode de fonctionnement</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {isNative
            ? "Application Android : chaque dépôt/transfert ouvre le vrai clavier USSD de votre téléphone. Le code secret est demandé par l'opérateur, jamais par cette application. La confirmation est captée automatiquement depuis le SMS reçu, via une seule autorisation système ponctuelle."
            : 'Mode navigateur : les opérations sont simulées (aucun argent réel ne bouge). Installez la version Android de Confirmo pour les opérations réelles avec capture automatique du SMS.'}
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 className="font-semibold">Confidentialité</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Votre code secret mobile money n'est jamais demandé, affiché ni stocké par Confirmo. L'application ne
          détient aucun argent — chaque opération passe par votre propre compte Flooz/Mixx. Les données restent sur
          cet appareil.
        </p>
      </section>
    </div>
  )
}
