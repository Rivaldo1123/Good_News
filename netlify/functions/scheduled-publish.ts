import type { Handler, HandlerContext, HandlerEvent } from '@netlify/functions'
import { connectLambda, getStore } from '@netlify/blobs'

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

function safeJson(cfg: unknown): string {
  return JSON.stringify(cfg)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

async function ghFetch(path: string, token: string, repo: string, opts: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'good-news-admin',
      ...(opts.headers ?? {}),
    },
  })
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    connectLambda(event as any)
    const store = getStore('church-config')

    // Load live config to check scheduledPublishAt
    const liveRaw = await store.get('config')
    if (!liveRaw) return json(200, { skipped: 'no config' })

    const liveCfg = JSON.parse(liveRaw)
    const scheduledAt: string = liveCfg.scheduledPublishAt ?? ''

    if (!scheduledAt) return json(200, { skipped: 'no schedule set' })

    const scheduledTime = new Date(scheduledAt).getTime()
    if (isNaN(scheduledTime) || scheduledTime > Date.now()) {
      return json(200, { skipped: 'not yet time', scheduledAt })
    }

    // Load draft config
    const draftRaw = await store.get('config-draft')
    if (!draftRaw) return json(200, { skipped: 'no draft to publish' })

    const draftCfg = JSON.parse(draftRaw)

    const token = process.env.GITHUB_TOKEN
    const repo = process.env.GITHUB_REPO || 'Rivaldo1123/Good_News'
    if (!token) return json(500, { error: 'GITHUB_TOKEN not configured' })

    // Fetch current dist/index.html from GitHub to get its sha
    const getRes = await ghFetch('dist/index.html', token, repo)
    if (!getRes.ok) return json(getRes.status, { error: 'Could not read dist/index.html from GitHub' })
    const currentFile = await getRes.json()
    const currentContent = Buffer.from(currentFile.content, 'base64').toString('utf-8')
    const sha: string = currentFile.sha

    // Replace the config section in the existing HTML
    const newConfig = safeJson(draftCfg)
    const updatedHtml = currentContent.replace(
      /window\.C\s*=\s*\{[\s\S]*?\};/,
      `window.C = ${newConfig};`,
    )

    const newContent = Buffer.from(updatedHtml, 'utf-8').toString('base64')
    const putRes = await ghFetch('dist/index.html', token, repo, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Scheduled publish via admin panel',
        content: newContent,
        sha,
      }),
    })

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      return json(putRes.status, { error: (err as any).message ?? 'Push failed' })
    }

    // Promote draft → live in Blobs, then clear scheduledPublishAt
    await store.set('config', draftRaw)
    draftCfg.scheduledPublishAt = ''
    await store.set('config', JSON.stringify(draftCfg))

    return json(200, { ok: true, publishedAt: new Date().toISOString() })
  } catch (e: any) {
    return json(500, { error: e?.message ?? String(e) })
  }
}
