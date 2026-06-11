import { createRemoteJWKSet, jwtVerify } from 'jose'

export async function requireUser(
  authHeader: string | undefined,
  siteUrl: string,
): Promise<Record<string, unknown>> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }
  const token = authHeader.slice(7)
  const JWKS = createRemoteJWKSet(new URL(`${siteUrl}/.netlify/identity/keys`))
  // No audience check — Netlify Identity tokens use the site URL as aud, not 'netlify'
  const { payload } = await jwtVerify(token, JWKS)
  return payload as Record<string, unknown>
}
