export interface AuthUser {
  id: string
  username: string
  is_admin: boolean
}

const COOKIE = 'ch_sid'
const MAX_AGE = 60 * 60 * 24 * 30

export function readSessionId(cookieHeader: string | undefined): string {
  const match = `; ${cookieHeader ?? ''}`.match(/; ch_sid=([^;]*)/)
  return decodeURIComponent((match?.[1] ?? '').trim())
}

export function sessionCookie(sessionId: string, secure: boolean): string {
  const parts = [
    `${COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    `Max-Age=${MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export async function findSessionUser(db: D1Database, sessionId: string): Promise<AuthUser | null> {
  if (!sessionId) return null
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.is_admin
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .bind(sessionId)
    .first<{ id: string; username: string; is_admin: number }>()
  if (!row) return null
  return { id: row.id, username: row.username, is_admin: row.is_admin === 1 }
}
