import { expect, test } from '@playwright/test'
import { APP_ORIGIN, APP_WS_ORIGIN } from '../lib/server.cjs'
import { captureSection, disableMotion, waitForDocumentationReady } from '../lib/capture.js'
import { assertFixturePrivacy, installFixtureGlobals, loadFixture } from '../lib/fixtures.js'
import { loadManifest } from '../lib/manifest.js'
import {
  assertFixtureRequests,
  assertNoUnknownRequests,
  assertWebSocketIsolation,
  createRequestLog,
  installNetworkGuard,
  waitForRequestQuiescence
} from '../lib/network.js'

const manifest = await loadManifest('school-student-ordering.manifest')
const studentsPattern = '^/v400/en/docsmarket/schools/students$'
const schoolsPattern = '^/v400/en/docsmarket/schools\\?params=\\*,classrooms,grades(?:&where=[^&]+)?&page=1&page_size=10$'
const validationPattern = '^/v400/en/docsmarket/validation_field_order_types(?:\\?.*)?$'
const userPattern = '^/v400/en/docsmarket/users/9301(?:\\?.*)?$'

const clone = value => JSON.parse(JSON.stringify(value))
const routeFor = (fixture, method, pattern) => fixture.routes.find(route => route.method === method && route.pattern === pattern)

const modeFor = capture => {
  if (capture.id.includes('-empty-')) return 'empty'
  if (capture.id.includes('-add-')) return 'add'
  if (capture.id.includes('-edit-')) return 'edit'
  return 'list'
}

const fixtureFor = async capture => {
  const fixture = clone(await loadFixture(manifest.fixture))
  const mode = modeFor(capture)
  const students = routeFor(fixture, 'GET', studentsPattern)
  const schools = routeFor(fixture, 'GET', schoolsPattern)
  if (mode === 'empty') students.response.result = []
  schools.assert = { count: ['add', 'edit'].includes(mode) ? 1 : 0 }
  if (mode === 'edit') schools.response.result = [schools.response.result[0]]
  for (const route of fixture.routes.filter(route => route.method !== 'GET')) route.assert = { count: 0 }
  assertFixturePrivacy(fixture)
  return fixture
}

const installBrowserGuards = async page => {
  await page.addInitScript(() => {
    window.__DOC_SCHOOL_GUARD__ = {
      windows: [], forms: [], requestSubmits: [], messages: [], navigation: [], storage: [], clears: [], fileClicks: []
    }
    const safeTarget = value => {
      const target = new URL(String(value || window.location.href), window.location.href)
      return { origin: target.origin, pathname: target.pathname, queryKeys: [...target.searchParams.keys()].sort() }
    }
    window.open = value => {
      window.__DOC_SCHOOL_GUARD__.windows.push(safeTarget(value))
      return null
    }
    window.HTMLFormElement.prototype.submit = function () {
      window.__DOC_SCHOOL_GUARD__.forms.push(safeTarget(this.action))
    }
    window.HTMLFormElement.prototype.requestSubmit = function () {
      window.__DOC_SCHOOL_GUARD__.requestSubmits.push(safeTarget(this.action))
    }
    const nativePostMessage = window.postMessage
    window.postMessage = function (...args) {
      window.__DOC_SCHOOL_GUARD__.messages.push({ hasTargetOrigin: typeof args[1] === 'string' })
      return Reflect.apply(nativePostMessage, window, args)
    }
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method].bind(window.history)
      window.history[method] = (...args) => {
        window.__DOC_SCHOOL_GUARD__.navigation.push({ method, ...safeTarget(args[2]) })
        return original(...args)
      }
    }
    const nativeSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key, value) {
      window.__DOC_SCHOOL_GUARD__.storage.push({ storage: this === window.localStorage ? 'local' : 'session', key: String(key) })
      return Reflect.apply(nativeSetItem, this, [key, value])
    }
    const nativeClear = window.Storage.prototype.clear
    window.Storage.prototype.clear = function () {
      window.__DOC_SCHOOL_GUARD__.clears.push(this === window.localStorage ? 'local' : 'session')
      return Reflect.apply(nativeClear, this, [])
    }
    const nativeClick = window.HTMLInputElement.prototype.click
    window.HTMLInputElement.prototype.click = function () {
      if (this.type === 'file') window.__DOC_SCHOOL_GUARD__.fileClicks.push(true)
      return Reflect.apply(nativeClick, this, [])
    }
  })
}

const storageShape = page => page.evaluate(() => {
  const token = window.localStorage.getItem('token')
  const user = JSON.parse(window.localStorage.getItem('user') || 'null')
  return {
    localKeys: Object.keys(window.localStorage).sort(),
    sessionKeys: Object.keys(window.sessionStorage).sort(),
    cookieKeys: document.cookie.split(';').map(item => item.trim().split('=')[0]).filter(Boolean).sort(),
    reservedToken: typeof token === 'string' && token.startsWith('docs-fixture-'),
    userId: user?.id,
    tokenConsistent: user?.session?.access_token === token,
    hasSchoolSelection: window.localStorage.getItem('school_selected_students') !== null
  }
})

const clearPostBaselineEvents = page => page.evaluate(() => {
  const guard = window.__DOC_SCHOOL_GUARD__
  guard.windows.length = 0
  guard.forms.length = 0
  guard.requestSubmits.length = 0
  guard.messages.length = 0
  guard.navigation.length = 0
  guard.storage.length = 0
  guard.clears.length = 0
  guard.fileClicks.length = 0
})

const setup = async (page, capture) => {
  const fixture = await fixtureFor(capture)
  const requestLog = createRequestLog()
  const requestMetadata = []
  const browserEvents = { errors: [], failed: [], frames: [], pages: [] }
  page.on('pageerror', error => browserEvents.errors.push(error.name))
  page.on('requestfailed', request => {
    const target = new URL(request.url())
    browserEvents.failed.push({ origin: target.origin, pathname: target.pathname })
  })
  page.on('frameattached', frame => {
    const target = new URL(frame.url() || 'about:blank')
    browserEvents.frames.push({ origin: target.origin, pathname: target.pathname })
  })
  page.context().on('page', opened => {
    if (opened !== page) browserEvents.pages.push(true)
  })
  page.on('request', request => {
    const target = new URL(request.url())
    if (!target.pathname.endsWith('/schools/students') && !target.pathname.endsWith('/schools')) return
    const headers = request.headers()
    let queryValid = target.search === ''
    if (target.pathname.endsWith('/schools')) {
      const keys = [...target.searchParams.keys()]
      queryValid = keys.join(',') === (target.searchParams.has('where') ? 'params,where,page,page_size' : 'params,page,page_size') &&
        target.searchParams.get('params') === '*,classrooms,grades' &&
        target.searchParams.get('page') === '1' && target.searchParams.get('page_size') === '10'
      if (target.searchParams.has('where')) {
        try {
          queryValid = queryValid && JSON.stringify(JSON.parse(target.searchParams.get('where'))) === JSON.stringify({
            conditions: [{ attribute: 'id', value: 9801 }], conector: 'AND'
          })
        } catch {
          queryValid = false
        }
      }
    }
    requestMetadata.push({
      kind: target.pathname.endsWith('/schools/students') ? 'students' : 'schools',
      hasAuthorization: Boolean(headers.authorization),
      hasContentType: headers['content-type'] === 'application/json',
      queryValid
    })
  })

  if (capture.project === 'mobile-chromium') await page.setViewportSize({ width: 390, height: 1100 })
  await installBrowserGuards(page)
  await installFixtureGlobals(page, fixture, { authenticated: true })
  await installNetworkGuard(page, fixture, requestLog)
  await page.goto(manifest.route, { waitUntil: 'domcontentloaded' })
  await disableMotion(page)

  const list = page.locator("[data-doc-section='school-students']")
  await expect(page.locator("[data-doc-section='user-profile']")).toHaveAttribute('data-doc-state', 'ready', { timeout: 30_000 })
  await expect(page).toHaveURL(`${APP_ORIGIN}/profile?view=students`)
  await expect(list).toBeVisible({ timeout: 30_000 })
  const mode = modeFor(capture)
  await expect(list).toHaveAttribute('data-doc-state', mode === 'empty' ? 'empty' : 'list')

  if (mode === 'list') {
    await expect(list).toContainText('Synthetic Student')
    await expect(list).toContainText('Docs Student')
  } else if (mode === 'empty') {
    await expect(list).toContainText('You have no registered students yet')
  } else if (mode === 'add') {
    await list.locator("[data-doc-control='school-add-student']").click()
    const form = page.locator("[data-doc-section='school-student-form']")
    await expect(form).toHaveAttribute('data-doc-state', 'add')
    await expect(form.locator("input[placeholder='Name']")).toHaveValue('')
    await expect(form.locator("input[placeholder='Lastname']")).toHaveValue('')
    await expect(page.locator("[data-doc-section='school-student-dialog']")).toContainText('Add student')
  } else {
    await list.locator("[data-doc-control='school-edit-student']").first().click()
    const form = page.locator("[data-doc-section='school-student-form']")
    await expect(form).toHaveAttribute('data-doc-state', 'edit')
    await expect(form.locator("input[placeholder='Name']")).toHaveValue('Synthetic Student')
    await expect(form.locator("input[placeholder='Lastname']")).toHaveValue('Fixture Learner')
    await expect(page.locator("[data-doc-section='school-student-dialog']")).toContainText('Edit student')
  }

  await waitForDocumentationReady(page, manifest.readiness, capture.selector, {
    imageScope: capture.capture_mode === 'viewport' ? 'viewport' : 'section'
  })
  const baseline = await storageShape(page)
  expect(baseline).toEqual({
    localKeys: ['local_phone_code', 'token', 'user'],
    sessionKeys: expect.any(Array),
    cookieKeys: [],
    reservedToken: true,
    userId: 9301,
    tokenConsistent: true,
    hasSchoolSelection: false
  })
  await clearPostBaselineEvents(page)
  return { fixture, requestLog, requestMetadata, browserEvents, baseline }
}

const assertIsolation = async (page, runtime) => {
  await waitForRequestQuiescence(runtime.requestLog, manifest.readiness.network)
  assertNoUnknownRequests(runtime.requestLog)
  assertFixtureRequests(runtime.fixture, runtime.requestLog)
  expect(runtime.requestLog.matched.filter(request => request.method !== 'GET')).toEqual([])
  expect(runtime.requestLog.matched.filter(request => request.pattern === studentsPattern)).toHaveLength(1)
  expect(runtime.requestLog.matched.filter(request => request.pattern === userPattern)).toHaveLength(2)
  expect(runtime.requestLog.matched.filter(request => request.pattern === validationPattern)).toHaveLength(1)
  expect(runtime.requestMetadata.filter(item => item.kind === 'students')).toEqual([
    { kind: 'students', hasAuthorization: true, hasContentType: true, queryValid: true }
  ])
  expect(runtime.requestMetadata.every(item => item.hasAuthorization && item.hasContentType && item.queryValid)).toBe(true)

  const sockets = await assertWebSocketIsolation(page)
  expect(sockets.some(({ origin, pathname }) => origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')).toBe(true)
  expect(sockets.every(({ origin, pathname }) => (
    (origin === APP_WS_ORIGIN && pathname === '/') ||
    (origin === 'wss://sockets-v3.orderingplus.com' && pathname === '/socket.io/')
  ))).toBe(true)
  expect(sockets.filter(({ origin }) => origin === 'wss://sockets-v3.orderingplus.com').every(({ queryKeys, hasToken }) => (
    queryKeys.includes('project') && queryKeys.includes('token') && hasToken === true
  ))).toBe(true)

  expect(runtime.browserEvents.errors).toEqual([])
  expect(runtime.browserEvents.frames).toEqual([])
  expect(runtime.browserEvents.pages).toEqual([])
  expect(runtime.browserEvents.failed.filter(({ origin }) => ![
    'https://fonts.gstatic.com', 'https://cdn.onesignal.com', 'https://www.google-analytics.com'
  ].includes(origin))).toEqual([])
  expect(page.frames().filter(frame => frame !== page.mainFrame())).toEqual([])
  const guard = await page.evaluate(() => window.__DOC_SCHOOL_GUARD__)
  expect(guard).toEqual({ windows: [], forms: [], requestSubmits: [], messages: [], navigation: [], storage: [], clears: [], fileClicks: [] })
  expect(await storageShape(page)).toEqual(runtime.baseline)
  await expect(page.locator('body')).not.toContainText(/STU-[A-Z0-9]+/)
}

test.describe('School student ordering documentation', () => {
  for (const capture of manifest.captures) {
    test(`${capture.id} @${capture.project}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== capture.project, `Capture belongs to ${capture.project}.`)
      test.setTimeout(60_000)
      const runtime = await setup(page, capture)
      await captureSection({
        page,
        locator: page.locator(capture.selector),
        filename: capture.file,
        captureMode: capture.capture_mode
      })
      await assertIsolation(page, runtime)
    })
  }
})
