import type { Handler } from '@netlify/functions'
import { requireUser } from './_shared/auth'

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event, context) => {
  try {
    let caller: Record<string, unknown>
    try {
      caller = requireUser(event.headers.authorization, (context as any).clientContext)
    } catch {
      return json(401, { error: 'Unauthorized' })
    }

    const roles: string[] = ((caller.app_metadata as any)?.roles) ?? []
    if (!roles.includes('admin')) {
      return json(403, { error: 'Admin role required' })
    }

    const identity = (context as any).clientContext?.identity
    const operatorToken: string | undefined = identity?.token
    const identityUrl: string | undefined = identity?.url

    if (!operatorToken || !identityUrl) {
      return json(500, {
        error:
          'Identity context not available. Make sure Netlify Identity is enabled and the request includes a valid Authorization header.',
      })
    }

    // LIST users
    if (event.httpMethod === 'GET') {
      const res = await fetch(`${identityUrl}/admin/users?per_page=500`, {
        headers: { Authorization: `Bearer ${operatorToken}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return json(res.status, { error: (err as any).message ?? `Identity API ${res.status}` })
      }
      const data = await res.json()
      // Normalise to a flat array regardless of whether GoTrue returns {users:[]} or []
      const users: any[] = Array.isArray(data) ? data : (data.users ?? [])
      return json(200, {
        users: users.map((u: any) => ({
          id: u.id,
          email: u.email,
          roles: (u.app_metadata?.roles as string[]) ?? [],
          confirmed: !!u.confirmed_at,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        })),
      })
    }

    // UPDATE a user's roles
    if (event.httpMethod === 'PATCH') {
      if (!event.body) return json(400, { error: 'Request body required' })
      const { userId, roles: newRoles } = JSON.parse(event.body) as {
        userId: string
        roles: string[]
      }
      if (!userId || !Array.isArray(newRoles)) {
        return json(400, { error: 'userId and roles[] are required' })
      }
      // Only allow known role values
      const allowed = ['admin', 'editor']
      const sanitised = newRoles.filter((r) => allowed.includes(r))

      const res = await fetch(`${identityUrl}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${operatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ app_metadata: { roles: sanitised } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return json(res.status, { error: (err as any).message ?? `Identity API ${res.status}` })
      }
      const updated = await res.json()
      return json(200, {
        id: updated.id,
        email: updated.email,
        roles: (updated.app_metadata?.roles as string[]) ?? [],
      })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) })
  }
}
