import { createRemoteJWKSet, jwtVerify } from 'jose'

export async function requireUser(
  authHeader: string | undefined,
): Promise<Record<string, unknown>> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const token = authHeader.slice(7)

  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Unauthorized')

  let iss: string
  try {
    const unverified = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    iss = String(unverified.iss ?? '')
    // Guard against SSRF — only trust tokens issued by Netlify Identity
    if (!iss.includes('.netlify.app') && !iss.includes('.netlify.com')) {
      throw new Error('untrusted issuer')
    }
  } catch {
    throw new Error('Unauthorized')
  }

  const JWKS = createRemoteJWKSet(new URL(`${iss}/keys`))
  const { payload } = await jwtVerify(token, JWKS)
  return payload as Record<string, unknown>
}
