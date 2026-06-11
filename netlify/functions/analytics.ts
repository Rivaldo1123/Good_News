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

    const token = process.env.NETLIFY_TOKEN
    const siteId = process.env.SITE_ID
    if (!token || !siteId) {
      return json(500, {
        error: 'Analytics not configured. Add NETLIFY_TOKEN and SITE_ID to Netlify → Environment variables.',
      })
    }

    const to = new Date()
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)

    const url = `https://analytics.services.netlify.com/range/${siteId}?from=${fromStr}&to=${toStr}&timezone=UTC`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'good-news-admin',
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return json(res.status, { error: (err as any).message ?? `Analytics API returned ${res.status}` })
    }

    const data = await res.json()
    return json(200, { data })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) })
  }
}
