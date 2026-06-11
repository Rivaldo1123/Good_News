// Uploads an image file to the GitHub repo under dist/uploads/ via the
// Contents API, using the same token/repo the publish flow uses. Because
// dist/ is Netlify's publish directory, the file is served at /uploads/<name>
// after the deploy that the commit triggers.

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB — GitHub Contents API is happiest well under this

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
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB — please compress it first.`)
  }

  const token = sessionStorage.getItem('gh_token') ?? ''
  const repo = localStorage.getItem('gh_repo') ?? 'Rivaldo1123/Good_News'
  if (!token) {
    throw new Error('Add your GitHub Personal Access Token in the Security section first.')
  }

  const filename = safeName(file.name)
  const path = `dist/uploads/${filename}`
  const content = await fileToBase64(file)

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `Upload image ${filename}`, content }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Upload failed (HTTP ${res.status})`)
  }

  return `/uploads/${filename}`
}
