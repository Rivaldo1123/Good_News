import Alpine from 'alpinejs'
import netlifyIdentity from 'netlify-identity-widget'
import { adminStore } from './store'

// Register the Alpine store before start()
Alpine.data('admin', adminStore)

// Initialise Netlify Identity (reads the gotrue-instance attr from the page or
// falls back to the current site's identity endpoint)
netlifyIdentity.init()

// Expose on window so Alpine templates can call netlifyIdentity.open() etc.
;(window as any).netlifyIdentity = netlifyIdentity
;(window as any).Alpine = Alpine

Alpine.start()
