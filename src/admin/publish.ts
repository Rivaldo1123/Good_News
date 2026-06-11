import { buildPageHTML } from './buildPage'
import { fromBase64 } from '../utils/base64'
import type { ChurchConfig } from '../types/config'

type ProgressCallback = (message: string) => void

// Push a file through the server-side /api/github function, which holds the
// GitHub token as an env var. The Identity access token authorizes the call.
async function ghPushFile(
  path: string,
  content: string,
  message: string,
  identityToken: string,
): Promise<void> {
  const res = await fetch('/api/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${identityToken}`,
    },
    body: JSON.stringify({ path, content, encoding: 'utf-8', message }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Push of ${path} failed`)
  }
}

export async function pushToGitHub(
  cfg: ChurchConfig,
  _initialMessage: string,
  onProgress: ProgressCallback,
  identityToken: string,
): Promise<void> {
  if (!identityToken) {
    throw new Error('You must be logged in to publish.')
  }

  // 1. Push landing page to dist/index.html (Netlify serves from dist/)
  onProgress('Pushing dist/index.html…')
  await ghPushFile(
    'dist/index.html',
    buildPageHTML(cfg),
    'Update church landing page via admin panel',
    identityToken,
  )

  // 2. Push robots.txt
  onProgress('Pushing robots.txt…')
  const siteBase = (cfg.siteUrl ?? '').replace(/\/$/, '') || 'https://yourchurch.netlify.app'
  const robotsTxt = `User-agent: *\nDisallow: /admin.html\n\nSitemap: ${siteBase}/sitemap.xml\n`
  await ghPushFile('dist/robots.txt', robotsTxt, 'Update robots.txt', identityToken)

  // 3. Push sitemap.xml
  onProgress('Pushing sitemap.xml…')
  const today = new Date().toISOString().slice(0, 10)
  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${siteBase}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n` +
    `</urlset>\n`
  await ghPushFile('dist/sitemap.xml', sitemapXml, 'Update sitemap.xml', identityToken)
}

// Re-export fromBase64 so it is tree-shaken together with the publish module
export { fromBase64 }
