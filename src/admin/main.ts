import Alpine from 'alpinejs'
import netlifyIdentity from 'netlify-identity-widget'
import { adminStore } from './store'

// Expose on window so Alpine templates can call netlifyIdentity.open() etc.
// init() is called inside the store after handlers are registered to avoid
// the race condition where the 'init' event fires before listeners are set up.
;(window as any).netlifyIdentity = netlifyIdentity
;(window as any).Alpine = Alpine

Alpine.data('admin', adminStore)
Alpine.start()
