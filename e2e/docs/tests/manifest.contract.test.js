import assert from 'node:assert/strict'
import test from 'node:test'
import { validateManifest } from '../lib/manifest.js'

const validManifest = {
  schema_version: 1,
  article_id: 'WEB-BRW-001',
  fixture: 'business-menu',
  route: '/store/synthetic-market',
  captures: [
    {
      id: 'business-menu-desktop',
      project: 'desktop-chromium',
      route: '/store/fixture-bakery',
      selector: "[data-doc-section='business-menu']",
      file: 'website-business-menu-desktop.png',
      alt: 'Synthetic business menu'
    }
  ]
}

test('accepts root-relative route overrides with query and hash', () => {
  assert.doesNotThrow(() => validateManifest({
    ...validManifest,
    route: '/store/synthetic-market?order_type=2#menu',
    captures: [{ ...validManifest.captures[0], route: '/store/fixture-bakery?order_type=2#menu' }]
  }))
})

test('accepts section and viewport capture modes', () => {
  for (const captureMode of ['section', 'viewport']) {
    assert.doesNotThrow(() => validateManifest({
      ...validManifest,
      captures: [{ ...validManifest.captures[0], capture_mode: captureMode }]
    }))
  }
})

test('rejects unsupported capture modes', () => {
  assert.throws(() => validateManifest({
    ...validManifest,
    captures: [{ ...validManifest.captures[0], capture_mode: 'full-page' }]
  }), /capture_mode must be section or viewport/)
})

test('rejects unsafe per-capture route overrides without throwing type errors', () => {
  const unsafeRoutes = [
    'https://example.invalid/store/fixture-bakery',
    '//example.invalid/store/fixture-bakery',
    '///example.invalid/store/fixture-bakery',
    '/\\example.invalid/store/fixture-bakery',
    '/%5cexample.invalid/store/fixture-bakery',
    '/%2f%2fexample.invalid/store/fixture-bakery',
    '/../fixture-bakery',
    '/%2e%2e/fixture-bakery',
    '/%252e%252e/fixture-bakery',
    '/%25252e%25252e/fixture-bakery',
    '/%2525252e%2525252e/fixture-bakery',
    '/store/%',
    ' /store/fixture-bakery',
    '/store/fixture-bakery ',
    42,
    {},
    null
  ]

  for (const route of unsafeRoutes) {
    assert.throws(() => validateManifest({
      ...validManifest,
      captures: [{ ...validManifest.captures[0], route }]
    }), /captures\[0\]\.route/)
  }
})

test('rejects unsafe top-level manifest routes', () => {
  for (const route of [
    '//example.invalid/store/synthetic-market',
    '/%255c%255cexample.invalid/store/synthetic-market',
    '/%2525252e%2525252e/synthetic-market',
    '/store/%',
    ' /store/synthetic-market',
    null
  ]) {
    assert.throws(() => validateManifest({ ...validManifest, route }), /route/)
  }
})
