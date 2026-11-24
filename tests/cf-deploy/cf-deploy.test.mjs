import assert from 'node:assert/strict'
import test from 'node:test'
import { activeVersionId, entryScript, smokeProblems, versionVars } from '../../scripts/cf-deploy.mjs'

const page = (entry = '/assets/index-abc.js') => `<!doctype html><html><head>
<script>window.__CONFIG__ = {};</script><script>window.__FIRST_LOAD__ = {};</script>
<script type="module" crossorigin src="${entry}"></script></head>
<body><div id="root"></div></body></html>`

test('activeVersionId reads the version serving 100%', () => {
  const deployment = { versions: [{ version_id: 'v-new', percentage: 100 }] }
  assert.equal(activeVersionId(deployment), 'v-new')
  assert.equal(activeVersionId({ deployments: [deployment] }), 'v-new')
  assert.equal(activeVersionId([deployment]), 'v-new')
  assert.equal(activeVersionId({ versions: [{ version_id: 'a', percentage: 50 }, { version_id: 'b', percentage: 50 }] }), null)
  assert.equal(activeVersionId(null), null)
})

test('entryScript finds the module entry', () => {
  assert.equal(entryScript(page()), '/assets/index-abc.js')
  assert.equal(entryScript('<script src="/x.js"></script>'), null)
})

test('smokeProblems accepts the new build booted by the worker', () => {
  assert.deepEqual(smokeProblems(200, page(), '/assets/index-abc.js'), [])
})

test('smokeProblems reports what is wrong', () => {
  assert.deepEqual(smokeProblems(500, '', '/assets/index-abc.js'), ['HTTP 500'])
  assert.match(smokeProblems(200, page('/assets/index-old.js'), '/assets/index-abc.js').join(), /not the new build/)
  const plain = '<div id="root"></div><script type="module" src="/assets/index-abc.js"></script>'
  assert.deepEqual(smokeProblems(200, plain, '/assets/index-abc.js'), [
    'the worker injected no __CONFIG__',
    'the worker injected no __FIRST_LOAD__'
  ])
})

test('versionVars injects the commit and build time', () => {
  const sha = 'b'.repeat(40)
  const builtAt = '2026-11-19T10:00:00.000Z'
  assert.deepEqual(versionVars(sha, builtAt), ['--var', `WORKER_COMMIT:${sha}`, '--var', `WORKER_BUILT_AT:${builtAt}`])
  assert.deepEqual(versionVars('abc', builtAt), ['--var', `WORKER_BUILT_AT:${builtAt}`])
  assert.deepEqual(versionVars('', builtAt), ['--var', `WORKER_BUILT_AT:${builtAt}`])
})
