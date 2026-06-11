import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { DEFAULTS } from '../../src/types/config'

export const handler: Handler = async (event, context) => {
  const { user } = (context as any).clientContext ?? {}
  if (!user) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  const store = getStore('church-config')

  if (event.httpMethod === 'GET') {
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
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      }
    } catch (e: any) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: e.message }),
      }
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Request body is required' }),
        }
      }
      const incoming: Record<string, unknown> = JSON.parse(event.body)
      const config = Object.fromEntries(
        (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
          .filter((k) => k in incoming)
          .map((k) => [k, incoming[k]]),
      )
      await store.set('config', JSON.stringify(config))
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      }
    } catch (e: any) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: e.message }),
      }
    }
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  }
}
