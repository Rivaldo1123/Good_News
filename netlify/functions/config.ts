import type { Handler } from '@netlify/functions'
import { connectLambda, getStore } from '@netlify/blobs'
import { DEFAULTS } from '../../src/types/config'
import { requireUser } from './_shared/auth'

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event, context) => {
  try {
    let payload: Record<string, unknown>
    try {
      payload = await requireUser(event.headers.authorization)
    } catch {
      return json(401, { error: 'Unauthorized' })
    }

    connectLambda(event as any)
    const store = getStore('church-config')

    const params = event.queryStringParameters ?? {}
    const isDraft = params.draft === '1'
    const isPublish = params.publish === '1'
    const storeKey = isDraft ? 'config-draft' : 'config'

    if (event.httpMethod === 'GET') {
      const raw = await store.get(storeKey)
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
      if (isPublish) {
        const roles: string[] = ((payload.app_metadata as any)?.roles) ?? []
        if (!roles.includes('admin')) {
          return json(403, { error: 'Admin role required to publish' })
        }
        const draftRaw = await store.get('config-draft')
        if (!draftRaw) return json(404, { error: 'No draft found' })
        await store.set('config', draftRaw)
        return json(200, { ok: true })
      }

      if (!event.body) return json(400, { error: 'Request body is required' })
      const incoming: Record<string, unknown> = JSON.parse(event.body)
      const config = Object.fromEntries(
        (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>)
          .filter((k) => k in incoming)
          .map((k) => [k, incoming[k]]),
      )
      await store.set(storeKey, JSON.stringify(config))
      return json(200, { ok: true })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e), stack: e?.stack })
  }
}
