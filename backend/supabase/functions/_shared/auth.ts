const encoder = new TextEncoder()

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

const decodeBase64Url = (value: string) => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

const sign = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))))
}

export type Session = { sub: string; is_admin: boolean; exp: number }

export const issueSession = async (customer: { id: string; is_admin: boolean }) => {
  const secret = Deno.env.get('APP_SESSION_SECRET')
  if (!secret) throw new Error('APP_SESSION_SECRET is not configured')
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({ sub: customer.id, is_admin: customer.is_admin, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }))
  return `${header}.${payload}.${await sign(`${header}.${payload}`, secret)}`
}

export const requireSession = async (request: Request): Promise<Session> => {
  const token = request.headers.get('x-session-token')
  const secret = Deno.env.get('APP_SESSION_SECRET')
  if (!token || !secret) throw new Error('Unauthorized')
  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature || signature !== await sign(`${header}.${payload}`, secret)) throw new Error('Unauthorized')
  const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as Session
  if (!session.sub || typeof session.is_admin !== 'boolean' || session.exp <= Math.floor(Date.now() / 1000)) throw new Error('Session expired')
  return session
}
