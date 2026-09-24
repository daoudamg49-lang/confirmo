import { registerPlugin } from '@capacitor/core'

export interface UssdDialerPlugin {
  /** True on Android 8 (API 26) and above — TelephonyManager.sendUssdRequest isn't available below that. */
  isSupported(): Promise<{ supported: boolean }>
  /** Sends a full USSD request (including any PIN already appended) and resolves with the operator's response text. */
  sendUssd(options: { code: string }): Promise<{ response: string }>
}

/** Native-only (Android). On web this plugin isn't registered — callers must check `Capacitor.isNativePlatform()` first. */
export const UssdDialer = registerPlugin<UssdDialerPlugin>('UssdDialer')
