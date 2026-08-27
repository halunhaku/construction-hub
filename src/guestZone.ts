import type { ZoneParams } from './types'

const KEY = 'guest-zone-params-v1'

export function loadGuestZone(): ZoneParams | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as ZoneParams
  } catch {
    return null
  }
}

export function saveGuestZone(zone: ZoneParams) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(zone))
  } catch {
    /* ignore */
  }
}
