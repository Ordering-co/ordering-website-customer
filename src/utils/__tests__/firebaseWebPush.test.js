import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  firebasePushSetup,
  getFirebaseWebConfig,
  getOpenedPushOrderUuid,
  isFirebasePushEnabled,
  resetFirebasePushSetup
} from '../firebaseWebPush'

const fb = vi.hoisted(() => ({
  initializeApp: vi.fn((config, name) => ({ name, config })),
  getApps: vi.fn(() => []),
  getApp: vi.fn((name) => ({ name, existing: true })),
  getMessaging: vi.fn((app) => ({ app })),
  getToken: vi.fn(async () => 'fcm-token'),
  onMessage: vi.fn()
}))

// firebase is imported dynamically by the module; vi.mock covers import() too
vi.mock('firebase/app', () => ({
  initializeApp: fb.initializeApp,
  getApps: fb.getApps,
  getApp: fb.getApp
}))
vi.mock('firebase/messaging', () => ({
  getMessaging: fb.getMessaging,
  getToken: fb.getToken,
  onMessage: fb.onMessage
}))

const configs = {
  firebase_push_enabled: { value: '1' },
  firebase_web_api_key: { value: 'key' },
  firebase_web_auth_domain: { value: 'x.firebaseapp.com' },
  firebase_web_project_id: { value: 'project' },
  firebase_web_messaging_sender_id: { value: '123' },
  firebase_web_app_id: { value: 'app' },
  firebase_web_vapid_key: { value: 'vapid' }
}
const config = getFirebaseWebConfig(configs)

let registration
let swListeners
let permission

beforeEach(() => {
  resetFirebasePushSetup()
  vi.clearAllMocks()
  fb.getApps.mockImplementation(() => [])
  fb.getToken.mockImplementation(async () => 'fcm-token')
  permission = 'granted'
  registration = { showNotification: vi.fn() }
  swListeners = []
  vi.stubGlobal('Notification', { requestPermission: vi.fn(async () => permission) })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: vi.fn(async () => registration),
      addEventListener: vi.fn((type, listener) => swListeners.push({ type, listener }))
    }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete navigator.serviceWorker
})

const clickFromServiceWorker = (data) => {
  swListeners
    .filter(({ type }) => type === 'message')
    .forEach(({ listener }) => listener({ data: { type: 'FIREBASE_PUSH_CLICK', data } }))
}

describe('firebaseWebPush helpers', () => {
  it('reads the firebase web config and whether push is on', () => {
    expect(config).toEqual({
      apiKey: 'key',
      authDomain: 'x.firebaseapp.com',
      projectId: 'project',
      messagingSenderId: '123',
      appId: 'app',
      vapidKey: 'vapid'
    })
    expect(isFirebasePushEnabled(configs)).toBe(true)
    expect(isFirebasePushEnabled({ ...configs, firebase_push_enabled: { value: '0' } })).toBe(false)
    expect(isFirebasePushEnabled({ ...configs, firebase_web_vapid_key: { value: '' } })).toBe(false)
    expect(isFirebasePushEnabled(null)).toBe(false)
  })

  it('the order a push opens', () => {
    expect(getOpenedPushOrderUuid({ order_uuid: 'abc' })).toBe('abc')
    expect(getOpenedPushOrderUuid({ order_uuid: 'null' })).toBe(null)
    expect(getOpenedPushOrderUuid({ order_uuid: '' })).toBe(null)
    expect(getOpenedPushOrderUuid(undefined)).toBe(null)
  })

  it('does not import firebase statically (it stays out of the entry chunk)', () => {
    const source = readFileSync(resolve(__dirname, '../firebaseWebPush.js'), 'utf8')
    expect(source).not.toMatch(/^\s*import[^(]*from\s+['"]firebase/m)
    expect(source).toMatch(/import\('firebase\/app'\)/)
    expect(source).toMatch(/import\('firebase\/messaging'\)/)
  })
})

describe('firebasePushSetup', () => {
  it('registers the worker, loads firebase and hands the token', async () => {
    const onToken = vi.fn()
    await expect(firebasePushSetup({ config, onToken })).resolves.toBe('fcm-token')

    const { vapidKey, ...appConfig } = config
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      `/push/firebase/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(appConfig))}`,
      { scope: '/push/firebase/' }
    )
    expect(fb.initializeApp).toHaveBeenCalledWith(appConfig, 'push')
    expect(fb.getToken).toHaveBeenCalledWith({ app: { name: 'push', config: appConfig } }, {
      vapidKey,
      serviceWorkerRegistration: registration
    })
    expect(onToken).toHaveBeenCalledWith('fcm-token')
  })

  it('reuses the push app when it exists', async () => {
    fb.getApps.mockImplementation(() => [{ name: 'push' }])
    await firebasePushSetup({ config })
    expect(fb.initializeApp).not.toHaveBeenCalled()
    expect(fb.getApp).toHaveBeenCalledWith('push')
  })

  it('without permission: no worker, no firebase, and it can ask again later', async () => {
    permission = 'denied'
    const onToken = vi.fn()
    await expect(firebasePushSetup({ config, onToken })).resolves.toBe(null)
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled()
    expect(fb.getMessaging).not.toHaveBeenCalled()
    expect(onToken).not.toHaveBeenCalled()

    permission = 'granted'
    await expect(firebasePushSetup({ config, onToken })).resolves.toBe('fcm-token')
    expect(onToken).toHaveBeenCalledWith('fcm-token')
  })

  it('without service workers it does nothing', async () => {
    delete navigator.serviceWorker
    await expect(firebasePushSetup({ config })).resolves.toBe(null)
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('calls while one runs share it: one worker, one app, one listener each', async () => {
    const first = vi.fn()
    const second = vi.fn()
    await Promise.all([
      firebasePushSetup({ config, onToken: first }),
      firebasePushSetup({ config, onToken: second })
    ])
    await firebasePushSetup({ config })

    expect(Notification.requestPermission).toHaveBeenCalledTimes(1)
    expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1)
    expect(fb.initializeApp).toHaveBeenCalledTimes(1)
    expect(fb.onMessage).toHaveBeenCalledTimes(1)
    expect(swListeners.filter(({ type }) => type === 'message')).toHaveLength(1)
    expect(first).toHaveBeenCalledWith('fcm-token')
    expect(second).toHaveBeenCalledWith('fcm-token')
  })

  it('a failed setup rejects and the next call runs again', async () => {
    fb.getToken.mockImplementationOnce(async () => { throw new Error('messaging/token-subscribe-failed') })
    await expect(firebasePushSetup({ config })).rejects.toThrow('token-subscribe-failed')
    await expect(firebasePushSetup({ config })).resolves.toBe('fcm-token')
    expect(fb.getToken).toHaveBeenCalledTimes(2)
    expect(fb.onMessage).toHaveBeenCalledTimes(1)
  })

  it('a caller that went away gets no token nor clicks', async () => {
    const onToken = vi.fn()
    const onNotificationClick = vi.fn()
    let active = true
    const pending = firebasePushSetup({ config, onToken, onNotificationClick, isActive: () => active })
    active = false
    await pending
    clickFromServiceWorker({ order_uuid: 'abc' })
    expect(onToken).not.toHaveBeenCalled()
    expect(onNotificationClick).not.toHaveBeenCalled()
  })

  it('shows foreground messages as notifications', async () => {
    await firebasePushSetup({ config })
    const handler = fb.onMessage.mock.calls[0][1]
    handler({ notification: { title: 'Order ready', body: 'Pick it up' }, data: { order_uuid: 'abc' } })
    expect(registration.showNotification).toHaveBeenCalledWith('Order ready', {
      body: 'Pick it up',
      data: { order_uuid: 'abc' }
    })
    handler({ data: { order_uuid: 'abc' } })
    expect(registration.showNotification).toHaveBeenCalledTimes(1)
  })

  it('a notification click reaches the latest caller (the push-open flow)', async () => {
    const onNotificationClick = vi.fn()
    await firebasePushSetup({ config, onNotificationClick })
    clickFromServiceWorker({ order_uuid: 'abc' })
    expect(onNotificationClick).toHaveBeenCalledWith({ order_uuid: 'abc' })

    swListeners[0].listener({ data: { type: 'OTHER' } })
    expect(onNotificationClick).toHaveBeenCalledTimes(1)
  })

  it('listens to clicks before firebase finishes loading', async () => {
    let releaseToken
    fb.getToken.mockImplementationOnce(() => new Promise((resolve) => { releaseToken = resolve }))
    const onNotificationClick = vi.fn()
    const pending = firebasePushSetup({ config, onNotificationClick })
    await vi.waitFor(() => expect(fb.getToken).toHaveBeenCalled())
    clickFromServiceWorker({ order_uuid: 'early' })
    expect(onNotificationClick).toHaveBeenCalledWith({ order_uuid: 'early' })
    releaseToken('fcm-token')
    await pending
  })
})
