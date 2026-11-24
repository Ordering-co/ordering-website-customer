import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isLikelyBot, normalizeStorefront, parseInactiveProject, renderInactivePage } from '../../../worker/inactiveProject.js'
import { buildOwnFirstLoadCacheKey } from '../../../worker/seo.js'

const INACTIVE_TEXT = 'Your project is not active, please pay your invoice or contact the Ordering.co sales team for assistance.'
const APP_HTML = '<html><head></head><body>the app</body></html>'

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const blocked = (extra = {}) => json(401, { error: true, result: INACTIVE_TEXT, ...extra })
const detail = (reason, extra = {}) => ({ inactive_project: { reason, id: 42, name: 'Cha Sha', logo: null, ...extra } })

const scenario = {}
const fetchSpy = vi.fn()
const cache = { match: vi.fn(), put: vi.fn(), delete: vi.fn() }
const MARK_KEY = (origin) => `https://website-marketplace-v26.internal/v6/inactive?origin=${encodeURIComponent(origin)}`

class FakeHTMLRewriter {
  on () { return this }
  transform (response) { return { body: APP_HTML, status: 200, statusText: 'OK', headers: response.headers } }
}

const env = {
  PROJECT: 'chasha',
  INACTIVE_SITE_VISITS_KEY: 'test-visits-key',
  ASSETS: {
    fetch: async (request) => {
      if (new URL(request.url).pathname === '/config.json') {
        return json(200, { project: 'chasha', app_id: 'a', api: { url: 'https://api.test/', version: 'v400', language: 'en' }, use_project_domain: true })
      }
      return new Response(APP_HTML, { headers: { 'content-type': 'text/html; charset=UTF-8' } })
    }
  }
}

beforeEach(() => {
  scenario.current = () => json(200, { error: false, result: { code: 'chasha' } })
  scenario.firstLoad = () => json(200, { error: false, result: { site: { code: 'a' } } })
  scenario.notify = () => json(200, { error: false })
  scenario.storefront = () => json(404, { error: true, result: 'not found' })
  fetchSpy.mockReset().mockImplementation(async (input) => {
    const url = String(input?.url ?? input)
    if (url.endsWith('/current')) return scenario.current()
    if (url.includes('first_load')) return scenario.firstLoad()
    if (url.endsWith('/inactive_site/visits')) return json(200, { error: false })
    if (url.endsWith('/inactive_site/notify_owner')) return scenario.notify()
    if (url.endsWith('/inactive_site/storefront')) return scenario.storefront()
    return json(404, { error: true, result: 'not found' })
  })
  cache.match.mockReset().mockResolvedValue(undefined)
  cache.put.mockReset().mockResolvedValue(undefined)
  cache.delete.mockReset().mockResolvedValue(true)
  vi.stubGlobal('fetch', fetchSpy)
  // the worker runtime has crypto.subtle; jsdom's window may not
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('caches', { default: cache })
  vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
})

afterEach(() => vi.unstubAllGlobals())

// host: an own domain (resolved through /current) or localhost (preview: only first_load can tell)
const call = async (path = '/', { host = 'shop.example.com', method = 'GET', headers = {}, workerEnv = env } = {}) => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const ctx = { waitUntil: vi.fn() }
  const request = new Request(`https://${host}${path}`, { method, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 Safari', ...headers } })
  const response = await worker.fetch(request, workerEnv, ctx)
  // a background task may queue another one (the inactive mark), so wait until none is left
  for (let i = 0; i < ctx.waitUntil.mock.calls.length; i++) await ctx.waitUntil.mock.calls[i][0]
  return { response, ctx, body: await response.text() }
}

const visitCalls = () => fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/inactive_site/visits'))
const calledUrls = () => fetchSpy.mock.calls.map(([url]) => String(url))
const storefrontCalls = () => fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/inactive_site/storefront'))
const STOREFRONT_KEY = (origin) => `https://inactive-storefront.internal/v1?origin=${encodeURIComponent(origin)}`
// the cache writes of the page itself, without the store's look
const pageCachePuts = () => cache.put.mock.calls.map(([request]) => request.url).filter((url) => !url.includes('inactive-storefront'))
const withStore = (result) => { scenario.storefront = () => json(200, { error: false, result }) }

describe('worker with a project blocked for its subscription', () => {
  it.each([
    ['trial_expired', 'Your free trial has ended', 'Log in and choose a plan'],
    ['canceled', 'Your subscription was canceled', 'Log in to reactivate'],
    ['past_due', 'Your site is paused for a billing issue', 'Log in to fix billing'],
    ['inactive', 'Your site is paused', 'Log in to your account']
  ])('serves the page for %s with the reactivation link of the project', async (reason, title, cta) => {
    scenario.current = () => blocked(detail(reason))
    withStore({ theme: { primary_color: '#1f5a4c' } })
    const { response, body } = await call('/')

    expect(response.status).toBe(503)
    expect(body).toContain(title)
    expect(body).toContain(cta)
    expect(body).toContain('href="https://accounts.ordering.co/project/42/reactivate"')
    expect(body).toContain('Cha Sha')
    expect(body).toContain('>CS<')
    expect(body).toContain('Let Cha Sha know')
    expect(body).not.toContain('the app')
  })

  it('without inactive_project, a 401 saying "not active" gets the generic page', async () => {
    scenario.current = () => blocked()
    const { response, body } = await call('/')

    expect(response.status).toBe(503)
    expect(body).toContain('Your site is paused')
    expect(body).toContain('href="https://accounts.ordering.co/projects"')
    expect(body).toContain('Online ordering is paused')
    expect(body).toContain('Let the restaurant know')
    expect(body).not.toContain('class="logo"')
  })

  it('uses ACCOUNTS_URL and the project logo when given', async () => {
    scenario.current = () => blocked(detail('canceled', { logo: 'https://cdn.test/logo.png' }))
    withStore({ theme: { primary_color: '#1f5a4c' } })
    const { body } = await call('/', { workerEnv: { ...env, ACCOUNTS_URL: 'https://accounts.example.test/' } })

    expect(body).toContain('href="https://accounts.example.test/project/42/reactivate"')
    expect(body).toContain('<img class="logo" src="https://cdn.test/logo.png" alt="Cha Sha">')
  })

  it.each([
    ['a 401 saying the project does not exist', () => json(401, { error: true, result: 'The project does not exist.' })],
    ['a 404', () => json(404, { error: true, result: 'not found' })],
    ['a 500', () => json(500, { error: true, result: 'boom' })]
  ])('does not serve the page for %s (today\'s behavior)', async (_label, failure) => {
    scenario.current = failure
    const { response, body } = await call('/')

    expect(response.status).toBe(200)
    expect(body).toBe(APP_HTML)
    expect(visitCalls()).toHaveLength(0)
  })

  it('leaves an active project untouched: same requests and same cache writes as before this feature', async () => {
    const { response, body } = await call('/')

    expect(response.status).toBe(200)
    expect(body).toBe(APP_HTML)
    expect(response.headers.get('retry-after')).toBeNull()
    // recorded from the worker before implementation notes (dcc7e527) with this same scenario
    // sorted: first_load and the boot i18n requests run at once, their order is not part of the contract
    expect(calledUrls().map((url) => url.replace('https://api.test/v400/en/', '').split('?')[0]).sort()).toEqual([
      '_/current',
      'chasha/frontends/first_load',
      'chasha/languages',
      'chasha/seo/general',
      'chasha/translations'
    ])
    expect(cache.put.mock.calls.map(([request]) => request.url)).toEqual([
      'https://website-marketplace-v26.internal/v6/current?project=_&origin=https%3A%2F%2Fshop.example.com',
      buildOwnFirstLoadCacheKey('https://shop.example.com')
    ])
    expect(visitCalls()).toHaveLength(0)
  })

  it('a first_load 401 saying the project does not exist is not the inactive page', async () => {
    scenario.firstLoad = () => json(401, { error: true, result: 'This project does not exist' })
    const { response, body } = await call('/', { host: 'localhost' })

    expect(response.status).toBe(200)
    expect(body).toBe(APP_HTML)
    expect(visitCalls()).toHaveLength(0)
  })

  describe('a project whose database is archived (410 project_database_archived)', () => {
    const archived = () => json(410, { error: true, result: 'The project database is archived.', error_codes: ['project_database_archived'] })

    it('serves the canceled page without an id through /current, linking the owner to the projects list', async () => {
      scenario.current = archived
      const { response, body } = await call('/')

      expect(response.status).toBe(503)
      expect(body).toContain('Your subscription was canceled')
      expect(body).toContain('href="https://accounts.ordering.co/projects"')
      expect(body).not.toContain('the app')
      expect(body).toContain('<body class="v-c">')
      expect(storefrontCalls()).toHaveLength(0) // archived: the generic page, the store is not asked
    })

    it('serves it through first_load on a preview host', async () => {
      scenario.firstLoad = archived
      const { response, body } = await call('/', { host: 'localhost' })

      expect(response.status).toBe(503)
      expect(body).toContain('Your subscription was canceled')
      expect(body).toContain('href="https://accounts.ordering.co/projects"')
    })

    it('any other 410 keeps today\'s behavior', async () => {
      scenario.current = () => json(410, { error: true, result: 'gone', error_codes: ['something_else'] })
      scenario.firstLoad = () => json(410, { error: true, result: 'gone' })
      const { response, body } = await call('/', { host: 'shop.example.com' })

      expect(response.status).toBe(200)
      expect(body).toBe(APP_HTML)
      expect(visitCalls()).toHaveLength(0)
    })
  })

  it('serves the page on an internal route too', async () => {
    scenario.current = () => blocked(detail('canceled'))
    const { response, body } = await call('/store/cha-sha?x=1')

    expect(response.status).toBe(503)
    expect(body).toContain('Your subscription was canceled')
  })

  it('is a 503 that search engines and caches leave alone, with noindex in the page', async () => {
    scenario.current = () => blocked(detail('canceled'))
    const { response, body } = await call('/')

    expect(response.headers.get('content-type')).toBe('text/html; charset=UTF-8')
    expect(response.headers.get('retry-after')).toBe('3600')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('cdn-cache-control')).toBe('no-store')
    expect(body).toContain('<meta name="robots" content="noindex">')
    expect(body).toContain('<html lang="en">')
    expect(body).toContain('role="status" aria-live="polite"></div>')
    expect(body).toContain('data-endpoint="https://api.test/v400/en/_/inactive_site/notify_owner"')
    // no active entry is cached, only the short inactive mark of the host (and the store's look, apart)
    expect(pageCachePuts()).toEqual([MARK_KEY('https://shop.example.com')])
  })

  it('detects it through /current on a domain host, before first_load', async () => {
    scenario.current = () => blocked(detail('canceled'))
    const { response } = await call('/')

    expect(response.status).toBe(503)
    expect(calledUrls().some((url) => url.includes('first_load'))).toBe(false)
  })

  it('detects it through first_load on a preview host, where /current is never asked', async () => {
    scenario.firstLoad = () => blocked(detail('trial_expired'))
    const { response, body } = await call('/', { host: 'localhost' })

    expect(response.status).toBe(503)
    expect(body).toContain('Your free trial has ended')
    expect(body).toContain('data-endpoint="https://api.test/v400/en/chasha/inactive_site/notify_owner"')
    expect(calledUrls().some((url) => url.endsWith('/current'))).toBe(false)
    expect(pageCachePuts()).toEqual([MARK_KEY('https://localhost')])
  })

  it('a first_load failure that is not "inactive" still serves the app', async () => {
    scenario.firstLoad = () => json(500, { error: true })
    const { response } = await call('/', { host: 'localhost' })

    expect(response.status).toBe(200)
  })

  it('serves the Spanish texts when the first preferred language is Spanish', async () => {
    scenario.current = () => blocked(detail('past_due'))
    withStore({ theme: { primary_color: '#1f5a4c' } })
    const es = await call('/', { headers: { 'accept-language': 'es-MX,es;q=0.9,en;q=0.8' } })
    expect(es.body).toContain('<html lang="es">')
    expect(es.body).toContain('Ahora no puedes pedir en línea a Cha Sha')
    expect(es.body).toContain('Avisar a Cha Sha que pasaste')
    expect(es.body).toContain('Tu sitio está en pausa por un problema de facturación')
    expect(es.body).toContain('Inicia sesión para resolver la facturación')

    const en = await call('/', { headers: { 'accept-language': 'en-US,es;q=0.8' } })
    expect(en.body).toContain('<html lang="en">')
    expect(en.body).toContain('You can&#39;t order online from Cha Sha right now')
  })

  it('escapes the name that comes from the API', async () => {
    scenario.current = () => blocked(detail('canceled', { name: '<script>alert(1)</script> "x"', logo: 'https://cdn.test/a.png?x="><b>' }))
    const { body } = await call('/')

    expect(body).not.toContain('<script>alert(1)')
    expect(body).not.toContain('<b>"')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &quot;x&quot;')
  })

  it('answers HEAD with the headers and no body', async () => {
    scenario.current = () => blocked(detail('canceled'))
    const { response, body } = await call('/', { method: 'HEAD' })

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('3600')
    expect(body).toBe('')
  })

  it.each([
    ['/current on a domain host', 'shop.example.com'],
    ['first_load on a preview host', 'localhost']
  ])('answers the sitemap with a 503 (no-store, noindex) found through %s, even with one cached', async (_label, host) => {
    scenario.current = () => blocked(detail('canceled'))
    scenario.firstLoad = () => blocked(detail('canceled'))
    cache.match.mockImplementation(async (request) => (request.url.includes('sitemap')
      ? new Response('<urlset><url><loc>https://x.test/</loc></url></urlset>')
      : undefined))
    const { response, body } = await call('/sitemap.xml', { host, headers: { accept: 'application/xml' } })

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(body).not.toContain('<url>')
  })

  it('the button confirms without losing focus and ignores later clicks', async () => {
    scenario.current = () => blocked(detail('canceled'))
    const { body } = await call('/')
    const page = new DOMParser().parseFromString(body, 'text/html')
    document.body.innerHTML = page.body.innerHTML
    const button = document.getElementById('notify')
    expect(button.hasAttribute('disabled')).toBe(false)
    // the page's own inline script, run against the page's markup
    // eslint-disable-next-line no-new-func
    new Function(page.querySelector('script').textContent)()

    button.focus()
    button.click()
    button.click()
    await vi.waitFor(() => expect(document.querySelectorAll('#done .done')).toHaveLength(1))

    expect(document.activeElement).toBe(button)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.className).toBe('btn ghost')
    expect(document.getElementById('done').textContent).toContain('Thanks, we let Cha Sha know.')
    expect(document.querySelectorAll('#done .done')).toHaveLength(1)
    const notifies = fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/inactive_site/notify_owner'))
    expect(notifies).toHaveLength(1)
    expect(notifies[0][1]).toMatchObject({ method: 'POST', body: '{}' })
  })
})

describe('a confirmed inactive project outranks the cached active entries', () => {
  const CURRENT_KEY = 'https://website-marketplace-v26.internal/v6/current?project=_&origin=https%3A%2F%2Fshop.example.com'
  const FIRST_LOAD_KEY = buildOwnFirstLoadCacheKey('https://shop.example.com')
  const jsonEntry = (data) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })
  let store

  beforeEach(() => {
    // an in-memory edge cache: presence of keys only (no TTL expiry; the tests drop the mark by hand)
    store = new Map([
      [CURRENT_KEY, jsonEntry({ __swr: true, storedAt: 0, data: { code: 'chasha' } })], // stale: revalidates in the background
      [FIRST_LOAD_KEY, jsonEntry({ error: false, result: { site: { code: 'a' } } })]
    ])
    cache.match.mockImplementation(async (request) => store.get(request.url)?.clone())
    cache.put.mockImplementation(async (request, response) => { store.set(request.url, response) })
    cache.delete.mockImplementation(async (request) => store.delete(request.url))
    scenario.current = () => blocked(detail('canceled'))
  })

  it('the 401 of the stale revalidation pauses the next requests, /menu and the sitemap', async () => {
    const first = await call('/menu')
    expect(first.response.status).toBe(200) // served from the stale cache while the API is asked in the background

    const mark = cache.put.mock.calls.find(([request]) => request.url === MARK_KEY('https://shop.example.com'))
    expect(mark[1].headers.get('cache-control')).toBe('public, s-maxage=60')
    expect(mark[1].headers.get('cache-tag')).toBe('host-shop.example.com')
    expect(cache.delete.mock.calls.map(([request]) => request.url).sort()).toEqual([CURRENT_KEY, FIRST_LOAD_KEY].sort())
    expect(store.has(CURRENT_KEY)).toBe(false)
    expect(store.has(FIRST_LOAD_KEY)).toBe(false)

    const second = await call('/menu')
    expect(second.response.status).toBe(503)
    expect(second.body).toContain('Your subscription was canceled')
    expect(second.body).toContain('Cha Sha')

    const sitemap = await call('/sitemap.xml', { headers: { accept: 'application/xml' } })
    expect(sitemap.response.status).toBe(503)
    expect(sitemap.response.headers.get('cache-control')).toBe('no-store')
  })

  it('once the mark expires and the API is active again, the app is back', async () => {
    await call('/menu')
    store.delete(MARK_KEY('https://shop.example.com')) // 60 s later
    scenario.current = () => json(200, { error: false, result: { code: 'chasha' } })
    fetchSpy.mockClear()

    const { response, body } = await call('/menu')

    expect(response.status).toBe(200)
    expect(body).toBe(APP_HTML)
    expect(calledUrls().some((url) => url.endsWith('/current'))).toBe(true) // the active entries were dropped: the API is asked
  })
})

// The notify button of the page, run in jsdom against the page's own script.
describe('the notify button waits for notify_owner', () => {
  const mount = (lang = 'en') => {
    const html = renderInactivePage({
      info: { reason: 'canceled', id: 42, name: 'Cha Sha', logo: null },
      lang,
      apiBase: 'https://api.test/v400/en/_',
      accountsUrl: 'https://accounts.ordering.co'
    })
    const page = new DOMParser().parseFromString(html, 'text/html')
    document.body.innerHTML = page.body.innerHTML
    // eslint-disable-next-line no-new-func
    new Function(page.querySelector('script').textContent)()
    return { button: document.getElementById('notify'), done: document.getElementById('done'), lede: document.getElementById('lede') }
  }
  const notifies = () => fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/inactive_site/notify_owner'))

  it('200: busy while it waits, then the confirmation and a button that stays off', async () => {
    let answer
    scenario.notify = () => new Promise((resolve) => { answer = () => resolve(json(200, { error: false })) })
    const { button, done, lede } = mount()

    button.click()
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(done.textContent).toBe('')
    await vi.waitFor(() => expect(notifies()).toHaveLength(1))
    button.click() // a double click sends nothing more
    answer()
    await vi.waitFor(() => expect(done.textContent).toContain('Thanks, we let Cha Sha know.'))

    expect(notifies()).toHaveLength(1)
    expect(notifies()[0][0]).toBe('https://api.test/v400/en/_/inactive_site/notify_owner')
    expect(notifies()[0][1]).toMatchObject({ method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.className).toBe('btn ghost')
    expect(lede.hidden).toBe(true)
  })

  it('409: says the restaurant takes orders again, with a reload link, and the button stays off', async () => {
    scenario.notify = () => json(409, { error: true })
    const { button, done } = mount()

    button.click()
    await vi.waitFor(() => expect(done.textContent).toContain('This restaurant is taking orders again. Reload the page to order.'))

    const link = done.querySelector('a')
    expect(link.textContent).toBe('Reload page')
    expect(link.href).toBe(location.href)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(button.className).toBe('btn ghost')
  })

  it.each([
    ['429', () => json(429, { error: true })],
    ['500', () => json(500, { error: true })],
    ['a network failure', () => Promise.reject(new TypeError('network down'))]
  ])('%s: a recoverable error, the button is back and the next click retries to a confirmation', async (_label, failure) => {
    scenario.notify = failure
    const { button, done, lede } = mount()

    button.click()
    await vi.waitFor(() => expect(done.textContent).toContain("We couldn't send your message. Please try again."))
    expect(button.getAttribute('aria-disabled')).not.toBe('true')
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(button.className).toBe('btn primary')
    expect(lede.hidden).toBe(false)

    scenario.notify = () => json(200, { error: false })
    button.click()
    await vi.waitFor(() => expect(done.textContent).toContain('Thanks, we let Cha Sha know.'))

    expect(done.textContent).not.toContain("We couldn't send")
    expect(done.querySelectorAll('.done')).toHaveLength(1)
    expect(notifies()).toHaveLength(2)
    expect(button.className).toBe('btn ghost')
  })

  it('has its texts in Spanish', async () => {
    scenario.notify = () => json(409, { error: true })
    const taken = mount('es')
    taken.button.click()
    await vi.waitFor(() => expect(taken.done.textContent).toContain('Este restaurante vuelve a recibir pedidos. Recarga la página para pedir.'))
    expect(taken.done.querySelector('a').textContent).toBe('Recargar la página')

    scenario.notify = () => json(429, { error: true })
    const failed = mount('es')
    failed.button.click()
    await vi.waitFor(() => expect(failed.done.textContent).toContain('No pudimos enviar tu aviso. Inténtalo de nuevo.'))
  })

  it('renders the texts escaped in templates, never inside the script', () => {
    const html = renderInactivePage({ info: { reason: 'canceled', id: null, name: null, logo: null }, lang: 'en', apiBase: 'https://api.test/x', accountsUrl: 'https://a.test' })
    const script = html.slice(html.indexOf('<script>'))

    expect(html).toContain('<template id="taken-tpl">')
    expect(html).toContain('<template id="error-tpl">')
    expect(html).toContain('We couldn&#39;t send your message. Please try again.')
    expect(script).not.toContain('taking orders again')
    expect(script).not.toContain('send your message')
  })
})

const PRODUCTS = [
  { name: 'Brown sugar boba', price: 6.5, currency: 'USD', image: 'https://cdn.test/p1.jpg' },
  { name: 'Classic milk tea', price: 5.25, currency: 'USD', image: 'https://cdn.test/p2.jpg' },
  { name: 'Pork & chive dumplings', price: 9, currency: 'USD', image: 'https://cdn.test/p3.jpg' },
  { name: 'Xiao long bao (8)', price: null, currency: null, image: 'https://cdn.test/p4.jpg' }
]
const FULL = {
  logo: 'https://cdn.test/logo.png',
  header: 'https://cdn.test/header.jpg',
  description: 'Boba & dumplings',
  city: 'Houston',
  products: PRODUCTS,
  theme: { primary_color: '#1f5a4c', fonts: { heading: 'Playfair Display', body: 'Lato' }, button_radius: 8 },
  stats: { visits_7d: 142, notices_7d: 3 }
}
const POWERED = 'href="https://www.ordering.co/?utm_source=inactive-site&amp;utm_medium=referral&amp;utm_campaign=powered-by" target="_blank" rel="noopener"'

describe('the page takes the look of the store', () => {
  beforeEach(() => {
    scenario.current = () => blocked(detail('trial_expired'))
  })

  it('A: cover photo, logo, name, description, dishes with formatted prices, the owner panel with counters', async () => {
    withStore(FULL)
    const { response, body } = await call('/')

    expect(response.status).toBe(503)
    expect(body).toContain('<body class="v-a">')
    expect(body).toContain('<img class="cover" src="https://cdn.test/header.jpg" alt="">')
    expect(body).toContain('<img class="logo" src="https://cdn.test/logo.png" alt="Cha Sha">')
    expect(body).toContain('Boba &amp; dumplings · Houston')
    expect(body).toContain('You can&#39;t order online from Cha Sha right now')
    expect(body).toContain('Their ordering site is paused. Tell them you came by and we&#39;ll pass it on.')
    expect(body).toContain('<span class="lg">Let Cha Sha know you came by</span><span class="sm">Let Cha Sha know</span>')
    expect(body).toContain('No sign-up, no email: one tap.')
    expect(body).toContain('What people order at Cha Sha')
    expect(body).toContain('Back on the menu as soon as they reopen online.')
    expect(body.match(/class="dish"/g)).toHaveLength(4)
    expect(body).toContain('<img src="https://cdn.test/p1.jpg" alt="Brown sugar boba" loading="lazy"')
    expect(body).toContain('<span>$6.50</span>')
    expect(body).toContain('<span>$9.00</span>')
    expect(body.match(/<span>\$/g)).toHaveLength(3) // the fourth has no price
    expect(body).toContain('© Cha Sha')
    expect(body).toContain('--btn-bg:#1f5a4c')
    expect(body).toContain('--r:8px')
    expect(body).toContain("--font-h:'Playfair Display',system-ui,sans-serif")
    expect(body).toContain("--font-b:'Lato',system-ui,sans-serif")
    expect(body).toContain('family=Playfair+Display&display=swap')
    expect(body).toContain('family=Lato&display=swap')
    expect(body).toContain('<li><b>142</b> visits in the last 7 days</li>')
    expect(body).toContain('<li><b>3</b> customers asked you to come back</li>')
    expect(body).toContain('Your free trial has ended')
    expect(body).toContain('<a class="btn dark" href="https://accounts.ordering.co/project/42/reactivate">')
    expect(body).not.toContain('ordering-lockup-color.svg')
  })

  it('A uses Archivo and Montserrat when the theme has no fonts or radius', async () => {
    withStore({ header: FULL.header, products: PRODUCTS })
    const { body } = await call('/')

    expect(body).toContain('family=Archivo:wght@400..800')
    expect(body).toContain('family=Montserrat:wght@400..800')
    expect(body).toContain('--r:12px')
    expect(body).toContain('--store:#22221f')
  })

  it('B: no photo, a color band with the logo, no dishes', async () => {
    withStore({ logo: FULL.logo, city: 'Houston', products: PRODUCTS, theme: { primary_color: '#1f5a4c' } })
    const { body } = await call('/')

    expect(body).toContain('<body class="v-b">')
    expect(body).toContain('--store:#1f5a4c')
    expect(body).toContain('<img class="logo" src="https://cdn.test/logo.png" alt="Cha Sha">')
    expect(body).not.toContain('class="cover"')
    expect(body).not.toContain('class="menu"')
    expect(body).not.toContain('class="dish"')
    expect(body).toContain('<p class="sub">Houston</p>')
  })

  it('B shows the initials over the color when there is no logo', async () => {
    withStore({ theme: { primary_color: '#1f5a4c' } })
    const { body } = await call('/')

    expect(body).toContain('<body class="v-b">')
    expect(body).toContain('<div class="logo" aria-hidden="true">CS</div>')
  })

  it('A with a single dish has no dishes section', async () => {
    withStore({ ...FULL, products: [PRODUCTS[0]] })
    const { body } = await call('/')

    expect(body).toContain('<body class="v-a">')
    expect(body).not.toContain('class="menu"')
    expect(body).not.toContain('What people order')
  })

  it('without a name, the texts talk about "this restaurant"', async () => {
    scenario.current = () => blocked(detail('canceled', { name: null }))
    withStore(FULL)
    const { body } = await call('/')

    expect(body).toContain('You can&#39;t order online from this restaurant right now')
    expect(body).toContain('Let the restaurant know you came by')
    expect(body).toContain('What people order here')
    expect(body).not.toContain('©')
  })

  it.each([
    ['a 404 (not deployed yet)', () => json(404, { error: true })],
    ['a 409 project_active', () => json(409, { error: true, error_codes: ['project_active'] })],
    ['a 500', () => json(500, { error: true })],
    ['invalid JSON', () => new Response('<html>', { status: 200 })],
    ['an error body', () => json(200, { error: true, result: 'nope' })],
    ['a timeout', () => Promise.reject(new DOMException('The operation was aborted', 'AbortError'))],
    ['a network failure', () => Promise.reject(new TypeError('network down'))],
    ['an empty 200', () => json(200, { error: false, result: { logo: null, header: null, description: null, city: null, products: [], theme: null } })],
    ['only counters', () => json(200, { error: false, result: { stats: { visits_7d: 5, notices_7d: 2 } } })]
  ])('C, the generic page with the Ordering.co brand, after %s', async (_label, storefront) => {
    scenario.storefront = storefront
    const { response, body } = await call('/')

    expect(response.status).toBe(503)
    expect(body).toContain('<body class="v-c">')
    expect(body).toContain('<img src="https://brand.ordering.co/assets/logos/ordering-lockup-color.svg" alt="Ordering.co" height="26">')
    expect(body).toContain('Online ordering for Cha Sha is paused')
    expect(body).toContain('The restaurant isn&#39;t taking online orders on this site right now. Tell them you came by and we&#39;ll pass it on.')
    expect(body).toContain('>Let the restaurant know</button>')
    expect(body).toContain('family=Inter:wght@400..700')
    expect(body).not.toContain('family=Archivo')
    expect(body).not.toContain('class="cover"')
    expect(body).not.toContain('class="dish"')
    expect(body).not.toContain('<ul>')
    expect(body).toContain('class="btn secondary"')
    expect(body).toContain('--od-action:#266DF0')
    expect(body).toContain('--od-text-muted:#3F4145')
  })

  it('the HEAD request and the archived project do not ask for the store', async () => {
    withStore(FULL)
    await call('/', { method: 'HEAD' })
    expect(storefrontCalls()).toHaveLength(0)

    scenario.current = () => json(410, { error: true, error_codes: ['project_database_archived'] })
    const { body } = await call('/')
    expect(storefrontCalls()).toHaveLength(0)
    expect(body).toContain('<body class="v-c">')
  })

  it('asks the API with the origin of the site and a short timeout', async () => {
    withStore(FULL)
    await call('/')

    expect(storefrontCalls()).toHaveLength(1)
    const [url, init] = storefrontCalls()[0]
    expect(url).toBe('https://api.test/v400/en/_/inactive_site/storefront')
    expect(init.headers.origin).toBe('https://shop.example.com')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('caches a valid answer for an hour and a failure for a minute', async () => {
    withStore({})
    await call('/')
    const ok = cache.put.mock.calls.find(([request]) => request.url === STOREFRONT_KEY('https://shop.example.com'))
    expect(ok[1].headers.get('cache-control')).toBe('max-age=3600')

    cache.put.mockClear()
    scenario.storefront = () => json(404, { error: true })
    await call('/')
    const failed = cache.put.mock.calls.find(([request]) => request.url === STOREFRONT_KEY('https://shop.example.com'))
    expect(failed[1].headers.get('cache-control')).toBe('max-age=60')
  })

  it('a cached look is used without asking the API', async () => {
    cache.match.mockImplementation(async (request) => (request.url === STOREFRONT_KEY('https://shop.example.com')
      ? new Response(JSON.stringify(normalizeStorefront(FULL)))
      : undefined))
    const { body } = await call('/')

    expect(storefrontCalls()).toHaveLength(0)
    expect(body).toContain('<body class="v-a">')
    expect(cache.put.mock.calls.some(([request]) => request.url.includes('inactive-storefront'))).toBe(false)
  })

  it('a cached "no data" is the generic page', async () => {
    cache.match.mockImplementation(async (request) => (request.url.includes('inactive-storefront') ? new Response('null') : undefined))
    const { body } = await call('/')

    expect(storefrontCalls()).toHaveLength(0)
    expect(body).toContain('<body class="v-c">')
  })

  it.each([
    ['a light color gets the dark gray button', '#f5d000', '#22221f', '#000'],
    // white 3.82:1 and the dark gray 4.17:1 both fail here: the band text goes black
    ['a mid color where neither white nor the dark gray reads', '#e74c3c', '#22221f', '#000'],
    ['a dark color is the button', '#1f5a4c', '#1f5a4c', '#fff']
  ])('contrast: %s', async (_label, primary, button, bandInk) => {
    withStore({ logo: FULL.logo, theme: { primary_color: primary } })
    const { body } = await call('/')

    expect(body).toContain(`--store:${primary}`)
    expect(body).toContain(`--btn-bg:${button}`)
    expect(body).toContain(`--band-ink:${bandInk}`)
    expect(body).toContain('--btn-fg:#fff')
  })

  it('escapes and rejects everything that comes from the store', async () => {
    withStore({
      logo: 'https://cdn.test/l.png?x="><script>alert(1)</script>',
      header: 'https://cdn.test/h.jpg?x="><img src=x onerror=alert(2)>',
      description: '<script>alert(3)</script>',
      city: '"><b>city</b>',
      products: [
        { name: '<script>alert(4)</script>', price: 3, currency: 'USD', image: 'https://cdn.test/p.jpg?x="><i>' },
        { name: 'Soup', price: 3, currency: 'usd', image: 'javascript:alert(5)' },
        { name: 'Tea', price: 1, currency: 'EUR', image: 'https://cdn.test/t.jpg' },
        { name: 'Bread', price: 'free', currency: 'EUR', image: 'https://cdn.test/b.jpg' }
      ],
      theme: { primary_color: 'red;}</style><script>alert(6)</script>', fonts: { heading: "Inter');}", body: 'x;y' }, button_radius: '10px;}' }
    })
    const { body } = await call('/')

    expect(body).not.toContain('<script>alert')
    for (const raw of ['"><script', '"><img src=x', '"><b>city', '"><i>']) expect(body).not.toContain(raw)
    expect(body).toContain('&lt;script&gt;alert(3)&lt;/script&gt;')
    expect(body).toContain('&quot;&gt;&lt;b&gt;city&lt;/b&gt;')
    expect(body).toContain('alt="&lt;script&gt;alert(4)&lt;/script&gt;"')
    expect(body).not.toContain('javascript:')
    expect(body).not.toContain('red;}')
    expect(body).not.toContain("Inter');}")
    expect(body).not.toContain('x;y')
    expect(body).not.toContain('10px;}')
    expect(body).toContain('--store:#22221f')
    expect(body).toContain("--font-h:'Archivo'")
    expect(body).toContain('--r:12px')
    expect(body).toContain('<span>€1.00</span>')
    expect(body.match(/class="dish"/g)).toHaveLength(3)
  })

  it.each([
    ['#12345g'], ['#fff'], ['rgb(0,0,0)'], [123]
  ])('rejects the color %s', async (color) => {
    withStore({ logo: FULL.logo, theme: { primary_color: color } })
    const { body } = await call('/')

    expect(body).toContain('--store:#22221f')
    expect(body).not.toContain(`--store:${color}`)
  })

  it('keeps at most four dishes and only the radius values that are safe', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ name: `Dish ${i}`, image: `https://cdn.test/${i}.jpg` }))
    expect(normalizeStorefront({ products: many }).products).toHaveLength(4)
    expect(normalizeStorefront({ products: [{ name: 'x'.repeat(200), image: 'https://cdn.test/a.jpg' }] }).products[0].name).toHaveLength(80)
    expect(normalizeStorefront({ description: 'd'.repeat(200) }).description).toHaveLength(80)
    expect(normalizeStorefront({ theme: { button_radius: 8 } }).theme.button_radius).toBe('8px')
    // a decimal radius survives the second pass of the render (idempotent)
    expect(normalizeStorefront(normalizeStorefront({ theme: { button_radius: 8.123 } })).theme.button_radius).toBe('8.12px')
    expect(normalizeStorefront({ theme: { button_radius: 41 } }).theme.button_radius).toBeNull()
    expect(normalizeStorefront({ theme: { button_radius: -1 } }).theme.button_radius).toBeNull()
    expect(normalizeStorefront({ theme: { button_radius: '0.5rem' } }).theme.button_radius).toBe('0.5rem')
    expect(normalizeStorefront({ theme: { button_radius: '12px' } }).theme.button_radius).toBe('12px')
    expect(normalizeStorefront({ theme: { button_radius: 'calc(1px)' } }).theme.button_radius).toBeNull()
    expect(normalizeStorefront({ theme: { fonts: { heading: 'Open Sans', body: 'Fira-Sans 2' } } }).theme.fonts).toEqual({ heading: 'Open Sans', body: 'Fira-Sans 2' })
    expect(normalizeStorefront(normalizeStorefront(FULL))).toEqual(normalizeStorefront(FULL))
  })

  it('the owner panel shows only the counters above zero, and never in C', async () => {
    withStore({ ...FULL, stats: { visits_7d: 142, notices_7d: 0 } })
    const only = await call('/')
    expect(only.body).toContain('<li><b>142</b> visits in the last 7 days</li>')
    expect(only.body).not.toContain('asked you to come back')

    withStore({ ...FULL, products: [], stats: { visits_7d: '5', notices_7d: -1 } })
    expect((await call('/')).body).not.toContain('<ul>')
    withStore({ ...FULL, products: [], stats: { visits_7d: 1.5, notices_7d: null } })
    expect((await call('/')).body).not.toContain('<ul>')
    withStore({ ...FULL, products: [], stats: null })
    expect((await call('/')).body).not.toContain('<ul>')

    withStore({ ...FULL, stats: { visits_7d: 1, notices_7d: 1 } })
    const singular = await call('/')
    expect(singular.body).toContain('<li><b>1</b> visit in the last 7 days</li>')
    expect(singular.body).toContain('<li><b>1</b> customer asked you to come back</li>')

    scenario.storefront = () => json(404, { error: true })
    const generic = await call('/')
    expect(generic.body).not.toContain('in the last 7 days')
  })

  it.each([
    ['A', FULL],
    ['B', { logo: FULL.logo, theme: { primary_color: '#1f5a4c' } }],
    ['C', null]
  ])('%s links to Ordering.co with the UTM, in a new tab', async (_label, store) => {
    if (store) withStore(store)
    const { body } = await call('/')

    expect(body).toContain(`<a ${POWERED}>Ordering.co</a>`)
  })

  it('has its texts in Spanish', async () => {
    withStore({ ...FULL, stats: { visits_7d: 142, notices_7d: 1 } })
    const a = await call('/', { headers: { 'accept-language': 'es' } })
    expect(a.body).toContain('Ahora no puedes pedir en línea a Cha Sha')
    expect(a.body).toContain('Su sitio de pedidos está en pausa. Diles que pasaste y se lo haremos saber.')
    expect(a.body).toContain('<span class="lg">Avisar a Cha Sha que pasaste</span><span class="sm">Avisar a Cha Sha</span>')
    expect(a.body).toContain('Sin registro ni correo: un toque.')
    expect(a.body).toContain('Lo que más se pide en Cha Sha')
    expect(a.body).toContain('Vuelven al menú en cuanto reabran en línea.')
    expect(a.body).toContain('<li><b>142</b> visitas en los últimos 7 días</li>')
    expect(a.body).toContain('<li><b>1</b> cliente pidió que vuelvas</li>')
    expect(a.body).toContain('Con la tecnología de <a ')
    expect(a.body).toContain('<span class="lg">Avisar a Cha Sha que pasaste</span>')

    scenario.storefront = () => json(404, { error: true })
    const c = await call('/', { headers: { 'accept-language': 'es' } })
    expect(c.body).toContain('Los pedidos en línea de Cha Sha están en pausa')
    expect(c.body).toContain('El restaurante no está recibiendo pedidos en línea en este sitio. Avísale que pasaste y se lo haremos saber.')
    expect(c.body).toContain('>Avisar al restaurante</button>')
    expect(c.body).toContain('Con la tecnología de <a ')
  })

  it('the notify button of a store page works with the same script', async () => {
    const html = renderInactivePage({
      info: { reason: 'canceled', id: 42, name: 'Cha Sha', logo: null },
      lang: 'en',
      apiBase: 'https://api.test/v400/en/_',
      accountsUrl: 'https://accounts.ordering.co',
      storefront: FULL
    })
    const page = new DOMParser().parseFromString(html, 'text/html')
    document.body.innerHTML = page.body.innerHTML
    // eslint-disable-next-line no-new-func
    new Function(page.querySelector('script').textContent)()
    const button = document.getElementById('notify')

    button.click()
    await vi.waitFor(() => expect(document.getElementById('done').textContent).toContain('Thanks, we let Cha Sha know.'))
    expect(button.className).toBe('btn ghost')
    expect(document.getElementById('lede').hidden).toBe(true)
  })
})

describe('visits of the inactive page', () => {
  beforeEach(() => {
    scenario.current = () => blocked(detail('canceled'))
  })

  it('records a GET of a likely human with an anonymous 64-hex visitor, through waitUntil', async () => {
    const { ctx } = await call('/', { headers: { 'cf-connecting-ip': '203.0.113.9' } })

    expect(ctx.waitUntil).toHaveBeenCalledTimes(5) // the visit, the inactive mark (1 write, 2 deletes) and the store's look
    expect(visitCalls()).toHaveLength(1)
    const [url, init] = visitCalls()[0]
    expect(url).toBe('https://api.test/v400/en/_/inactive_site/visits')
    expect(init.method).toBe('POST')
    expect(init.headers['content-type']).toBe('application/json')
    expect(init.headers['x-inactive-site-key']).toBe('test-visits-key')
    const { visitor } = JSON.parse(init.body)
    expect(visitor).toMatch(/^[0-9a-f]{64}$/)
    expect(init.body).not.toContain('203.0.113.9')
  })

  it.each([['missing', undefined], ['empty', '']])('with the key %s it calls no visits endpoint and still serves the page', async (_label, key) => {
    const { response, body } = await call('/', { workerEnv: { ...env, INACTIVE_SITE_VISITS_KEY: key } })

    expect(response.status).toBe(503)
    expect(body).toContain('Your subscription was canceled')
    expect(visitCalls()).toHaveLength(0)
  })

  it('gives the same visitor within a day and another one for another IP', async () => {
    await call('/', { headers: { 'cf-connecting-ip': '203.0.113.9' } })
    await call('/menu', { headers: { 'cf-connecting-ip': '203.0.113.9' } })
    await call('/', { headers: { 'cf-connecting-ip': '203.0.113.10' } })
    const visitors = visitCalls().map(([, init]) => JSON.parse(init.body).visitor)

    expect(visitors[0]).toBe(visitors[1])
    expect(visitors[2]).not.toBe(visitors[0])
  })

  it('does not record bots, empty user agents or HEAD', async () => {
    await call('/', { headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } })
    await call('/', { headers: { 'user-agent': '' } })
    await call('/', { method: 'HEAD' })

    expect(visitCalls()).toHaveLength(0)
  })

  it('still serves the page when the visits endpoint fails', async () => {
    fetchSpy.mockImplementation(async (input) => {
      const url = String(input?.url ?? input)
      if (url.endsWith('/current')) return blocked(detail('canceled'))
      throw new Error('network down')
    })
    const { response } = await call('/')

    expect(response.status).toBe(503)
  })
})

describe('parseInactiveProject and isLikelyBot', () => {
  it('also reads the Spanish text and an id sent as a string', () => {
    const spanish = { error: true, result: 'Su proyecto no está activo, por favor pague su factura o contacte al equipo de ventas.' }
    expect(parseInactiveProject(401, spanish)).toEqual({ reason: 'inactive', id: null, name: null, logo: null })
    expect(parseInactiveProject(401, { inactive_project: { reason: 'canceled', id: '42' } })).toMatchObject({ id: 42 })
    expect(parseInactiveProject(401, { inactive_project: { id: '4x' } })).toMatchObject({ id: null })
    expect(parseInactiveProject(401, { inactive_project: { id: '-4' } })).toMatchObject({ id: null })
    expect(parseInactiveProject(401, { inactive_project: { id: '0' } })).toMatchObject({ id: null })
  })

  it('serves the page for the Spanish 401 and links a string id', async () => {
    scenario.current = () => json(401, { error: true, result: 'Su proyecto no está activo.', ...detail('canceled', { id: '42' }) })
    const { response, body } = await call('/')

    expect(response.status).toBe(503)
    expect(body).toContain('href="https://accounts.ordering.co/project/42/reactivate"')
  })

  it('normalizes what the API sends', () => {
    expect(parseInactiveProject(401, { result: INACTIVE_TEXT })).toEqual({ reason: 'inactive', id: null, name: null, logo: null })
    expect(parseInactiveProject(401, { inactive_project: { reason: 'weird', id: -3, name: '  ', logo: 'javascript:alert(1)' } }))
      .toEqual({ reason: 'inactive', id: null, name: null, logo: null })
    expect(parseInactiveProject(401, { inactive_project: { reason: 'past_due', id: 1.5, name: ' Pizza ', logo: 'https://cdn.test/l.png' } }))
      .toEqual({ reason: 'past_due', id: null, name: 'Pizza', logo: 'https://cdn.test/l.png' })
  })

  it('only a 401 that says so counts', () => {
    expect(parseInactiveProject(403, { inactive_project: { reason: 'canceled' } })).toBeNull()
    expect(parseInactiveProject(401, { result: 'The project does not exist.' })).toBeNull()
    expect(parseInactiveProject(401, null)).toBeNull()
    expect(parseInactiveProject(500, { result: INACTIVE_TEXT })).toBeNull()
  })

  it('tells bots from browsers', () => {
    expect(isLikelyBot('')).toBe(true)
    expect(isLikelyBot(undefined)).toBe(true)
    expect(isLikelyBot('curl/8.4.0')).toBe(true)
    expect(isLikelyBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true)
    expect(isLikelyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Safari/604.1')).toBe(false)
  })
})
