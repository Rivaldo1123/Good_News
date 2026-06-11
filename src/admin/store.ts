import netlifyIdentity from 'netlify-identity-widget'
import { DEFAULTS, type ChurchConfig } from '../types/config'
import { pushToGitHub } from './publish'

export function adminStore() {
  return {
    user: null as any,
    cfg: JSON.parse(JSON.stringify(DEFAULTS)) as ChurchConfig,
    section: 'general' as string,
    saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
    publishStatus: 'idle' as 'idle' | 'busy' | 'ok' | 'error',
    publishMessage: '',
    saveTimer: null as ReturnType<typeof setTimeout> | null,

    async init() {
      netlifyIdentity.on('login', (user: any) => {
        this.user = user
        netlifyIdentity.close()
        this.loadConfig()
      })
      netlifyIdentity.on('logout', () => {
        this.user = null
        this.cfg = JSON.parse(JSON.stringify(DEFAULTS))
      })
      netlifyIdentity.on('init', (user: any) => {
        if (user) {
          this.user = user
          this.loadConfig()
        }
      })
      // Call init() here, after handlers are registered, so the 'init' event
      // is guaranteed to be caught on page refresh with an existing session.
      netlifyIdentity.init()
    },

    getToken(): string {
      return (netlifyIdentity.currentUser() as any)?.token?.access_token ?? ''
    },

    async loadConfig() {
      try {
        const res = await fetch('/api/config', {
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

    debouncedSave() {
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => this.saveConfig(), 800)
    },

    async saveConfig() {
      this.saveStatus = 'saving'
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getToken()}`,
          },
          body: JSON.stringify(this.cfg),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.saveStatus = 'saved'
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
        await pushToGitHub(this.cfg, this.publishMessage, (msg) => {
          this.publishMessage = msg
        })
        this.publishStatus = 'ok'
        this.publishMessage = 'Published! Netlify will update in ~30 seconds.'
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

    logout() {
      netlifyIdentity.logout()
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
