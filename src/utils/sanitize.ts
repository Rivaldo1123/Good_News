/**
 * HTML-escape a value for safe insertion into HTML attributes or text nodes.
 * Mirrors the e() function from the landing page template.
 */
export function e(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sanitize a URL: rejects javascript: URIs.
 * Mirrors the u() function from the landing page template.
 */
export function u(s: unknown): string {
  const str = String(s ?? '').trim();
  return /^javascript:/i.test(str) ? '#' : str;
}
