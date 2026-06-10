import { getStore } from '@netlify/blobs'
import { requireUser } from './_shared/auth'
import { DEFAULTS } from '../../src/types/config'

export const handler = async (
  event: { headers: Record<string, string | undefined>; body: string | null },
  _context: unknown,
) => {
  try {
    await requireUser(event.headers.authorization, process.env.URL!)

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      }
    }

    const incoming: Record<string, unknown> = JSON.parse(event.body)

    // Only persist keys that are part of ChurchConfig — strip any extra fields.
    const config = Object.fromEntries(
      (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
        .filter((k) => k in incoming)
        .map((k) => [k, incoming[k]]),
    )

    const store = getStore('church-config')
    await store.set('config', JSON.stringify(config))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : 500
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    }
  }
}
