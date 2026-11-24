import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerPwaServiceWorker } from '../registerPwaServiceWorker'

describe('registerPwaServiceWorker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registers immediately when the Vite helper is available', () => {
    const unregister = vi.fn()
    const registerSW = vi.fn(() => unregister)

    expect(registerPwaServiceWorker(registerSW)).toBe(unregister)
    expect(registerSW).toHaveBeenCalledWith({ immediate: true, onNeedReload: expect.any(Function) })
  })

  it('passes an onNeedReload that does not reload the page', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    const registerSW = vi.fn()

    registerPwaServiceWorker(registerSW)
    registerSW.mock.calls[0][0].onNeedReload()

    expect(reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('skips registration when the service worker is disabled', () => {
    const registerSW = vi.fn()

    expect(registerPwaServiceWorker(registerSW, { enabled: false })).toBeUndefined()
    expect(registerSW).not.toHaveBeenCalled()
  })

  it('does not throw when the Vite helper is missing', () => {
    expect(registerPwaServiceWorker()).toBeUndefined()
    expect(registerPwaServiceWorker(() => {
      throw new Error('virtual module unavailable')
    })).toBeUndefined()
  })
})

// Runs the REAL vite-plugin-pwa client (autoUpdate build) with a fake workbox-window,
// so it fails if a plugin upgrade or a missing onNeedReload brings back the tab reload.
describe('registerPwaServiceWorker with the real vite-plugin-pwa client', () => {
  const clientPath = createRequire(import.meta.url).resolve('vite-plugin-pwa/dist/client/build/register.js')

  const loadRegisterSW = () => {
    const source = readFileSync(clientPath, 'utf8')
      .replace('"__SW_AUTO_UPDATE__"', '"true"')
      .replace('"__SW_SELF_DESTROYING__"', '"false"')
      .replaceAll('"__SW__"', '"/sw.js"')
      .replace('"__SCOPE__"', '"/"')
      .replace('"__TYPE__"', '"classic"')
      .replace('import("workbox-window")', 'Promise.resolve({ Workbox: globalThis.__FakeWorkbox })')
      .replace(/export \{[^}]*\};?/, 'return { registerSW };')
    // eslint-disable-next-line no-new-func -- evaluates the vendored client source with the build placeholders filled in
    return new Function(source)().registerSW
  }

  const startClient = async (register) => {
    const reload = vi.fn()
    const listeners = {}
    vi.stubGlobal('location', { reload })
    vi.stubGlobal('navigator', { serviceWorker: {} })
    vi.stubGlobal('__FakeWorkbox', class {
      addEventListener (name, handler) { listeners[name] = handler }
      register () { return Promise.resolve() }
    })
    register(loadRegisterSW())
    await vi.waitFor(() => expect(listeners.activated).toBeTypeOf('function'))
    return { reload, emitActivated: (event) => listeners.activated(event) }
  }

  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['an updated worker', { isUpdate: true }],
    ['a worker from a previous build', { isExternal: true }]
  ])('does not reload the tab when %s activates', async (_name, event) => {
    const { reload, emitActivated } = await startClient(registerPwaServiceWorker)
    emitActivated(event)
    expect(reload).not.toHaveBeenCalled()
  })

  it('control: registerSW({ immediate: true }) alone would reload the tab', async () => {
    const { reload, emitActivated } = await startClient((registerSW) => registerSW({ immediate: true }))
    emitActivated({ isExternal: true })
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
