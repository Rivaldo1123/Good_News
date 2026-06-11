// Uploads an image through the server-side /api/github function (which holds
// the GitHub token as an env var). The file lands in dist/uploads/ — Netlify's
// publish directory — so it is served at /uploads/<name> after deploy.

// Netlify synchronous functions cap the request body around 6 MB; base64
// inflates by ~33%, so keep the raw image under ~4 MB.
const MAX_BYTES = 4 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string // "data:<type>;base64,XXXX"
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

function safeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = (dot >= 0 ? name.slice(dot + 1) : 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image'
  return `${Date.now()}-${base}.${ext}`
}

/**
 * Upload an image to the repo and return the public path (e.g. "/uploads/123-photo.jpg").
 */
export async function uploadImage(file: File, identityToken: string): Promise<string> {
  if (!identityToken) {
    throw new Error('You must be logged in to upload images.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 4 MB — please compress it first.`)
  }

  const filename = safeName(file.name)
  const path = `dist/uploads/${filename}`
  const content = await fileToBase64(file)

  const res = await fetch('/api/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${identityToken}`,
    },
    body: JSON.stringify({ path, content, encoding: 'base64', message: `Upload image ${filename}` }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Upload failed (HTTP ${res.status})`)
  }

  return `/uploads/${filename}`
}
