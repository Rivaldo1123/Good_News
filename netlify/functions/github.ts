import type { Handler } from '@netlify/functions'

// Server-side GitHub writer. Holds the token as an env var (GITHUB_TOKEN) so
// it never reaches the browser. Authenticated by Netlify Identity: Netlify
// populates context.clientContext.user when a valid Identity JWT is sent in
// the Authorization header.

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event, context) => {
  try {
    const { user } = (context as any).clientContext ?? {}
    if (!user) return json(401, { error: 'Unauthorized' })
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return json(500, { error: 'GITHUB_TOKEN is not configured. Add it in Netlify → Environment variables.' })
    }
    const repo = process.env.GITHUB_REPO || 'Rivaldo1123/Good_News'

    const { path, content, encoding, message } = JSON.parse(event.body || '{}')
    if (!path || content == null) {
      return json(400, { error: 'path and content are required' })
    }
    // Reject path traversal — only allow writes inside the repo tree.
    if (path.includes('..') || path.startsWith('/')) {
      return json(400, { error: 'Invalid path' })
    }

    const b64 =
      encoding === 'base64' ? content : Buffer.from(String(content), 'utf-8').toString('base64')

    const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'good-news-admin',
    }

    // Fetch existing sha (required by GitHub to update a file in place).
    let sha: string | undefined
    const getRes = await fetch(apiBase, { headers })
    if (getRes.ok) {
      sha = (await getRes.json()).sha
    } else if (getRes.status !== 404) {
      const e = await getRes.json().catch(() => ({}))
      return json(getRes.status, { error: e.message ?? 'Could not read existing file' })
    }

    const putBody: Record<string, string> = { message: message || `Update ${path}`, content: b64 }
    if (sha) putBody.sha = sha

    const putRes = await fetch(apiBase, { method: 'PUT', headers, body: JSON.stringify(putBody) })
    if (!putRes.ok) {
      const e = await putRes.json().catch(() => ({}))
      return json(putRes.status, { error: e.message ?? 'Push failed' })
    }

    return json(200, { ok: true, path })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) })
  }
}
