import { OPERATOR_COLOR, OPERATOR_LABEL } from '../lib/operator'
import type { Operator } from '../lib/types'

export function OperatorBadge({ operator }: { operator: Operator }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
      style={{ background: OPERATOR_COLOR[operator] }}
    >
      {OPERATOR_LABEL[operator]}
    </span>
  )
}
