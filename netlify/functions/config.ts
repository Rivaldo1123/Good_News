import type { Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { requireUser } from './_shared/auth'
import { DEFAULTS } from '../../src/types/config'

export default async (req: Request, _context: Context) => {
  try {
    await requireUser(req.headers.get('authorization') ?? undefined, process.env.URL!)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = getStore('church-config')

  if (req.method === 'GET') {
    try {
      const raw = await store.get('config')
      const saved: Record<string, unknown> = raw ? JSON.parse(raw) : {}
      const config = {
        ...DEFAULTS,
        ...Object.fromEntries(
          (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
            .filter((k) => k in saved)
            .map((k) => [k, saved[k]]),
        ),
      }
      return Response.json({ config })
    } catch (e: any) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      let incoming: Record<string, unknown>
      try {
        incoming = await req.json()
      } catch {
        return Response.json({ error: 'Request body is required' }, { status: 400 })
      }
      const config = Object.fromEntries(
        (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
          .filter((k) => k in incoming)
          .map((k) => [k, incoming[k]]),
      )
      await store.set('config', JSON.stringify(config))
      return Response.json({ ok: true })
    } catch (e: any) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
