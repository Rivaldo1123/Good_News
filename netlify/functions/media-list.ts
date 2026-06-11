import type { Handler } from '@netlify/functions'

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event, context) => {
  try {
    const { user } = (context as any).clientContext ?? {}
    if (!user) return json(401, { error: 'Unauthorized' })

    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' })

    const token = process.env.GITHUB_TOKEN
    const repo = process.env.GITHUB_REPO || 'Rivaldo1123/Good_News'
    if (!token) {
      return json(500, { error: 'GITHUB_TOKEN is not configured.' })
    }

    const apiUrl = `https://api.github.com/repos/${repo}/contents/dist/uploads`
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'good-news-admin',
      },
    })

    if (res.status === 404) {
      return json(200, { files: [] })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return json(res.status, { error: (err as any).message ?? `GitHub API returned ${res.status}` })
    }

    const entries = await res.json()
    const files: string[] = Array.isArray(entries)
      ? entries
          .filter((e: any) => e.type === 'file' && /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(e.name))
          .sort((a: any, b: any) => b.name.localeCompare(a.name))
          .map((e: any) => `/uploads/${e.name}`)
      : []

    return json(200, { files })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) })
  }
}
