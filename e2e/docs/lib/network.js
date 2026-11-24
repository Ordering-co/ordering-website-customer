import { APP_ORIGIN } from './server.cjs'
const DISABLED_THIRD_PARTY_HOSTS = new Set([
  'cdn.onesignal.com',
  'www.google-analytics.com'
])

const normalizeMethod = (method = 'GET') => method.toUpperCase()

const responseOptions = (fixtureRoute, responseIndex = 0) => {
  const transport = fixtureRoute.transport || {}
  const responseSequence = fixtureRoute.responseSequence || []
  const sequencedResponse = responseSequence[Math.min(responseIndex, Math.max(responseSequence.length - 1, 0))]
  const body = transport.body ?? sequencedResponse ?? fixtureRoute.response ?? null
  const contentType = transport.contentType || 'application/json'

  return {
    status: transport.statusSequence?.[responseIndex] ?? transport.status ?? 200,
    contentType: transport.contentTypeSequence?.[responseIndex] ?? contentType,
    headers: transport.headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  }
}

const matchesFallback = (route, url, fixture) => {
  if (!route.sharedFallback) return true
  const query = Object.entries(route.query)
  return url.origin === new URL(fixture.runtimeConfig.api.url).origin &&
    url.searchParams.size === query.length &&
    query.every(([key, value]) => url.searchParams.get(key) === value)
}

const fixtureRouteFor = (request, url, fixture) => {
  const method = normalizeMethod(request.method())
  const apiOrigins = new Set((fixture.apiOrigins || [fixture.runtimeConfig?.api?.url]).map((origin) => new URL(origin).origin))
  if (!apiOrigins.has(url.origin)) return undefined
  return fixture.routes.find((route) => (
    normalizeMethod(route.method) === method &&
    new RegExp(route.pattern).test(url.pathname + url.search) &&
    matchesFallback(route, url, fixture)
  ))
}

const requestBody = (request) => {
  const raw = request.postData()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export const createRequestLog = () => ({ matched: [], syntheticAssets: [], unknown: [] })

export const installNetworkGuard = async (page, fixture, requestLog) => {
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    requestLog.lastActivity = Date.now()

    if (request.method() === 'GET' && url.origin === APP_ORIGIN) {
      await route.continue()
      return
    }

    if (
      request.method() === 'GET' &&
      url.origin === 'https://purecatamphetamine.github.io' &&
      url.pathname === '/country-flag-icons/3x2/US.svg' &&
      url.search === ''
    ) {
      requestLog.syntheticAssets.push({ method: 'GET', origin: url.origin, pathname: url.pathname })
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><path fill="#fff" d="M0 0h3v2H0z"/><path fill="#b22234" d="M0 0h3v.15H0zm0 .3h3v.15H0zm0 .3h3v.15H0zm0 .3h3v.15H0zm0 .3h3v.15H0zm0 .3h3v.15H0zm0 .3h3v.15H0z"/><path fill="#3c3b6e" d="M0 0h1.2v1.05H0z"/></svg>'
      })
      return
    }

    if (url.host === 'fonts.googleapis.com') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* fonts disabled for deterministic documentation capture */' })
      return
    }

    if (url.host === 'fonts.gstatic.com') {
      await route.abort('blockedbyclient')
      return
    }

    if (DISABLED_THIRD_PARTY_HOSTS.has(url.host)) {
      await route.abort('blockedbyclient')
      return
    }

    const fixtureRoute = fixtureRouteFor(request, url, fixture)
    if (fixtureRoute) {
      const responseIndex = requestLog.matched.filter(({ method, pattern }) => (
        method === normalizeMethod(request.method()) && pattern === fixtureRoute.pattern
      )).length
      const limit = fixtureRoute.assert?.count ?? fixtureRoute.assert?.maxCount
      if (!fixtureRoute.sharedFallback || responseIndex < limit) {
        requestLog.matched.push({
          method: normalizeMethod(request.method()),
          url: url.pathname + url.search,
          pattern: fixtureRoute.pattern,
          body: requestBody(request)
        })
        const delayMs = fixtureRoute.transport?.delayMs ?? 0
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
        if (fixtureRoute.transport?.abortSequence?.[responseIndex]) {
          await route.abort('failed')
          return
        }
        await route.fulfill(responseOptions(fixtureRoute, responseIndex))
        return
      }
    }

    const reason = fixtureRoute ? ' (shared fallback limit exceeded)' : ''
    requestLog.unknown.push(`${request.method()} ${url.origin}${url.pathname}${reason}`)
    await route.fulfill({
      status: 418,
      contentType: 'application/json',
      body: JSON.stringify({ error: true, result: 'Blocked by the documentation capture guard.' })
    })
  })
}

export const assertNoUnknownRequests = (requestLog) => {
  if (requestLog.unknown.length === 0) return
  const uniqueRequests = [...new Set(requestLog.unknown)]
  throw new Error(`Unknown requests were blocked during documentation capture:\n${uniqueRequests.join('\n')}`)
}

export const assertWebSocketIsolation = async (page) => {
  const isolation = await page.evaluate(() => {
    const guard = window.__DOC_WEBSOCKET_GUARD__
    return {
      installed: Boolean(guard && window.WebSocket === guard.constructor),
      attempts: (guard?.attempts || []).map(({ origin, pathname, protocolCount, queryKeys, hasToken }) => ({
        origin,
        pathname,
        protocolCount,
        queryKeys,
        hasToken
      }))
    }
  })
  if (!isolation.installed) throw new Error('Documentation WebSocket guard is not installed.')
  const unsafeAttempt = isolation.attempts.find(({ origin, pathname, protocolCount, queryKeys, hasToken }) => (
    typeof origin !== 'string' || !/^wss?:\/\//.test(origin) ||
    typeof pathname !== 'string' || !pathname.startsWith('/') ||
    !Number.isInteger(protocolCount) || protocolCount < 0 ||
    !Array.isArray(queryKeys) || queryKeys.some(key => typeof key !== 'string') ||
    typeof hasToken !== 'boolean'
  ))
  if (unsafeAttempt) throw new Error('Documentation WebSocket guard recorded a malformed blocked attempt.')
  return isolation.attempts
}

const isSubset = (actual, expected) => {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && expected.length === actual.length && expected.every(
      (value, index) => isSubset(actual[index], value)
    )
  }
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return actual && typeof actual === 'object' && Object.entries(expected).every(
      ([key, value]) => isSubset(actual[key], value)
    )
  }
  return Object.is(actual, expected)
}

export const waitForRequestQuiescence = async (requestLog, { quietMs = 250, timeout = 3000 } = {}) => {
  const startedAt = Date.now()
  while (Date.now() - (requestLog.lastActivity || startedAt) < quietMs) {
    if (Date.now() - startedAt > timeout) throw new Error(`Network did not become quiet within ${timeout}ms`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

export const assertFixtureRequests = (fixture, requestLog) => {
  const failures = []

  fixture.routes.forEach((fixtureRoute) => {
    const assertion = fixtureRoute.assert
    if (!assertion) return
    const matches = requestLog.matched.filter((request) => (
      request.method === normalizeMethod(fixtureRoute.method) && request.pattern === fixtureRoute.pattern
    ))
    const exactCount = assertion.count
    const minimum = exactCount ?? assertion.minCount ?? 0
    const maximum = exactCount ?? assertion.maxCount ?? Number.POSITIVE_INFINITY

    if (matches.length < minimum || matches.length > maximum) {
      failures.push(`${normalizeMethod(fixtureRoute.method)} ${fixtureRoute.pattern}: expected ${minimum}-${maximum} requests, received ${matches.length}`)
    }
    if (assertion.bodyContains && !matches.some((request) => isSubset(request.body, assertion.bodyContains))) {
      failures.push(`${normalizeMethod(fixtureRoute.method)} ${fixtureRoute.pattern}: no request body contained the expected fields`)
    }
  })

  if (failures.length > 0) {
    throw new Error(`Documentation request assertions failed:\n${failures.join('\n')}`)
  }
}
