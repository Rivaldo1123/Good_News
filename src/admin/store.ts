import netlifyIdentity from 'netlify-identity-widget'
import { DEFAULTS, type ChurchConfig } from '../types/config'
import { pushToGitHub } from './publish'
import { uploadImage as uploadImageToRepo } from './upload'
import { buildPageHTML } from './buildPage'

type Toast = { id: number; msg: string; type: 'ok' | 'err' | 'info' }

export function adminStore() {
  return {
    user: null as any,
    userRoles: [] as string[],
    isAdmin: false,
    isEditor: false,
    cfg: JSON.parse(JSON.stringify(DEFAULTS)) as ChurchConfig,
    section: 'general' as string,
    saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
    publishStatus: 'idle' as 'idle' | 'busy' | 'ok' | 'error',
    publishMessage: '',
    saveTimer: null as ReturnType<typeof setTimeout> | null,
    imgStatus: {} as Record<string, 'idle' | 'uploading' | 'done' | 'error'>,
    imgPreview: {} as Record<string, string>,

    // Draft mode
    draftMode: false,
    hasDraft: false,

    // Preview modal
    previewOpen: false,
    previewHtml: '',

    // Toast notifications
    toasts: [] as Toast[],
    _toastId: 0,

    // Media library
    mediaLibraryOpen: false,
    mediaFiles: [] as string[],
    mediaLoading: false,

    // Analytics
    analyticsData: null as any,
    analyticsLoading: false,
    analyticsError: '',

    // Drag-to-reorder
    dragSrcIdx: -1 as number,
    dragListName: '' as string,

    async init() {
      netlifyIdentity.on('login', (user: any) => {
        this.user = user
        this._applyUserRoles(user)
        netlifyIdentity.close()
        this.loadConfig()
      })
      netlifyIdentity.on('logout', () => {
        this.user = null
        this.userRoles = []
        this.isAdmin = false
        this.isEditor = false
        this.cfg = JSON.parse(JSON.stringify(DEFAULTS))
      })
      netlifyIdentity.on('init', (user: any) => {
        if (user) {
          this.user = user
          this._applyUserRoles(user)
          this.loadConfig()
        }
      })
      // Must call init() after registering handlers to avoid race condition on refresh.
      netlifyIdentity.init()
    },

    _applyUserRoles(user: any) {
      const roles: string[] = user?.app_metadata?.roles ?? []
      this.userRoles = roles
      this.isAdmin = roles.includes('admin')
      this.isEditor = roles.includes('editor') || this.isAdmin
    },

    getToken(): string {
      return (this.user as any)?.token?.access_token ?? ''
    },

    showToast(msg: string, type: Toast['type'] = 'ok') {
      const id = ++this._toastId
      this.toasts.push({ id, msg, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id)
      }, 3500)
    },

    async uploadImage(field: keyof ChurchConfig, event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file) return
      this.imgPreview[field as string] = URL.createObjectURL(file)
      this.imgStatus[field as string] = 'uploading'
      try {
        const url = await uploadImageToRepo(file, this.getToken())
        ;(this.cfg as any)[field] = url
        this.imgStatus[field as string] = 'done'
        this.debouncedSave()
      } catch (err: any) {
        this.imgStatus[field as string] = 'error'
        this.imgPreview[field as string] = ''
        this.showToast(err?.message ?? 'Upload failed', 'err')
      } finally {
        input.value = ''
      }
    },

    async loadConfig() {
      try {
        const qs = this.draftMode ? '?draft=1' : ''
        const res = await fetch(`/api/config${qs}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        })
        if (res.status === 401) {
          netlifyIdentity.logout()
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { config } = await res.json()
        this.cfg = { ...DEFAULTS, ...config } as ChurchConfig
      } catch (err) {
        console.error('Failed to load config:', err)
      }
    },

    toggleDraftMode() {
      this.draftMode = !this.draftMode
      this.loadConfig()
    },

    debouncedSave() {
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => this.saveConfig(), 800)
    },

    async saveConfig() {
      this.saveStatus = 'saving'
      try {
        const qs = this.draftMode ? '?draft=1' : ''
        const res = await fetch(`/api/config${qs}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getToken()}`,
          },
          body: JSON.stringify(this.cfg),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.saveStatus = 'saved'
        if (this.draftMode) this.hasDraft = true
        if (this.saveTimer) clearTimeout(this.saveTimer)
        this.saveTimer = setTimeout(() => {
          this.saveStatus = 'idle'
        }, 1800)
      } catch (err) {
        console.error('Save failed:', err)
        this.saveStatus = 'error'
      }
    },

    async publish() {
      this.publishStatus = 'busy'
      this.publishMessage = 'Pushing to GitHub…'
      try {
        if (this.draftMode) {
          this.publishMessage = 'Promoting draft to live…'
          const promRes = await fetch('/api/config?publish=1', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.getToken()}` },
          })
          if (!promRes.ok) {
            const err = await promRes.json().catch(() => ({}))
            throw new Error(err.error ?? `Promote failed (HTTP ${promRes.status})`)
          }
        }
        await pushToGitHub(this.cfg, this.publishMessage, (msg) => {
          this.publishMessage = msg
        })
        this.publishStatus = 'ok'
        this.publishMessage = 'Published! Netlify will update in ~30 seconds.'
        if (this.draftMode) this.hasDraft = false
        setTimeout(() => {
          this.publishStatus = 'idle'
          this.publishMessage = ''
        }, 4000)
      } catch (err: any) {
        this.publishStatus = 'error'
        this.publishMessage = err.message ?? 'Publish failed'
        setTimeout(() => {
          this.publishStatus = 'idle'
          this.publishMessage = ''
        }, 5000)
      }
    },

    openPreview() {
      this.previewHtml = buildPageHTML(this.cfg)
      this.previewOpen = true
    },

    async loadMediaFiles() {
      this.mediaLoading = true
      try {
        const res = await fetch('/api/media-list', {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { files } = await res.json()
        this.mediaFiles = files ?? []
      } catch (err: any) {
        this.showToast(err.message ?? 'Failed to load media', 'err')
      } finally {
        this.mediaLoading = false
      }
    },

    async copyMediaUrl(url: string) {
      try {
        await navigator.clipboard.writeText(url)
        this.showToast('URL copied to clipboard!', 'ok')
      } catch {
        this.showToast(url, 'info')
      }
    },

    async loadAnalytics() {
      this.analyticsLoading = true
      this.analyticsError = ''
      try {
        const res = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        })
        const data = await res.json()
        if (!res.ok) {
          this.analyticsError = data.error ?? 'Analytics unavailable'
          return
        }
        this.analyticsData = data.data
      } catch (err: any) {
        this.analyticsError = err.message ?? 'Failed to load analytics'
      } finally {
        this.analyticsLoading = false
      }
    },

    // Drag-to-reorder
    dragStart(listName: string, idx: number, event: DragEvent) {
      this.dragSrcIdx = idx
      this.dragListName = listName
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    },
    dragOver(event: DragEvent) {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    },
    drop(listName: string, targetIdx: number) {
      if (listName !== this.dragListName || this.dragSrcIdx === targetIdx || this.dragSrcIdx < 0) return
      const arr = [...(this.cfg as any)[listName]] as any[]
      const [moved] = arr.splice(this.dragSrcIdx, 1)
      arr.splice(targetIdx, 0, moved)
      ;(this.cfg as any)[listName] = arr
      this.dragSrcIdx = -1
      this.dragListName = ''
      this.debouncedSave()
    },

    // Rich text editor
    rteExec(cmd: string, value?: string) {
      document.execCommand(cmd, false, value ?? '')
    },
    syncRte(field: string, el: HTMLElement) {
      ;(this.cfg as any)[field] = el.innerHTML
      this.debouncedSave()
    },

    logout() {
      netlifyIdentity.logout()
    },

    // ── Announcements ──────────────────────────────────────────────
    addAnnouncement() {
      if (!this.cfg.announcements) this.cfg.announcements = []
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      this.cfg.announcements.push({ id, text: '', type: 'info', active: true })
      this.debouncedSave()
    },
    removeAnnouncement(i: number) {
      this.cfg.announcements.splice(i, 1)
      this.debouncedSave()
    },

    // ── Array helpers ──────────────────────────────────────────────
    addService() {
      this.cfg.services.push({ day: '', time: '', name: '', desc: '' })
      this.debouncedSave()
    },
    removeService(i: number) {
      this.cfg.services.splice(i, 1)
      this.debouncedSave()
    },

    addEvent() {
      this.cfg.events.push({ month: '', day: '', title: '', desc: '', color: '#6c4ecb' })
      this.debouncedSave()
    },
    removeEvent(i: number) {
      this.cfg.events.splice(i, 1)
      this.debouncedSave()
    },

    addMinistry() {
      this.cfg.ministries.push({ icon: '✝', name: '', desc: '' })
      this.debouncedSave()
    },
    removeMinistry(i: number) {
      this.cfg.ministries.splice(i, 1)
      this.debouncedSave()
    },
  }
}
