import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// worker/seo.js imports its JSON without the `with { type: 'json' }` attribute that Node requires (wrangler's bundler does not); serve the named exports it reads.
registerHooks({
  load (url, context, nextLoad) {
    if (!url.endsWith('/theme.compiled.json')) return nextLoad(url, context)
    const { product_type: productType, version } = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
    return { format: 'module', shortCircuit: true, source: `export const product_type = ${JSON.stringify(productType)}; export const version = ${JSON.stringify(version)}` }
  }
})

const { default: worker } = await import('../../worker/index.js')

const SHA = 'a'.repeat(40)
const BUILT_AT = '2026-11-19T10:00:00.000Z'
// ASSETS.fetch throws: /version must not touch assets, config or the tenant.
const baseEnv = { ASSETS: { fetch: () => { throw new Error('ASSETS must not be used') } } }

const get = (url, vars, method = 'GET') =>
  worker.fetch(new Request(url, { method }), { ...baseEnv, ...vars }, {})

test('/version answers the deploy-check contract', async () => {
  const response = await get('https://grateful-summit-uodgzl-market.my-sites.app/version', { WORKER_COMMIT: SHA.toUpperCase(), WORKER_BUILT_AT: BUILT_AT, OTHER_SECRET: 'x' })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json; charset=UTF-8')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { commit: SHA, built_at: BUILT_AT })
})

test('/version gives null for a missing or invalid commit and built_at', async () => {
  for (const vars of [undefined, { WORKER_COMMIT: 'abc123', WORKER_BUILT_AT: 'not a date' }, { WORKER_COMMIT: `${SHA}0`, WORKER_BUILT_AT: '' }]) {
    const response = await get('https://grateful-summit-uodgzl-market.my-sites.app/version', vars)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { commit: null, built_at: null })
  }
  assert.deepEqual(await (await get('https://x.example/version', { WORKER_COMMIT: SHA, WORKER_BUILT_AT: 'nope' })).json(), { commit: SHA, built_at: null })
})

test('/version is served on a custom domain and for HEAD', async () => {
  const vars = { WORKER_COMMIT: SHA, WORKER_BUILT_AT: BUILT_AT }
  assert.deepEqual(await (await get('https://pedidos.ejemplo.com/version', vars)).json(), { commit: SHA, built_at: BUILT_AT })
  const head = await get('https://pedidos.ejemplo.com/version', vars, 'HEAD')
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('cache-control'), 'no-store')
})

test('/versions does not enter the version branch', async () => {
  await assert.rejects(get('https://pedidos.ejemplo.com/versions'), /ASSETS must not be used|fetch|undefined/)
})
