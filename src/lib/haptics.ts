import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/** No-ops silently on web — only real hardware feedback on native. */
export function tapFeedback(): void {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

export function successFeedback(): void {
  Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

export function errorFeedback(): void {
  Haptics.notification({ type: NotificationType.Error }).catch(() => {})
}
