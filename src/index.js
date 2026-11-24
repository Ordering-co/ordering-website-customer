import './shims/network-boot'
import React from 'react'
import ReactDOM from 'react-dom/client'
import smoothscroll from 'smoothscroll-polyfill'
import settings from './config'
import { verifyLocalMarketplaceSession } from './utils/localMarketplaceSession'

import './index.css'
import { Router } from './router'

import { OrderAlert } from './components/OrderAlert'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { SubdomainComponent } from './components/SubdomainComponent'
import { ConsentOrderingProvider } from './components/ConsentOrderingProvider'
import { CookieConsentProvider } from './contexts/CookieConsentContext'
import { CheckoutFieldsProvider } from './contexts/CheckoutFieldsContext'
import { registerSW } from 'virtual:pwa-register'
import { registerPwaServiceWorker } from './utils/registerPwaServiceWorker'
import { buildAppTheme } from './utils/appTheme'

const initialFirstLoad = (typeof window !== 'undefined' && window.__FIRST_LOAD__) || null
if (initialFirstLoad) delete window.__FIRST_LOAD__

// The theme of what renders outside App (the boot, the alerts): the site's
// when the worker injected it with first_load, else the schema's defaults.
// App gets the same envelope from the context, so buildAppTheme gives it the
// same theme without building it again (src/utils/appTheme.js).
const theme = buildAppTheme(undefined, initialFirstLoad?.theme)

const hasLocalPreview = import.meta.env.DEV && settings._local_project_pin
const LocalMarketplacePreview = import.meta.env.DEV
  ? React.lazy(() => import('./components/LocalMarketplacePreview/index.jsx'))
  : null

if (hasLocalPreview) {
  try {
    verifyLocalMarketplaceSession(settings, window.localStorage)
  } catch (error) {
    document.getElementById('root').textContent = error.message
    throw error
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <ThemeProvider theme={theme}>
    <CookieConsentProvider>
      {hasLocalPreview && (
        <React.Suspense fallback={null}>
          <LocalMarketplacePreview />
        </React.Suspense>
      )}
      <SubdomainComponent>
        <ConsentOrderingProvider Alert={OrderAlert} initialOptimizationLoad={initialFirstLoad}>
          <CheckoutFieldsProvider>
            {/* the toast is in App (AppToast), under the app's theme */}
            <Router />
          </CheckoutFieldsProvider>
        </ConsentOrderingProvider>
      </SubdomainComponent>
    </CookieConsentProvider>
  </ThemeProvider>
)

/* `smoothscroll.polyfill()` is a method that adds smooth scrolling behavior to the webpage. This
polyfill is used to provide smooth scrolling functionality in browsers that do not support it
natively. It ensures that scrolling behavior is consistent across different browsers by adding the
necessary functionality to enable smooth scrolling. */
smoothscroll.polyfill()

registerPwaServiceWorker(registerSW, { enabled: import.meta.env.PROD })

// implementation notes , mitigación: Chrome iOS no recalcula el layout viewport al girar o desplegar (src/utils/viewportResync.js).
// Solo en pantallas táctiles y fuera del chunk de entrada.
if (window.matchMedia?.('(pointer: coarse)').matches) import('./utils/viewportResync').then((m) => m.installViewportResync())

// implementation notes , diagnóstico: overlay de viewport solo en desarrollo (?viewport_debug=1)
if (import.meta.env.DEV) import('./ui/src/components/ViewportDebug/autoMount').then((m) => m.autoMountViewportDebug())
