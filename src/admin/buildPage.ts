import rawTemplate from '../template/landing.html?raw'
import type { ChurchConfig } from '../types/config'

function escAttr(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseServiceTime(t: string): string {
  const m = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(t || '')
  if (!m) return ''
  let h = parseInt(m[1])
  const pm = /pm/i.test(m[3])
  if (pm && h !== 12) h += 12
  if (!pm && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${m[2]}`
}

function buildSchema(cfg: ChurchConfig): Record<string, unknown> {
  const desc = cfg.metaDesc || cfg.heroSub || cfg.tagline || ''
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: cfg.name || '',
    description: desc || undefined,
    url: cfg.siteUrl || undefined,
    telephone: cfg.contactPhone || undefined,
    email: cfg.contactEmail || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: cfg.contactAddress || cfg.mapAddress || '',
    },
  }

  if (cfg.ogImage) schema.image = cfg.ogImage

  const sameAs = [cfg.facebook, cfg.instagram, cfg.youtube, cfg.twitter].filter(Boolean)
  if (sameAs.length) schema.sameAs = sameAs

  const dayMap: Record<string, string> = {
    sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday',
    wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  }
  if (cfg.services?.length) {
    const hours = cfg.services
      .map((s) => {
        const day = dayMap[s.day.toLowerCase()]
        const opens = parseServiceTime(s.time)
        if (!day || !opens) return null
        return { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${day}`, opens }
      })
      .filter(Boolean)
    if (hours.length) schema.openingHoursSpecification = hours
  }

  // Strip undefined values so JSON output stays clean
  for (const k of Object.keys(schema)) {
    if (schema[k] === undefined) delete schema[k]
  }

  return schema
}

function buildHeadMeta(cfg: ChurchConfig): string {
  const title = cfg.name || 'Church'
  const desc = cfg.metaDesc || cfg.heroSub || cfg.tagline || ''
  const lines: string[] = []

  if (desc) lines.push(`  <meta name="description" content="${escAttr(desc)}"/>`)
  lines.push(`  <meta property="og:type" content="website"/>`)
  lines.push(`  <meta property="og:title" content="${escAttr(title)}"/>`)
  if (desc) lines.push(`  <meta property="og:description" content="${escAttr(desc)}"/>`)
  if (cfg.ogImage) lines.push(`  <meta property="og:image" content="${escAttr(cfg.ogImage)}"/>`)
  if (cfg.siteUrl) lines.push(`  <meta property="og:url" content="${escAttr(cfg.siteUrl)}"/>`)
  lines.push(`  <meta name="twitter:card" content="summary_large_image"/>`)
  lines.push(`  <meta name="twitter:title" content="${escAttr(title)}"/>`)
  if (desc) lines.push(`  <meta name="twitter:description" content="${escAttr(desc)}"/>`)
  if (cfg.ogImage) lines.push(`  <meta name="twitter:image" content="${escAttr(cfg.ogImage)}"/>`)
  if (cfg.siteUrl) lines.push(`  <link rel="canonical" href="${escAttr(cfg.siteUrl)}"/>`)
  lines.push(`  <script type="application/ld+json">${JSON.stringify(buildSchema(cfg))}<\/script>`)

  return lines.join('\n')
}

/**
 * Inject the given ChurchConfig into the landing page template and return
 * the final HTML string ready to be deployed as dist/index.html.
 *
 * Security: config values in the <script> block are Unicode-escaped so that
 * script-close sequences cannot break out of it.
 */
export function buildPageHTML(cfg: ChurchConfig): string {
  const safeJson = JSON.stringify(cfg)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return rawTemplate
    .replace('CHURCH_TITLE_PLACEHOLDER', escAttr(cfg.name || 'Church'))
    .replace('CHURCH_HEAD_META_PLACEHOLDER', buildHeadMeta(cfg))
    .replace('window.C = CHURCH_CONFIG_PLACEHOLDER;', `window.C = ${safeJson};`)
    .replace(/<\/SCRIPTEND>/g, '<\/script>')
}

// Re-export so it is tree-shaken together with the publish module
export { buildPageHTML as default }
