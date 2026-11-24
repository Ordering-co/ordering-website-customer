import fs from 'node:fs/promises'
import { resolveProductPath } from './paths.js'

const PRIVATE_KEY = /(?:password|secret|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|session[_-]?(?:id|token)|id[_-]?token|jwt|cookie(?:Token|Value|Header|Session)|(?:^|[_-])cookie(?:$|[_-](?:token|value|header|session)(?:$|[_-]))|credential|private[_-]?key|client[_-]?secret|card[_-]?number|cvv|cvc|(^|[_-])token($|[_-]))/i
const PII_KEY = /(?:^|[_-])(?:email|phone|mobile|first[_-]?name|last[_-]?name|street|address)(?:$|[_-])/i
const NON_PII_VERIFICATION_FLAG = /^(?:email|phone)_verified$/
const JWT = /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/
const BEARER = /\bBearer\s+[a-zA-Z0-9._~+/-]+=*/i
const BASIC_AUTH = /\bBasic\s+[a-zA-Z0-9+/]{8,}={0,2}\b/i
const PAYMENT_CARD = /\b(?:\d[ -]*?){13,19}\b/
const NON_SYNTHETIC_EMAIL = /\b[A-Z0-9._%+-]+@(?!example\.com\b)(?![^\s@]*\.(?:invalid|test|example)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const SYNTHETIC_VALUE = /(?:synthetic|fixture|example|docs?|test|fake|placeholder)/i
const STORAGE_CREDENTIAL_KEY = /(?:auth|token|session|jwt|cookie|credential|password|secret|api.?key|private.?key|bearer)/i
const RESERVED_AUTH_STORAGE_KEY = /^(?:user|user-customer)$/
const AUTH_FIXTURE_TOKEN = /^docs-fixture-[a-z0-9-]{8,80}$/
const SYNTHETIC_PERSON_NAME = /^(?:Synthetic|Fixture|Docs|Test)\b/
const AUTH_SESSION_KEYS = new Set(['token', 'user', 'customer'])
const AUTH_USER_KEYS = new Set([
  'id',
  'name',
  'lastname',
  'email',
  'cellphone',
  'country_phone_code',
  'birthdate',
  'session_strategy',
  'enabled',
  'email_verified',
  'phone_verified',
  'session'
])
const AUTH_CUSTOMER_KEYS = new Set(['id', 'name'])
const AUTH_TOGGLE_CONFIG_KEYS = new Set([
  'email_password_login_enabled',
  'phone_password_login_enabled',
  'opt_email_enabled',
  'otp_cellphone_enabled',
  'whatsapp_otp_login_enabled',
  'email_otp_signup_enabled',
  'phone_otp_signup_enabled',
  'verification_email_required',
  'verification_phone_required'
])

// Sensitive fixture fields are sometimes structured API values rather than strings
// (for example configs.map_box_token or Mapbox context.address). Only accept the
// structure when one of its direct identity fields is explicitly marked synthetic;
// a marker buried elsewhere in the object must not allow real PII through.
const SYNTHETIC_IDENTITY_KEYS = new Set([
  'value',
  'id',
  'address',
  'street',
  'name',
  'full_address',
  'address_number',
  'mapbox_id'
])

const isExplicitSyntheticStructure = (value) => (
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.entries(value).some(([key, child]) => (
    SYNTHETIC_IDENTITY_KEYS.has(key) &&
    typeof child === 'string' &&
    SYNTHETIC_VALUE.test(child)
  ))
)

const isReservedSyntheticValue = (value) => (
  value === '' || value === null || value === false ||
  (typeof value === 'string' && SYNTHETIC_VALUE.test(value)) ||
  isExplicitSyntheticStructure(value)
)

const isReservedSyntheticPrivateValue = (value) => (
  value === '' || value === null || value === false ||
  (typeof value === 'string' && SYNTHETIC_VALUE.test(value)) ||
  (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    isReservedSyntheticPrivateValue(value.value)
  )
)

const isBoundedAuthToggleConfig = (path, key, value) => (
  path === '$.firstLoad.configs' &&
  AUTH_TOGGLE_CONFIG_KEYS.has(key) &&
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  value.key === key &&
  ['0', '1', 'false', 'true'].includes(value.value)
)

const isBoundedPhonePreference = (path, key, value) => (
  path === '$.localStorage' &&
  key === 'local_phone_code' &&
  typeof value === 'string' &&
  /^\+\d{1,3}$/.test(value)
)

const isBoundedSyntheticAuthContact = (path, key, value) => {
  if (key === 'email') return typeof value === 'string' && /^(?:(?:docs?|synthetic|fixture)[^@]*@example\.invalid|docs@e\.invalid)$/i.test(value)
  if (key === 'cellphone') return typeof value === 'string' && (/^555\d{4}$/.test(value) || value === '2025550199')
  if (key === 'country_phone_code') return value === '1'
  if (key === 'birthdate') return value === '2000-01-01'
  if (path === '$.authSession.user' && key === 'lastname') return value === '' || (typeof value === 'string' && SYNTHETIC_PERSON_NAME.test(value))
  return false
}

const isBoundedSyntheticAddressId = (path, key, value) => (
  /^\$\.routes\[\d+\]\.(?:response|responseSequence\[\d+\])(?:\.|$)/.test(path) &&
  key === 'address_id' &&
  Number.isInteger(value) &&
  [9401, 9402, 9403, 9701].includes(value)
)

const inspectPrivacy = (value, path = '$', findings = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectPrivacy(item, `${path}[${index}]`, findings))
    return findings
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`
      const isBoundedNonIdentityValue = isBoundedAuthToggleConfig(path, key, child) ||
        isBoundedPhonePreference(path, key, child) ||
        isBoundedSyntheticAuthContact(path, key, child) ||
        isBoundedSyntheticAddressId(path, key, child)
      if (PRIVATE_KEY.test(key) && !isReservedSyntheticPrivateValue(child) && !isBoundedNonIdentityValue) {
        findings.push(`${childPath} uses a sensitive field name with a populated value`)
      }
      if (PII_KEY.test(key) && !NON_PII_VERIFICATION_FLAG.test(key) && !isReservedSyntheticValue(child) && !isBoundedNonIdentityValue) findings.push(`${childPath} contains non-synthetic PII`)
      inspectPrivacy(child, childPath, findings)
    }
    return findings
  }

  if (typeof value !== 'string') return findings
  if (JWT.test(value)) findings.push(`${path} resembles a JWT`)
  if (BEARER.test(value)) findings.push(`${path} contains a bearer credential`)
  if (BASIC_AUTH.test(value)) findings.push(`${path} contains a basic-auth credential`)
  try {
    const url = new URL(value)
    if (url.username || url.password) findings.push(`${path} contains URL credentials`)
  } catch {
    // Most fixture strings are not URLs.
  }
  if (PAYMENT_CARD.test(value.replace(/\b20\d{2}\b/g, ''))) findings.push(`${path} resembles a payment-card number`)
  if (NON_SYNTHETIC_EMAIL.test(value)) findings.push(`${path} contains a non-synthetic email address`)
  return findings
}

export const assertFixturePrivacy = (fixture) => {
  const findings = inspectPrivacy(fixture)
  if (findings.length > 0) {
    throw new Error(`Documentation fixture failed privacy validation:\n${findings.join('\n')}`)
  }
}

export const loadFixture = async (fixtureName) => {
  const { fallbackRoutes = [], ...fixture } = await loadFixtureSource(fixtureName)
  const fixturePath = resolveProductPath('e2e', 'docs', 'fixtures', fixtureName, 'fixture.json')
  validateFixture(fixture, fixturePath)
  validateFallbackRoutes(fallbackRoutes, fixturePath)
  const ownRoutes = new Set(fixture.routes.map(({ method, pattern }) => `${method} ${pattern}`))
  fixture.routes.push(...fallbackRoutes
    .filter(({ method, pattern }) => !ownRoutes.has(`${method} ${pattern}`))
    .map(route => ({ ...route, sharedFallback: true })))
  assertFixturePrivacy(fixture)
  return fixture
}

export const setSharedReadLimit = (fixture, endpoint, limit) => {
  const { api, project } = fixture.runtimeConfig
  const pathname = `/${api.version}/${api.language}/${project}/${endpoint}`
  const route = fixture.routes.find(route => route.sharedFallback && new RegExp(route.pattern).test(pathname))
  if (!route || !Number.isInteger(limit) || limit < 0) throw new Error(`Invalid shared read limit for ${endpoint}`)
  route.assert.maxCount = limit
}

// Shared responses are exact, bounded reads of the synthetic project API.
const validateFallbackRoutes = (routes, source) => {
  if (!Array.isArray(routes)) throw new Error(`${source}.fallbackRoutes must be an array`)
  for (const route of routes) {
    const { query, assert: assertion } = route
    if (route.method !== 'GET' || !query || typeof query !== 'object' || Array.isArray(query) ||
      Object.values(query).some(value => typeof value !== 'string') ||
      !Number.isInteger(assertion?.maxCount) || assertion.maxCount < 0) {
      throw new Error(`${source}: each fallback route must declare GET, exact query strings and a request limit`)
    }
  }
}

const mergeFixtureObjects = (base, override) => {
  if (!base || typeof base !== 'object' || Array.isArray(base)) return override
  if (!override || typeof override !== 'object' || Array.isArray(override)) return override
  return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(override)])].map((key) => [
    key,
    key in override ? mergeFixtureObjects(base[key], override[key]) : base[key]
  ]))
}

const loadFixtureSource = async (fixtureName, ancestry = []) => {
  if (!/^[a-z0-9-]+$/.test(fixtureName)) throw new Error(`Invalid documentation fixture name: ${fixtureName}`)
  if (ancestry.includes(fixtureName)) throw new Error(`Circular documentation fixture inheritance: ${[...ancestry, fixtureName].join(' -> ')}`)
  const fixturePath = resolveProductPath('e2e', 'docs', 'fixtures', fixtureName, 'fixture.json')
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'))
  if (!fixture.extends) return fixture
  if (typeof fixture.extends !== 'string') throw new Error(`${fixturePath}.extends must be a fixture name`)
  const base = await loadFixtureSource(fixture.extends, [...ancestry, fixtureName])
  const { extends: _extends, appendRoutes = [], ...override } = fixture
  if (!Array.isArray(appendRoutes)) throw new Error(`${fixturePath}.appendRoutes must be an array`)
  const merged = mergeFixtureObjects(base, override)
  merged.routes = [...(override.routes ?? base.routes ?? []), ...appendRoutes]
  return merged
}

const requireNonNegativeInteger = (value, label, errors) => {
  if (value !== undefined && (!Number.isInteger(value) || value < 0)) errors.push(`${label} must be a non-negative integer`)
}

export const validateFixture = (fixture, source = 'fixture') => {
  const errors = []
  if (!Array.isArray(fixture.routes)) errors.push('routes must be an array')
  const apiOrigins = fixture.apiOrigins || [fixture.runtimeConfig?.api?.url]
  if (apiOrigins.some((origin) => typeof origin !== 'string' || !/^https?:\/\//.test(origin))) {
    errors.push('apiOrigins must contain absolute HTTP(S) origins')
  }
  if (fixture.localStorage !== undefined) {
    if (!fixture.localStorage || typeof fixture.localStorage !== 'object' || Array.isArray(fixture.localStorage)) {
      errors.push('localStorage must be an object of string keys and string values')
    } else {
      for (const [key, value] of Object.entries(fixture.localStorage)) {
        if (!key || typeof value !== 'string') {
          errors.push('localStorage must be an object of non-empty string keys and string values')
        }
        if (STORAGE_CREDENTIAL_KEY.test(key) || RESERVED_AUTH_STORAGE_KEY.test(key)) errors.push(`localStorage key ${key} is credential-like and is not allowed`)
        if (typeof value === 'string') {
          try {
            const parsedValue = JSON.parse(value)
            errors.push(...inspectPrivacy(parsedValue, `$.localStorage.${key}`))
          } catch {
            // Plain string storage values are scanned by assertFixturePrivacy.
          }
        }
      }
    }
  }
  if (fixture.authSession !== undefined) {
    const session = fixture.authSession
    if (!session || typeof session !== 'object' || Array.isArray(session)) {
      errors.push('authSession must be an object')
    } else {
      const extraSessionKeys = Object.keys(session).filter((key) => !AUTH_SESSION_KEYS.has(key))
      if (extraSessionKeys.length > 0) errors.push(`authSession contains unsupported keys: ${extraSessionKeys.join(', ')}`)
      if (typeof session.token !== 'string' || !AUTH_FIXTURE_TOKEN.test(session.token)) {
        errors.push('authSession.token must match the bounded docs-fixture token format')
      }
      if (!session.user || typeof session.user !== 'object' || !Number.isInteger(session.user.id)) {
        errors.push('authSession.user must contain an integer id')
      } else {
        const extraUserKeys = Object.keys(session.user).filter((key) => !AUTH_USER_KEYS.has(key))
        if (extraUserKeys.length > 0) errors.push(`authSession.user contains unsupported keys: ${extraUserKeys.join(', ')}`)
        if (typeof session.user.name !== 'string' || !SYNTHETIC_PERSON_NAME.test(session.user.name)) {
          errors.push('authSession.user.name must be explicitly synthetic')
        }
        if (session.user.enabled !== true || typeof session.user.email_verified !== 'boolean' || typeof session.user.phone_verified !== 'boolean') {
          errors.push('authSession.user must be enabled and contain boolean verification flags')
        }
        if (session.user.email !== undefined && !isBoundedSyntheticAuthContact('$.authSession.user', 'email', session.user.email)) {
          errors.push('authSession.user.email must be an explicitly synthetic example.invalid address')
        }
        if (session.user.cellphone !== undefined && !isBoundedSyntheticAuthContact('$.authSession.user', 'cellphone', session.user.cellphone)) {
          errors.push('authSession.user.cellphone must be a bounded synthetic 555 value')
        }
        if (session.user.country_phone_code !== undefined && !isBoundedSyntheticAuthContact('$.authSession.user', 'country_phone_code', session.user.country_phone_code)) {
          errors.push('authSession.user.country_phone_code must use the bounded synthetic fixture value')
        }
        if (session.user.birthdate !== undefined && !isBoundedSyntheticAuthContact('$.authSession.user', 'birthdate', session.user.birthdate)) {
          errors.push('authSession.user.birthdate must use the bounded synthetic fixture value')
        }
        if (session.user.session_strategy !== undefined && !['jwt', 'jwt_session'].includes(session.user.session_strategy)) {
          errors.push('authSession.user.session_strategy must use a bounded Website session strategy')
        }
        const userSession = session.user.session
        if (!userSession || typeof userSession !== 'object' || Array.isArray(userSession) ||
          Object.keys(userSession).some((key) => key !== 'access_token') ||
          userSession.access_token !== session.token) {
          errors.push('authSession.user.session must contain only the matching access_token')
        }
      }
      if (session.customer !== undefined && (
        !session.customer || typeof session.customer !== 'object' || !Number.isInteger(session.customer.id)
      )) {
        errors.push('authSession.customer must contain an integer id')
      } else if (session.customer !== undefined) {
        const extraCustomerKeys = Object.keys(session.customer).filter((key) => !AUTH_CUSTOMER_KEYS.has(key))
        if (extraCustomerKeys.length > 0) errors.push(`authSession.customer contains unsupported keys: ${extraCustomerKeys.join(', ')}`)
        if (session.customer.id !== session.user?.id) errors.push('authSession.customer.id must match authSession.user.id')
        if (typeof session.customer.name !== 'string' || !SYNTHETIC_PERSON_NAME.test(session.customer.name)) {
          errors.push('authSession.customer.name must be explicitly synthetic')
        }
      }
    }
  }
  for (const [index, route] of (fixture.routes || []).entries()) {
    const label = `routes[${index}]`
    if (!/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(route.method || '')) errors.push(`${label}.method is required and must be uppercase`)
    try {
      RegExp(route.pattern)
    } catch {
      errors.push(`${label}.pattern must be a valid regular expression`)
    }
    const assertion = route.assert || {}
    requireNonNegativeInteger(assertion.count, `${label}.assert.count`, errors)
    requireNonNegativeInteger(assertion.minCount, `${label}.assert.minCount`, errors)
    requireNonNegativeInteger(assertion.maxCount, `${label}.assert.maxCount`, errors)
    requireNonNegativeInteger(route.transport?.delayMs, `${label}.transport.delayMs`, errors)
    if (route.responseSequence !== undefined && (!Array.isArray(route.responseSequence) || route.responseSequence.length === 0)) {
      errors.push(`${label}.responseSequence must be a non-empty array when provided`)
    }
    for (const key of ['statusSequence', 'contentTypeSequence', 'abortSequence']) {
      if (route.transport?.[key] !== undefined && !Array.isArray(route.transport[key])) {
        errors.push(`${label}.transport.${key} must be an array when provided`)
      }
    }
    if (assertion.minCount !== undefined && assertion.maxCount !== undefined && assertion.minCount > assertion.maxCount) {
      errors.push(`${label}.assert.minCount must not exceed maxCount`)
    }
  }
  if (errors.length > 0) throw new Error(`Invalid documentation ${source}:\n${errors.join('\n')}`)
  return fixture
}

export const fixtureStorageEntries = (fixture, { authenticated = false } = {}) => {
  const entries = { ...(fixture.localStorage || {}) }
  if (!authenticated || !fixture.authSession) return entries
  entries.token = fixture.authSession.token
  entries.user = JSON.stringify(fixture.authSession.user)
  if (fixture.authSession.customer) entries['user-customer'] = JSON.stringify(fixture.authSession.customer)
  return entries
}

export const installFixtureGlobals = async (page, fixture, { authenticated = false } = {}) => {
  const storageEntries = fixtureStorageEntries(fixture, { authenticated })
  await page.addInitScript((data) => {
    const blockedWebSocketAttempts = []
    class DocumentationWebSocket extends window.EventTarget {
      static CONNECTING = 0
      static OPEN = 1
      static CLOSING = 2
      static CLOSED = 3

      constructor (url, protocols) {
        super()
        const parsedUrl = new URL(String(url), window.location.origin)
        blockedWebSocketAttempts.push({
          origin: parsedUrl.origin,
          pathname: parsedUrl.pathname,
          protocolCount: Array.isArray(protocols) ? protocols.length : protocols ? 1 : 0,
          queryKeys: [...new Set([...parsedUrl.searchParams.keys()])].sort(),
          hasToken: parsedUrl.searchParams.has('token')
        })
        this.url = parsedUrl.href
        this.protocol = ''
        this.extensions = ''
        this.binaryType = 'blob'
        this.bufferedAmount = 0
        this.readyState = DocumentationWebSocket.CONNECTING
        this.onopen = null
        this.onmessage = null
        this.onerror = null
        this.onclose = null
      }

      send () {
        throw new Error('Documentation WebSocket guard blocked send().')
      }

      close () {
        this.readyState = DocumentationWebSocket.CLOSED
      }
    }

    Object.defineProperty(window, 'WebSocket', {
      configurable: false,
      writable: false,
      value: DocumentationWebSocket
    })
    Object.defineProperty(window, '__DOC_WEBSOCKET_GUARD__', {
      configurable: false,
      writable: false,
      value: Object.freeze({
        attempts: blockedWebSocketAttempts,
        constructor: DocumentationWebSocket
      })
    })
    window.__CONFIG__ = data.runtimeConfig
    window.__FIRST_LOAD__ = data.firstLoad
    // The documented store page is the `classic` one (cover and tabs); the schema's default is the direct menu, whose
    // own capture is a separate task: a fixture that saves a template keeps it.
    const theme = (window.__FIRST_LOAD__.theme ||= { version: 2, values: {} })
    theme.values ||= {}
    theme.values.components ||= {}
    theme.values.components.store_page ||= { base: { template: 'classic' } }
    window.__GEO__ = data.geo
    window.__EDGE_XHR__ = data.edgeXhr
    window.localStorage.clear()
    window.sessionStorage.clear()
    Object.entries(data.storageEntries).forEach(([key, value]) => {
      window.localStorage.setItem(key, value)
    })
  }, { ...fixture, storageEntries })
}
