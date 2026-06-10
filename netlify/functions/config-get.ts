import { getStore } from '@netlify/blobs'
import { requireUser } from './_shared/auth'
import { DEFAULTS } from '../../src/types/config'

export const handler = async (
  event: { headers: Record<string, string | undefined> },
  _context: unknown,
) => {
  try {
    await requireUser(event.headers.authorization, process.env.URL!)

    const store = getStore('church-config')
    const raw = await store.get('config')
    const saved: Record<string, unknown> = raw ? JSON.parse(raw) : {}

    // Merge saved values over DEFAULTS — only keys that exist in DEFAULTS are
    // accepted, so unknown fields in the blob cannot pollute the config.
    const config = {
      ...DEFAULTS,
      ...Object.fromEntries(
        (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
          .filter((k) => k in saved)
          .map((k) => [k, saved[k]]),
      ),
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
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
