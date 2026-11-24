import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import test from 'node:test'
import { assertFixturePrivacy, fixtureStorageEntries, loadFixture, validateFixture } from '../lib/fixtures.js'

test('all documentation fixtures resolve to the shared v2 boot contract', async () => {
  const fixtures = await readdir(new URL('../fixtures/', import.meta.url), { withFileTypes: true })
  for (const directory of fixtures.filter(entry => entry.isDirectory())) {
    const fixture = await loadFixture(directory.name)
    assert.equal(fixture.firstLoad.theme.version, 2, directory.name)
    assert.equal(fixture.runtimeConfig.project, 'docsmarket', directory.name)
    assert.ok(fixture.firstLoad.configs.default_order_type.value, directory.name)
    assert.ok(fixture.routes.some(route => route.method === 'GET' && new RegExp(route.pattern).test('/v400/en/docsmarket/pages')), directory.name)
  }
})

test('a page override takes precedence over the shared page fallback', async () => {
  const route = (fixture) => fixture.routes.find(item => item.method === 'GET' && new RegExp(item.pattern).test('/v400/en/docsmarket/pages'))
  const common = await loadFixture('common')
  const help = await loadFixture('help-content-pages')
  assert.deepEqual(route(common).response.result, [])
  assert.equal(route(help).response.result[0].slug, 'docs-help-topic')
})

test('accepts explicitly synthetic structured address and configuration values', () => {
  assert.doesNotThrow(() => assertFixturePrivacy({
    configs: {
      map_box_token: { key: 'map_box_token', value: 'docs-fixture-mapbox-token' }
    },
    suggestion: {
      context: {
        address: { address_number: 'docs-fixture-100' },
        street: { name: 'Docs Fixture Avenue' }
      }
    },
    order: {
      address_id: 'docs-fixture-address-8001',
      address: {
        id: 8001,
        address: '100 Synthetic Market Street',
        location: { lat: 30.2672, lng: -97.7431 }
      }
    }
  }))
})

test('rejects real-looking structured credentials even with a harmless sibling marker', () => {
  assert.throws(() => assertFixturePrivacy({
    map_box_token: {
      value: 'pk.real-looking-map-provider-token',
      note: 'docs fixture'
    }
  }), /sensitive field name/)
})

test('rejects real-looking structured credentials even with a synthetic id', () => {
  assert.throws(() => assertFixturePrivacy({
    map_box_token: {
      id: 'synthetic',
      value: 'pk.real-looking-secret'
    }
  }), /sensitive field name/)
})

test('rejects real-looking structured addresses even with a buried synthetic marker', () => {
  assert.throws(() => assertFixturePrivacy({
    address: {
      address: '742 Evergreen Terrace',
      metadata: { name: 'docs fixture' }
    }
  }), /non-synthetic PII/)
})

test('rejects real-looking address identifiers', () => {
  assert.throws(() => assertFixturePrivacy({ address_id: 8001 }), /non-synthetic PII/)
})

test('accepts only bounded synthetic address identifiers inside fixture routes', () => {
  assert.doesNotThrow(() => assertFixturePrivacy({
    routes: [
      { response: { result: { address_id: 9401 } } },
      { responseSequence: [{ result: { nested: { address_id: 9402 } } }] },
      { response: { result: { address_id: 9701 } } }
    ]
  }))
  for (const unsafe of [
    { address_id: 9401 },
    { routes: [{ request: { body: { address_id: 9401 } } }] },
    { routes: [{ metadata: { address_id: 9401 } }] },
    { routes: [{ response: { result: { address_id: 9499 } } }] }
  ]) assert.throws(() => assertFixturePrivacy(unsafe), /non-synthetic PII/)

  assert.throws(() => validateFixture({
    localStorage: { options: JSON.stringify({ routes: [{ response: { address_id: 9401 } }] }) },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }), /non-synthetic PII/)
})

test('accepts the inherited addresses fixture only after its appended response routes are merged', async () => {
  const fixture = await loadFixture('addresses')
  const addressResponses = fixture.routes
    .flatMap(route => [route.response, ...(route.responseSequence || [])])
    .filter(Boolean)
  assert.ok(addressResponses.some(response => response.result?.address_id === 9401))
  assert.doesNotThrow(() => assertFixturePrivacy(fixture))
})

test('accepts synthetic string-only local storage seeds', () => {
  assert.doesNotThrow(() => validateFixture({
    localStorage: {
      options: JSON.stringify({
        type: 1,
        address: {
          address: '100 Synthetic Market Street',
          location: { lat: 30.2672, lng: -97.7431 }
        }
      })
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }))
})

test('accepts bounded auth toggle configs and a phone-country preference without accepting identity data', () => {
  assert.doesNotThrow(() => validateFixture({
    firstLoad: {
      configs: {
        email_password_login_enabled: { key: 'email_password_login_enabled', value: '1' },
        phone_password_login_enabled: { key: 'phone_password_login_enabled', value: '1' },
        verification_phone_required: { key: 'verification_phone_required', value: '0' }
      }
    },
    localStorage: { local_phone_code: '+1' },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }))
  assert.throws(() => assertFixturePrivacy({
    firstLoad: {
      configs: {
        email_password_login_enabled: { key: 'email_password_login_enabled', value: 'real-secret' }
      }
    }
  }), /sensitive field name/)
  assert.throws(() => assertFixturePrivacy({
    localStorage: { local_phone_code: '+15551234567' }
  }), /non-synthetic PII/)
})

test('rejects credential-like local storage keys across naming styles', () => {
  for (const key of ['access_token', 'authToken', 'session_id', 'sessionId', 'id_token', 'idToken', 'jwt', 'cookieConsent', 'credential', 'privateKey', 'client_secret', 'user', 'user-customer']) {
    assert.throws(() => validateFixture({
      localStorage: { [key]: 'synthetic-value' },
      apiOrigins: ['https://api.docs.invalid'],
      routes: []
    }), /credential-like/)
  }
})

test('rejects real credentials in nested fixture objects across naming styles', () => {
  for (const key of ['authToken', 'session_id', 'sessionId', 'idToken', 'jwt', 'cookie', 'credential', 'privateKey', 'clientSecret']) {
    assert.throws(() => assertFixturePrivacy({ nested: { [key]: 'real-value-123' } }), /sensitive field name/)
  }
})

test('accepts explicitly synthetic nested credential placeholders', () => {
  assert.doesNotThrow(() => assertFixturePrivacy({
    nested: {
      authToken: 'synthetic-auth-token',
      session_id: 'docs-fixture-session',
      idToken: 'test-id-token',
      jwt: 'placeholder-jwt',
      cookie: 'fake-cookie',
      credential: 'synthetic-credential',
      privateKey: 'docs-private-key',
      clientSecret: 'fixture-client-secret'
    }
  }))
})

test('accepts an explicitly synthetic authenticated-session seed', () => {
  const fixture = {
    authSession: {
      token: 'docs-fixture-session-token',
      user: {
        id: 9101,
        name: 'Synthetic Customer',
        enabled: true,
        email_verified: true,
        phone_verified: true,
        session: { access_token: 'docs-fixture-session-token' }
      }
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }
  assert.doesNotThrow(() => validateFixture(fixture))
  assert.deepEqual(fixtureStorageEntries(fixture), {})
  assert.deepEqual(Object.keys(fixtureStorageEntries(fixture, { authenticated: true })).sort(), ['token', 'user'])
  assert.equal(JSON.parse(fixtureStorageEntries(fixture, { authenticated: true }).user).id, 9101)
})

test('accepts bounded synthetic verification contacts without allowing real contact data', () => {
  const fixture = {
    authSession: {
      token: 'docs-fixture-verification-session-token',
      user: {
        id: 9301,
        name: 'Synthetic Verification Customer',
        lastname: '',
        email: 'docs-verification@example.invalid',
        cellphone: '5550199',
        country_phone_code: '1',
        enabled: true,
        email_verified: false,
        phone_verified: false,
        session: { access_token: 'docs-fixture-verification-session-token' }
      }
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }
  assert.doesNotThrow(() => validateFixture(fixture))
  assert.doesNotThrow(() => assertFixturePrivacy(fixture))
  assert.throws(() => validateFixture({
    ...fixture,
    authSession: { ...fixture.authSession, user: { ...fixture.authSession.user, email: 'person@company.com' } }
  }), /example\.invalid/)
  assert.throws(() => validateFixture({
    ...fixture,
    authSession: { ...fixture.authSession, user: { ...fixture.authSession.user, cellphone: '2125551234' } }
  }), /bounded synthetic 555/)
})

test('accepts only the bounded synthetic profile birthdate', () => {
  const fixture = {
    authSession: {
      token: 'docs-fixture-profile-session-token',
      user: {
        id: 9301,
        name: 'Synthetic Profile Customer',
        email: 'docs@e.invalid',
        birthdate: '2000-01-01',
        enabled: true,
        email_verified: true,
        phone_verified: true,
        session: { access_token: 'docs-fixture-profile-session-token' }
      }
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }
  assert.doesNotThrow(() => validateFixture(fixture))
  assert.throws(() => validateFixture({
    ...fixture,
    authSession: { ...fixture.authSession, user: { ...fixture.authSession.user, birthdate: '1991-04-18' } }
  }), /bounded synthetic fixture value/)
})

test('accepts only bounded Website session strategies in authenticated fixtures', () => {
  const fixture = {
    authSession: {
      token: 'docs-fixture-sessions-session-token',
      user: {
        id: 9301,
        name: 'Synthetic Sessions Customer',
        session_strategy: 'jwt_session',
        enabled: true,
        email_verified: true,
        phone_verified: true,
        session: { access_token: 'docs-fixture-sessions-session-token' }
      }
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }
  assert.doesNotThrow(() => validateFixture(fixture))
  assert.doesNotThrow(() => validateFixture({
    ...fixture,
    authSession: { ...fixture.authSession, user: { ...fixture.authSession.user, session_strategy: 'jwt' } }
  }))
  assert.throws(() => validateFixture({
    ...fixture,
    authSession: { ...fixture.authSession, user: { ...fixture.authSession.user, session_strategy: 'legacy-cookie' } }
  }), /bounded Website session strategy/)
})

test('rejects unsafe or malformed authenticated-session seeds', () => {
  const validUser = {
    id: 9101,
    name: 'Synthetic Customer',
    enabled: true,
    email_verified: true,
    phone_verified: true,
    session: { access_token: 'docs-fixture-session-token' }
  }
  const fixture = (authSession) => ({ authSession, apiOrigins: ['https://api.docs.invalid'], routes: [] })
  for (const token of [
    '',
    ' real-docs-fixture-session-token',
    'prefix-docs-fixture-session-token',
    'Bearer docs-fixture-session-token',
    'eyJabcdefgh.abcdefgh.abcdefgh',
    'real-session-value'
  ]) {
    assert.throws(() => validateFixture(fixture({ token, user: { ...validUser, session: { access_token: token } } })), /bounded docs-fixture token format/)
  }
  assert.throws(() => validateFixture(fixture({
    token: 'docs-fixture-session-token',
    user: { ...validUser, email: 'real@example.com' }
  })), /example\.invalid/)
  assert.throws(() => validateFixture(fixture({
    token: 'docs-fixture-session-token',
    user: { ...validUser, name: 'Real Person' }
  })), /explicitly synthetic/)
  assert.throws(() => validateFixture(fixture({
    token: 'docs-fixture-session-token',
    user: { ...validUser, session: { access_token: 'docs-fixture-other-token' } }
  })), /matching access_token/)
  assert.throws(() => validateFixture(fixture({
    token: 'docs-fixture-session-token',
    user: validUser,
    customer: { id: 9102, name: 'Synthetic Customer' }
  })), /must match/)
  assert.throws(() => validateFixture(fixture({
    token: 'docs-fixture-session-token',
    user: validUser,
    customer: { id: 9101, name: 'Real Person', phone: '555-0100' }
  })), /unsupported keys|explicitly synthetic/)
  assert.throws(() => validateFixture(fixture({
    token: 'docs-fixture-session-token',
    user: validUser,
    unexpected: 'anything'
  })), /authSession contains unsupported keys/)
})

test('loads a dedicated fixture by inheriting and overriding a shared base', async () => {
  const fixture = await loadFixture('schedule-preorder')
  assert.equal(fixture.firstLoad.configs.order_types_allowed.value, '1|2|7|8')
  assert.equal(fixture.firstLoad.configs.use_alternative_to_google_maps.value, '1')
  assert.ok(fixture.routes.some((route) => route.pattern.includes('businesses')))
  assert.equal(fixture.authSession.user.id, 9101)
})

test('rejects non-string local storage values', () => {
  assert.throws(() => validateFixture({
    localStorage: { options: { type: 1 } },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }), /string keys and string values/)
})

test('rejects non-synthetic structured values hidden inside local storage JSON', () => {
  assert.throws(() => validateFixture({
    localStorage: {
      options: JSON.stringify({ address: { address: '742 Evergreen Terrace' } })
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }), /non-synthetic PII/)
})

test('rejects session tokens hidden inside local storage JSON', () => {
  assert.throws(() => validateFixture({
    localStorage: {
      options: JSON.stringify({ sessionToken: 'real-session-value' })
    },
    apiOrigins: ['https://api.docs.invalid'],
    routes: []
  }), /sensitive field name/)
})

test('accepts non-secret cookie-consent configuration', () => {
  assert.doesNotThrow(() => assertFixturePrivacy({ cookie_consent_enabled: true }))
})

test('accepts bounded response and transport sequences for deterministic retries', () => {
  assert.doesNotThrow(() => validateFixture({
    apiOrigins: ['https://api.docs.invalid'],
    routes: [{
      method: 'GET',
      pattern: '^/sequence$',
      responseSequence: [{ error: false }, { error: true }],
      transport: {
        statusSequence: [200, 401],
        contentTypeSequence: ['application/json', 'text/plain'],
        abortSequence: [false, true]
      }
    }]
  }))
})

test('rejects malformed response and transport sequences', () => {
  assert.throws(() => validateFixture({
    apiOrigins: ['https://api.docs.invalid'],
    routes: [{ method: 'GET', pattern: '^/sequence$', responseSequence: [] }]
  }), /responseSequence must be a non-empty array/)
  assert.throws(() => validateFixture({
    apiOrigins: ['https://api.docs.invalid'],
    routes: [{ method: 'GET', pattern: '^/sequence$', transport: { abortSequence: true } }]
  }), /transport.abortSequence must be an array/)
})

test('keeps the generic no-offers response distinct from eligibility claims', async () => {
  const fixture = await loadFixture('promotions')
  assert.deepEqual(fixture.scenarioResponses.empty, {
    error: false,
    result: [],
    pagination: null
  })
})
