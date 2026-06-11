import type { Handler } from '@netlify/functions'
import { connectLambda, getStore } from '@netlify/blobs'
import { DEFAULTS } from '../../src/types/config'
import { requireUser } from './_shared/auth'

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

async function bootstrapFromGitHub(repo: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/dist/index.html`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'good-news-admin',
      },
    })
    if (!res.ok) return null
    const file = await res.json()
    const html = Buffer.from(file.content, 'base64').toString('utf-8')
    const m = html.match(/window\.C\s*=\s*(\{.*\});/)
    if (!m) return null
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

export const handler: Handler = async (event, context) => {
  try {
    let user: Record<string, unknown>
    try {
      user = requireUser(event.headers.authorization, (context as any).clientContext)
    } catch {
      return json(401, { error: 'Unauthorized' })
    }
    const roles: string[] = ((user.app_metadata as any)?.roles) ?? []

    connectLambda(event as any)
    const store = getStore('church-config')

    const params = event.queryStringParameters ?? {}
    const isDraft = params.draft === '1'
    const isPublish = params.publish === '1'
    const storeKey = isDraft ? 'config-draft' : 'config'

    if (event.httpMethod === 'GET') {
      const raw = await store.get(storeKey)
      let saved: Record<string, unknown> = raw ? JSON.parse(raw) : {}

      // Blobs empty for live config → bootstrap from the deployed dist/index.html
      // so the admin always reflects the actual live site on first load / after a reset.
      if (!raw && !isDraft) {
        const token = process.env.GITHUB_TOKEN
        const repo = process.env.GITHUB_REPO || 'Rivaldo1123/Good_News'
        if (token) {
          const live = await bootstrapFromGitHub(repo, token)
          if (live) {
            saved = live
            await store.set('config', JSON.stringify(live))
          }
        }
      }

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
        if (!roles.includes('admin') && !roles.includes('editor')) {
          return json(403, { error: 'Editor or admin role required to publish' })
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
