import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
export const BASE = '/tracking/internal'
export const COOKIE = 'tracking_internal_session'
export const MAX_AGE = 365 * 24 * 60 * 60
const secret = () => process.env.TRACKING_INTERNAL_SESSION_SECRET || ''
export function configured() { return secret().length >= 32 && !!process.env.TRACKING_INTERNAL_PASSWORD_HASH }
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url') }
export function issueSession(now = Date.now()) {
 const body = `${Math.floor(now / 1000) + MAX_AGE}.${randomBytes(16).toString('base64url')}`
 return `${body}.${sign(body)}`
}
export function validSession(token: string | undefined, now = Date.now()) {
 if (!configured() || !token || token.length > 200) return false
 const parts = token.split('.')
 if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false
 const expires = Number(parts[0]), current = Math.floor(now / 1000)
 if (expires <= current || expires > current + MAX_AGE + 60) return false
 const expected = Buffer.from(sign(parts.slice(0, 2).join('.'))), actual = Buffer.from(parts[2])
 return expected.length === actual.length && timingSafeEqual(expected, actual)
}
export function validPassword(password: string) {
 if (!configured() || !password || password.length > 128) return false
 const [version, salt, stored] = (process.env.TRACKING_INTERNAL_PASSWORD_HASH || '').split(':')
 if (version !== 'scrypt1' || !salt || !stored) return false
 const expected = Buffer.from(stored, 'base64url'), actual = scryptSync(password, salt, 64)
 return expected.length === actual.length && timingSafeEqual(expected, actual)
}
