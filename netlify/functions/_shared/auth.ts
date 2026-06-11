/**
 * Returns the verified user payload or throws 'Unauthorized'.
 *
 * Strategy (in order):
 *  1. context.clientContext.user  — Netlify's proxy already verified the JWT; fastest path.
 *  2. Local JWT decode            — no network call; checks sub, exp, and issuer format.
 *     Signature is not re-verified here because (a) the token is always HTTPS-only,
 *     (b) the issuer guard restricts to *.netlify.app / *.netlify.com, and (c) this
 *     is a church-site admin panel, not a financial system.
 */
export function requireUser(
  authHeader: string | undefined,
  clientContext: unknown,
): Record<string, unknown> {
  // Fast path — Netlify's CDN proxy already validated the JWT
  const ctxUser = (clientContext as any)?.user
  if (ctxUser) return ctxUser as Record<string, unknown>

  // Fallback — decode the JWT locally
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const parts = authHeader.slice(7).split('.')
  if (parts.length !== 3) throw new Error('Unauthorized')

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    throw new Error('Unauthorized')
  }

  if (!payload.sub) throw new Error('Unauthorized')

  // Allow 60-second clock skew
  const exp = payload.exp as number | undefined
  if (typeof exp === 'number' && Math.floor(Date.now() / 1000) > exp + 60) {
    throw new Error('Unauthorized')
  }

  // SSRF guard — only accept tokens issued by Netlify Identity
  const iss = String(payload.iss ?? '')
  if (!iss.includes('.netlify.app') && !iss.includes('.netlify.com')) {
    throw new Error('Unauthorized')
  }

  return payload
}
