import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const API = 'https://api.orderingplus.com/v400/en/proj/business'
const THIRD_PARTY = 'https://third-party.example/pixel'

class FakeXhr {
  static sent = []
  constructor () { this.headers = {}; this.listeners = {} }
  open (method, url) { this.url = url }
  setRequestHeader (key, value) { this.headers[key] = value }
  addEventListener (type, fn) { (this.listeners[type] ||= []).push(fn) }
  send () {
    FakeXhr.sent.push(this)
    this.status = this.nextStatus ?? FakeXhr.status
    this.responseText = FakeXhr.body
    this.listeners.load?.forEach((fn) => fn())
  }
}

// the shims patch window.fetch / XMLHttpRequest once, on import
const boot = async (url = '/') => {
  window.history.replaceState(null, '', url)
  vi.resetModules()
  const nativeFetch = vi.fn(async () => new Response(FakeXhr.body, { status: FakeXhr.status }))
  window.fetch = nativeFetch
  window.XMLHttpRequest = FakeXhr
  await import('../network-boot')
  const preview = await import('../../utils/storePreview')
  return { nativeFetch, preview }
}

describe('network-boot store preview', () => {
  beforeEach(() => {
    window.localStorage.clear()
    FakeXhr.sent = []
    FakeXhr.status = 200
    FakeXhr.body = '{"result":[]}'
    delete window.__EDGE_XHR__
  })
  afterEach(() => vi.restoreAllMocks())

  it('captures ?preview, takes it off the URL and sends it to the API over XHR', async () => {
    await boot('/store/x?preview=tok1&a=1')
    expect(window.location.search).toBe('?a=1')

    const api = new window.XMLHttpRequest(); api.open('GET', API); api.send()
    expect(api.headers['X-Preview-Token-X']).toBe('tok1')
  })

  it('never sends it to a third party over XHR', async () => {
    await boot('/?preview=tok1')
    const other = new window.XMLHttpRequest(); other.open('GET', THIRD_PARTY); other.send()
    expect(other.headers['X-Preview-Token-X']).toBeUndefined()
  })

  it('sends it over fetch to the API only, keeping the caller headers', async () => {
    const { nativeFetch } = await boot('/?preview=tok1')

    await window.fetch(API, { headers: { 'Content-Type': 'application/json' } })
    await window.fetch(new Request(API, { headers: { 'X-A': '1' } }))
    await window.fetch(THIRD_PARTY, { headers: { a: 'b' } })

    const [, apiInit] = nativeFetch.mock.calls[0]
    expect(apiInit.headers.get('X-Preview-Token-X')).toBe('tok1')
    expect(apiInit.headers.get('Content-Type')).toBe('application/json')
    expect(nativeFetch.mock.calls[1][1].headers.get('X-Preview-Token-X')).toBe('tok1')
    expect(nativeFetch.mock.calls[1][1].headers.get('X-A')).toBe('1')
    expect(nativeFetch.mock.calls[2][1]).toEqual({ headers: { a: 'b' } })
  })

  it('sends no header when there is no token', async () => {
    const { nativeFetch } = await boot('/')
    const api = new window.XMLHttpRequest(); api.open('GET', API); api.send()
    await window.fetch(API)

    expect(api.headers).toEqual({})
    expect(nativeFetch.mock.calls[0][1]).toBeUndefined()
  })

  it('works with the storage blocked (token in memory)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    await boot('/?preview=tok1')

    const api = new window.XMLHttpRequest(); api.open('GET', API); api.send()
    expect(api.headers['X-Preview-Token-X']).toBe('tok1')
  })

  it('flags the store private on a 403 STORE_PRIVATE from the API (XHR)', async () => {
    const { preview } = await boot('/')
    FakeXhr.status = 403
    FakeXhr.body = '{"error":true,"result":["STORE_PRIVATE"]}'

    const third = new window.XMLHttpRequest(); third.open('GET', THIRD_PARTY); third.send()
    expect(preview.isStorePrivate()).toBe(false)

    const api = new window.XMLHttpRequest(); api.open('GET', API); api.send()
    expect(preview.isStorePrivate()).toBe(true)
  })

  it('flags the store private on a 403 STORE_PRIVATE from the API (fetch), leaving the body readable', async () => {
    const { preview } = await boot('/')
    FakeXhr.status = 403
    FakeXhr.body = '{"error":true,"result":["STORE_PRIVATE"]}'

    const response = await window.fetch(API)
    await vi.waitFor(() => expect(preview.isStorePrivate()).toBe(true))
    expect(await response.text()).toBe(FakeXhr.body)
  })

  it('does not flag an ordinary 403', async () => {
    const { preview } = await boot('/')
    FakeXhr.status = 403
    FakeXhr.body = '{"error":true,"result":["Unauthorized"]}'
    const api = new window.XMLHttpRequest(); api.open('GET', API); api.send()
    await window.fetch(API)
    expect(preview.isStorePrivate()).toBe(false)
  })
})
