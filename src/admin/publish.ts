import { buildPageHTML } from './buildPage'
import { toBase64, fromBase64 } from '../utils/base64'
import type { ChurchConfig } from '../types/config'

type ProgressCallback = (message: string) => void

async function ghPushFile(
  repo: string,
  path: string,
  content: string,
  headers: Record<string, string>,
  message: string,
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`
  const getRes = await fetch(apiUrl, { headers })
  let sha: string | undefined
  if (getRes.ok) {
    sha = (await getRes.json()).sha
  } else if (getRes.status !== 404) {
    const err = await getRes.json()
    throw new Error(err.message ?? `Cannot read ${path}`)
  }
  const encoded = toBase64(content)
  const body: Record<string, string> = { message, content: encoded }
  if (sha) body.sha = sha
  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!putRes.ok) {
    const err = await putRes.json()
    throw new Error(err.message ?? `Push of ${path} failed`)
  }
}

export async function pushToGitHub(
  cfg: ChurchConfig,
  _initialMessage: string,
  onProgress: ProgressCallback,
): Promise<void> {
  const token = sessionStorage.getItem('gh_token') ?? ''
  const repo = localStorage.getItem('gh_repo') ?? 'Rivaldo1123/Good_News'

  if (!token) {
    throw new Error('Add your GitHub Personal Access Token in the Security section first.')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  // 1. Push landing page to dist/index.html (Netlify now serves from dist/)
  onProgress('Pushing dist/index.html…')
  await ghPushFile(
    repo,
    'dist/index.html',
    buildPageHTML(cfg),
    headers,
    'Update church landing page via admin panel',
  )

  // 2. Push robots.txt
  onProgress('Pushing robots.txt…')
  const siteBase = (cfg.siteUrl ?? '').replace(/\/$/, '') || 'https://yourchurch.netlify.app'
  const robotsTxt = `User-agent: *\nDisallow: /admin.html\n\nSitemap: ${siteBase}/sitemap.xml\n`
  await ghPushFile(repo, 'robots.txt', robotsTxt, headers, 'Update robots.txt')

  // 3. Push sitemap.xml
  onProgress('Pushing sitemap.xml…')
  const today = new Date().toISOString().slice(0, 10)
  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${siteBase}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n` +
    `</urlset>\n`
  await ghPushFile(repo, 'sitemap.xml', sitemapXml, headers, 'Update sitemap.xml')
}

// Re-export fromBase64 so it is tree-shaken together with the publish module
export { fromBase64 }
