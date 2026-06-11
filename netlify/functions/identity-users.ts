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
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? '',
          roles: (u.app_metadata?.roles as string[]) ?? [],
          confirmed: !!u.confirmed_at,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        })),
      })
    }

    // UPDATE a user (roles and/or name)
    if (event.httpMethod === 'PATCH') {
      if (!event.body) return json(400, { error: 'Request body required' })
      const { userId, roles: newRoles, name } = JSON.parse(event.body) as {
        userId: string
        roles?: string[]
        name?: string
      }
      if (!userId) return json(400, { error: 'userId is required' })

      const body: Record<string, unknown> = {}
      if (Array.isArray(newRoles)) {
        const allowed = ['admin', 'editor']
        body.app_metadata = { roles: newRoles.filter((r) => allowed.includes(r)) }
      }
      if (typeof name === 'string') {
        body.user_metadata = { full_name: name.trim() }
      }

      const res = await fetch(`${identityUrl}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${operatorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return json(res.status, { error: (err as any).message ?? `Identity API ${res.status}` })
      }
      const updated = await res.json()
      return json(200, {
        id: updated.id,
        email: updated.email,
        name: updated.user_metadata?.full_name ?? updated.user_metadata?.name ?? '',
        roles: (updated.app_metadata?.roles as string[]) ?? [],
      })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) })
  }
}
