import Alpine from 'alpinejs'
import netlifyIdentity from 'netlify-identity-widget'
import { adminStore } from './store'

// Register the Alpine store before start()
Alpine.data('admin', adminStore)

// Initialise Netlify Identity (reads the gotrue-instance attr from the page or
// falls back to the current site's identity endpoint)
netlifyIdentity.init()

// Expose Alpine on window so Alpine devtools can find it
;(window as any).Alpine = Alpine

Alpine.start()
