import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Verify a Netlify Identity JWT from the Authorization header.
 * Throws an Error with message 'Unauthorized' when the token is absent or invalid.
 */
export async function requireUser(
  authHeader: string | undefined,
  siteUrl: string,
): Promise<Record<string, unknown>> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }
  const token = authHeader.slice(7)
  const JWKS = createRemoteJWKSet(new URL(`${siteUrl}/.netlify/identity/keys`))
  const { payload } = await jwtVerify(token, JWKS, { audience: 'netlify' })
  return payload as Record<string, unknown>
}
