/**
 * UTF-8-safe base64 encode.
 * Mirrors toBase64() from admin.html — avoids deprecated escape/unescape pattern.
 */
export function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

/**
 * UTF-8-safe base64 decode.
 * Mirrors fromBase64() from admin.html.
 */
export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
