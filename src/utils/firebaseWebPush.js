// Firebase web push. This module stays light: firebase/app and
// firebase/messaging are imported dynamically, only when push is enabled and
// the person granted notifications, so they never reach the entry chunk
// (CLAUDE.md, implementation notes).

const FIREBASE_APP_NAME = 'push'
const SERVICE_WORKER_URL = '/push/firebase/firebase-messaging-sw.js'
const SERVICE_WORKER_SCOPE = '/push/firebase/'

export function getFirebaseWebConfig (configs) {
  return {
    apiKey: configs?.firebase_web_api_key?.value,
    authDomain: configs?.firebase_web_auth_domain?.value,
    projectId: configs?.firebase_web_project_id?.value,
    messagingSenderId: configs?.firebase_web_messaging_sender_id?.value,
    appId: configs?.firebase_web_app_id?.value,
    vapidKey: configs?.firebase_web_vapid_key?.value
  }
}

export function isFirebasePushEnabled (configs) {
  const config = getFirebaseWebConfig(configs)
  return configs?.firebase_push_enabled?.value === '1' &&
    !!(config.apiKey && config.projectId && config.messagingSenderId && config.appId && config.vapidKey)
}

export function getOpenedPushOrderUuid (data) {
  const orderUuid = data?.order_uuid
  if (orderUuid == null || orderUuid === '' || orderUuid === 'null') {
    return null
  }
  return orderUuid
}

export const loadFirebaseMessaging = () => Promise.all([
  import('firebase/app'),
  import('firebase/messaging')
]).then(([app, messaging]) => ({ ...app, ...messaging }))

// One setup per page: the service worker registration, the foreground
// listener and the click listener are global, whoever asks for them.
let setupPromise = null
let clickListenerAdded = false
let foregroundListenerAdded = false
let clickHandler = null

export function resetFirebasePushSetup () {
  setupPromise = null
  clickListenerAdded = false
  foregroundListenerAdded = false
  clickHandler = null
}

function addClickListener () {
  if (clickListenerAdded) return
  clickListenerAdded = true
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data?.type === 'FIREBASE_PUSH_CLICK' && clickHandler) {
      clickHandler(event.data.data || {})
    }
  })
}

async function runSetup (config) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return null
  }

  // A click on a notification of an earlier session can come while firebase
  // loads: listen from now on.
  addClickListener()

  const { vapidKey, ...appConfig } = config
  const [registration, firebase] = await Promise.all([
    navigator.serviceWorker.register(
      `${SERVICE_WORKER_URL}?config=${encodeURIComponent(JSON.stringify(appConfig))}`,
      { scope: SERVICE_WORKER_SCOPE }
    ),
    loadFirebaseMessaging()
  ])
  const { initializeApp, getApps, getApp, getMessaging, getToken, onMessage } = firebase
  const app = getApps().some((existing) => existing.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(appConfig, FIREBASE_APP_NAME)
  const messaging = getMessaging(app)

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration
  })

  if (!foregroundListenerAdded) {
    foregroundListenerAdded = true
    onMessage(messaging, (payload) => {
      const title = payload?.notification?.title
      const body = payload?.notification?.body
      if (!title && !body) return
      registration.showNotification(title || '', {
        body: body || '',
        data: payload?.data || {}
      })
    })
  }

  return token
}

/**
 * Asks for notifications, registers the push service worker, loads firebase
 * and hands the FCM token to `onToken`. Calls while one is running share it;
 * a setup that ends without a token (denied, failed) can run again.
 * `isActive` (optional) stops the callbacks of a caller that went away.
 */
export function firebasePushSetup ({ config, onToken, onNotificationClick, isActive }) {
  const active = () => !isActive || isActive()
  clickHandler = onNotificationClick
    ? (data) => { if (active()) onNotificationClick(data) }
    : null

  if (!setupPromise) {
    const current = runSetup(config).then((token) => {
      if (!token && setupPromise === current) setupPromise = null
      return token
    }, (error) => {
      if (setupPromise === current) setupPromise = null
      throw error
    })
    setupPromise = current
  }

  return setupPromise.then((token) => {
    if (token && onToken && active()) {
      onToken(token)
    }
    return token
  })
}
