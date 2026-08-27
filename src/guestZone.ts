import type { ZoneParams } from './types'
import { parseZoneParams } from './zone/utils.ts'

const ZONE_KEY = 'guest-zone-params-v1'
const INTENT_KEY = 'login-intent-v1'
const SAVE_ERROR_KEY = 'guest-zone-save-error-v1'

export function loadGuestZone(): ZoneParams | null {
  try {
    const raw = sessionStorage.getItem(ZONE_KEY)
    if (!raw) return null
    return parseZoneParams(raw)
  } catch {
    return null
  }
}

export function saveGuestZone(zone: ZoneParams) {
  try {
    sessionStorage.setItem(ZONE_KEY, JSON.stringify(zone))
  } catch {
    /* ignore */
  }
}

export function clearGuestZone() {
  try {
    sessionStorage.removeItem(ZONE_KEY)
  } catch {
    /* ignore */
  }
}

export interface LoginIntent {
  returnHash: string
  save: boolean
}

export function setLoginIntent(intent: LoginIntent) {
  try {
    sessionStorage.setItem(
      INTENT_KEY,
      JSON.stringify({ returnHash: intent.returnHash, save: intent.save === true }),
    )
  } catch {
    /* ignore */
  }
}

export function peekLoginIntent(): LoginIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { returnHash?: unknown; save?: unknown }
    const returnHash =
      typeof parsed.returnHash === 'string' && parsed.returnHash.startsWith('#')
        ? parsed.returnHash
        : '#/'
    return { returnHash, save: parsed.save === true }
  } catch {
    return null
  }
}

export function consumeLoginIntent(): LoginIntent | null {
  const intent = peekLoginIntent()
  try {
    sessionStorage.removeItem(INTENT_KEY)
  } catch {
    /* ignore */
  }
  return intent
}

/** 进入登录页，并记住回来的地址；`save` 表示登录成功后自动保存本机布置图。 */
export function goToLogin(opts?: { save?: boolean }) {
  const hash = window.location.hash || '#/'
  if (hash.startsWith('#/login')) return
  setLoginIntent({ returnHash: safeReturnHash(hash), save: opts?.save === true })
  window.location.hash = '#/login'
}

export function setGuestSaveError(message: string) {
  try {
    if (message) sessionStorage.setItem(SAVE_ERROR_KEY, message)
    else sessionStorage.removeItem(SAVE_ERROR_KEY)
  } catch {
    /* ignore */
  }
}

export function readGuestSaveError(): string {
  try {
    return sessionStorage.getItem(SAVE_ERROR_KEY) ?? ''
  } catch {
    return ''
  }
}

/** 登录成功后只允许回到本应用的 hash 页，避免停在登录页。 */
export function safeReturnHash(returnHash: string | undefined): string {
  if (!returnHash || !returnHash.startsWith('#') || returnHash.startsWith('#/login')) return '#/'
  return returnHash
}

/** 未登录也能打开的页：取消登录时应回到这些页，而不是受保护地址造成来回跳。 */
export function isPublicHash(hash: string): boolean {
  const [path, id] = hash.replace(/^#\/?/, '').split('/')
  return !path || path === 'layout' || path === 'help' || path === 'signs' || (path === 'zones' && id === 'new')
}
