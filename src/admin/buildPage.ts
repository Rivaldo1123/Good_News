import rawTemplate from '../template/landing.html?raw'
import type { ChurchConfig } from '../types/config'

/**
 * Inject the given ChurchConfig into the landing page template and return
 * the final HTML string ready to be deployed as dist/index.html.
 *
 * Security: values are Unicode-escaped so that script-close sequences
 * (</script>, </, etc.) inside config values cannot break out of the
 * <script id="site-config"> block.
 */
export function buildPageHTML(cfg: ChurchConfig): string {
  const safeJson = JSON.stringify(cfg)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return rawTemplate
    .replace('window.C = CHURCH_CONFIG_PLACEHOLDER;', `window.C = ${safeJson};`)
    .replace(/<\/SCRIPTEND>/g, '<\/script>')
}
