import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { DEFAULTS } from '../../src/types/config'

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event, context) => {
  try {
    const { user } = (context as any).clientContext ?? {}
    if (!user) return json(401, { error: 'Unauthorized' })

    const store = getStore('church-config')

    if (event.httpMethod === 'GET') {
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
      return json(200, { config })
    }

    if (event.httpMethod === 'POST') {
      if (!event.body) return json(400, { error: 'Request body is required' })
      const incoming: Record<string, unknown> = JSON.parse(event.body)
      const config = Object.fromEntries(
        (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
          .filter((k) => k in incoming)
          .map((k) => [k, incoming[k]]),
      )
      await store.set('config', JSON.stringify(config))
      return json(200, { ok: true })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e), stack: e?.stack })
  }
}
