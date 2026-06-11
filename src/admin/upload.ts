export async function uploadImage(file: File, _netlifyToken: string): Promise<string> {
  const ghToken = sessionStorage.getItem('gh_token') ?? ''
  const repo = localStorage.getItem('gh_repo') ?? 'Rivaldo1123/Good_News'

  if (!ghToken) {
    throw new Error('Add your GitHub Personal Access Token in the Security section first.')
  }

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Content = btoa(binary)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `dist/uploads/${safeName}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`
  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'Upload media via admin panel',
      content: base64Content,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message ?? 'Upload failed')
  }

  const data = await res.json()
  return data.content.download_url as string
}
