// Design coherence per route (implementation notes, phase 3): the verdict, who owns a file, the ratchet and the calibration.
//
// Calibration runs on two mini repos in fixtures/coherence/{good,bad} (.txt files with their repo path; a live
// route is never the reference, because a live route gets fixed). The live repo is only compared relatively.
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { analyze, baselineTotals, buildJson, buildMarkdown, checkCoherence, FLOWS, RANK, routesOf, THRESHOLDS, totalsOf, verdictOf } from '../../scripts/design/coherence.mjs'
import { GUARDS } from '../../scripts/design/guard.mjs'
import { report, ROOT } from '../../scripts/design/engine.mjs'

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/coherence')
const GUARD_NAMES = ['literal', 'icon', 'pieces', 'ui-scope']

// The routes of the fixtures: two pages, the cart as a surface of checkout, the header as the shell.
const FIXTURE_FLOWS = {
  store: { label: 'Store', pages: ['Store'] },
  checkout: { label: 'Checkout', pages: ['Checkout'], surfaces: ['Cart'] },
  shell: { label: 'Shell', surfaces: ['Header'], files: ['src/App.js'] }
}

const unpack = dir => {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name)
    if (statSync(file).isDirectory()) unpack(file)
    else if (name.endsWith('.txt')) renameSync(file, file.slice(0, -4))
  }
}
const tree = name => {
  const root = mkdtempSync(path.join(tmpdir(), `design-coherence-${name}-`))
  cpSync(path.join(FIXTURES, name), root, { recursive: true })
  unpack(root)
  return root
}
// `edits`: { 'repo/path.js': text => text } applied to the unpacked tree before it is analysed (a refactor, a regression)
const run = (name, flows = FIXTURE_FLOWS, edits = {}) => {
  const root = tree(name)
  try {
    for (const [file, fn] of Object.entries(edits)) writeFileSync(path.join(root, file), fn(readFileSync(path.join(root, file), 'utf8')))
    // The fixture is its own repo. A real path can coincide with one of its
    // files, but exceptions granted for the live component don't apply here.
    return analyze({ root, flows, guards: report(GUARDS, { root, exceptions: {} }) })
  } finally { rmSync(root, { recursive: true, force: true }) }
}
const total = r => Object.values(r.flows).reduce((n, f) => n + f.total, 0) + r.shared.reduce((n, s) => n + s.total, 0) + r.unreached.total

// ---- the verdict ----

test('verdict: no finding is coherent; one bad file in a clean route is partial; widespread and heavy is legacy', () => {
  assert.equal(verdictOf({ files: 10, debtFiles: 0, findings: 0 }), 'coherent')
  assert.equal(verdictOf({ files: 10, debtFiles: 1, findings: 40 }), 'partial')
  assert.equal(verdictOf({ files: 10, debtFiles: 8, findings: 8 }), 'partial')
  assert.equal(verdictOf({ files: 10, debtFiles: 5, findings: 30 }), 'legacy')
  assert.equal(verdictOf({ files: 10, debtFiles: 5, findings: 10 * THRESHOLDS.LEGACY_DENSITY - 1 }), 'partial')
  assert.equal(verdictOf({ files: 0, debtFiles: 0, findings: 0 }), 'coherent')
})

// ---- calibration on the two fixtures ----

test('calibration: the good tree is coherent in every route, with nothing shared or unreached', () => {
  const r = run('good')
  assert.deepEqual(Object.fromEntries(Object.entries(r.flows).map(([id, f]) => [id, f.verdict])), { store: 'coherent', checkout: 'coherent', shell: 'coherent' })
  assert.deepEqual([r.shared, r.unreached.total, total(r)], [[], 0, 0])
  assert.deepEqual(r.flows.store.paths, ['/store/:slug'])
  assert.deepEqual(r.flows.checkout.paths, ['/checkout/:cartUuid?'])
  // the base pieces are the clean foundation: never own, and the route that imports one is told so
  assert.ok(r.flows.store.base.own >= 1)
})

test('calibration: the bad tree is worse than the good one, and every finding is accounted for once', () => {
  const bad = run('bad')
  const good = run('good')
  for (const id of Object.keys(good.flows)) assert.ok(RANK[bad.flows[id].verdict] > RANK[good.flows[id].verdict], `${id} should be worse`)
  // the store has a little debt (3 of its 6 files, 1 finding per file): partial; the checkout is full of it: legacy
  assert.deepEqual(Object.fromEntries(Object.entries(bad.flows).map(([id, f]) => [id, f.verdict])), { store: 'partial', checkout: 'legacy', shell: 'partial' })
  // own + shared + unreached is exactly what the guards found: nothing counted twice or dropped
  assert.equal(total(bad), Object.values(bad.totals).reduce((a, b) => a + b, 0))
})

test('ownership: a file two routes reach is shared debt, reported once, and is in no route', () => {
  const r = run('bad')
  const totals = r.shared.find(s => s.piece === 'component:Totals')
  assert.deepEqual([totals.flows, totals.files, totals.total], [['checkout', 'store'], 2, 2])
  assert.equal(r.shared.filter(s => s.piece === 'component:Totals').length, 1)
  // the legacy Buttons primitive is reached by checkout alone (through PayForm): it is checkout's, not shared
  assert.ok(!r.shared.some(s => s.piece === 'style:Buttons'))
  assert.ok(r.flows.checkout.dirs['src/ui/src/styles/Buttons'])
})

test('ownership: a surface belongs to its flow even if another route opens it, and that route is not followed into it', () => {
  const r = run('bad')
  // Store imports Cart (width: 320px) and Checkout owns it: its finding is checkout's, never store's, never shared
  assert.ok(r.flows.checkout.dirs['src/ui/src/components/Cart'])
  assert.ok(!r.flows.store.dirs['src/ui/src/components/Cart'])
  assert.ok(!r.shared.some(s => s.piece === 'component:Cart'))
})

test('ownership: the shell does not compete, so a file the shell and one route reach is that route\'s', () => {
  const r = run('bad')
  // Banner is imported by Header (shell) and by the Store page: it is the store's, with its 40px
  assert.ok(r.flows.store.dirs['src/ui/src/components/Banner'])
  assert.ok(!r.flows.shell.dirs['src/ui/src/components/Banner'])
  assert.ok(r.flows.shell.dirs['src/ui/src/components/Header'])
})

test('unreached: findings in a file no route reaches are listed apart, not in a route', () => {
  const r = run('bad')
  assert.deepEqual(r.unreached.list, { 'src/ui/src/components/Orphan/styles.js': 1 })
})

test('a page of src/pages that no flow lists is reported, so a new page cannot hide', () => {
  const r = run('good', { ...FIXTURE_FLOWS, checkout: { ...FIXTURE_FLOWS.checkout, pages: [] }, shell: FIXTURE_FLOWS.shell })
  assert.deepEqual(r.unmappedPages, ['Checkout'])
  assert.match(checkCoherence(r, {}).problems.join('\n'), /page Checkout of src\/App\.js is in no flow/)
})

test('an entry that does not exist is an error, not a silent empty route', () => {
  const root = tree('good')
  try {
    assert.throws(() => analyze({ root, flows: { ...FIXTURE_FLOWS, store: { label: 'Store', pages: ['Store'], surfaces: ['Nope'] } }, guards: report(GUARDS, { root }) }), /entry src\/ui\/src\/components\/Nope .* does not exist/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// ---- the ratchet ----

const baselineOf = r => totalsOf(r)

test('ratchet: the baseline of reality passes; a total that goes up fails; a missing baseline is a problem', () => {
  const bad = run('bad')
  assert.equal(checkCoherence(bad, baselineOf(bad)).ok, true)

  const worse = structuredClone(bad)
  worse.flows.store.findings.literal += 1
  const r = checkCoherence(worse, baselineOf(bad))
  assert.deepEqual(r.violations, [{ kind: 'total-up', guard: 'literal', from: totalsOf(bad).literal, to: totalsOf(bad).literal + 1 }])

  // debt in shared pieces or in files no route reaches counts too: it cannot hide outside a route
  const sharedUp = structuredClone(bad)
  sharedUp.shared[0].findings.pieces += 1
  assert.deepEqual(checkCoherence(sharedUp, baselineOf(bad)).violations.map(v => v.guard), ['pieces'])
  const unreachedUp = structuredClone(bad)
  unreachedUp.unreached.findings.icon += 1
  assert.deepEqual(checkCoherence(unreachedUp, baselineOf(bad)).violations.map(v => v.guard), ['icon'])

  assert.equal(checkCoherence(run('good'), baselineOf(run('good'))).ok, true)
  const none = checkCoherence(bad, null)
  assert.equal(none.ok, false)
  assert.match(none.problems[0], /no baseline for coherence/)
})

test('ratchet: a baseline above reality is loose', () => {
  const bad = run('bad')
  const loose = { ...baselineOf(bad), pieces: baselineOf(bad).pieces + 5 }
  assert.deepEqual(checkCoherence(bad, loose).loose, [{ guard: 'pieces', allowed: baselineOf(bad).pieces + 5, found: baselineOf(bad).pieces }])
  assert.equal(checkCoherence(bad, loose).ok, false)
})

test('ratchet: the verdict of a route is informative, it never fails the check', () => {
  const bad = run('bad')
  const r = checkCoherence(bad, baselineOf(bad))
  assert.deepEqual(r.verdicts, { store: 'partial', checkout: 'legacy', shell: 'partial' })
  const worse = structuredClone(bad)
  worse.flows.store.verdict = 'legacy'
  assert.equal(checkCoherence(worse, baselineOf(bad)).ok, true)
})

// The case of moving a file between routes (a refactor that does not make anything worse): Totals is shared by the
// store and the checkout, then the checkout stops importing it and it becomes the store's alone. The store's own debt
// goes up, the shared debt goes down, the total does not move: it must pass, in both directions. A real regression
// (one more literal in it) must still fail.
test('ratchet: moving a file from shared to one route (and back) is not a regression; one more finding is', () => {
  const noTotalsInCheckout = { 'src/pages/Checkout/index.js': text => text.replace("import { Totals } from '~ui/src/components/Totals'\n", '').replace('    <Totals />\n', '') }
  const before = run('bad')
  const after = run('bad', FIXTURE_FLOWS, noTotalsInCheckout)
  assert.ok(before.shared.some(s => s.piece === 'component:Totals'), 'Totals starts shared')
  assert.ok(!after.shared.some(s => s.piece === 'component:Totals') && after.flows.store.dirs['src/ui/src/components/Totals'], 'Totals ends as the store\'s own')
  assert.ok(after.flows.store.findings.literal > before.flows.store.findings.literal, 'the store\'s own debt went up')
  assert.deepEqual(totalsOf(after), totalsOf(before))
  assert.equal(checkCoherence(after, baselineOf(before)).ok, true)
  assert.equal(checkCoherence(before, baselineOf(after)).ok, true)

  const regression = run('bad', FIXTURE_FLOWS, { ...noTotalsInCheckout, 'src/ui/src/components/Totals/styles.js': text => text.replace('padding: 4px;', 'padding: 4px;\n  margin: 9px;') })
  assert.deepEqual(checkCoherence(regression, baselineOf(before)).violations, [{ kind: 'total-up', guard: 'literal', from: totalsOf(before).literal, to: totalsOf(before).literal + 1 }])
})

test('shell: what App.js mounts directly belongs to the shell, not to "no route"; its pages stay with their flows', () => {
  const plain = run('bad')
  assert.ok(plain.unreached.list['src/ui/src/components/Orphan/styles.js'])
  const mounted = run('bad', FIXTURE_FLOWS, { 'src/App.js': text => `import { Dead } from '~ui/src/components/Orphan/styles'\n${text}` })
  assert.deepEqual(mounted.unreached.list, {})
  assert.ok(mounted.flows.shell.dirs['src/ui/src/components/Orphan'])
  // the pages App.js loads are still the flows': followed from App.js they would turn the shell into the whole app
  assert.deepEqual(mounted.flows.shell.sharedReached, { files: 0, findings: 0, rules: {} })
  assert.ok(mounted.flows.store.dirs['src/ui/src/components/StoreList'] && !mounted.flows.shell.dirs['src/ui/src/components/StoreList'])
})

test('the baseline of coherence is the sum of the three guard baselines; one missing is no baseline', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'design-coherence-baseline-'))
  const put = (guard, files) => writeFileSync(path.join(dir, `${guard}.json`), JSON.stringify({ guard, files }))
  try {
    assert.equal(baselineTotals(dir), null)
    put('literal', { 'a.js': { px: 2, hex: 1 }, 'b.js': { px: 4 } })
    put('icon', { 'a.js': { 'legacy-icon': 3 } })
    assert.equal(baselineTotals(dir), null)
    put('pieces', {})
    assert.deepEqual(baselineTotals(dir), { literal: 7, icon: 3, pieces: 0, 'ui-scope': 0 })
    // the one of the repo is what the three files say, and coherence has no file of its own
    assert.deepEqual(Object.keys(baselineTotals()), GUARD_NAMES)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// ---- the live repo: relative checks only ----

test('live: App.js routes are read, every page is in a flow, and every finding is accounted for once', () => {
  const { routes, pages } = routesOf(ROOT)
  assert.ok(routes.length >= 25)
  assert.ok(routes.some(r => r.path === '/checkout/:cartUuid?' && r.pages.includes('Checkout')))
  assert.ok(routes.some(r => r.path === '/profile' && r.pages.includes('Profile')))
  const mapped = new Set(Object.values(FLOWS).flatMap(f => f.pages ?? []))
  assert.deepEqual(pages.filter(p => !mapped.has(p)), [])

  const guards = report(GUARDS, { root: ROOT })
  const r = analyze({ guards })
  assert.equal(total(r), GUARD_NAMES.reduce((n, g) => n + guards.summary[g].total, 0))
  assert.deepEqual(Object.keys(r.flows).sort(), Object.keys(FLOWS).sort())
  // a shared piece is in no route: no shared file is also one of a route's own folders' counts
  for (const s of r.shared) assert.ok(s.flows.length >= 2, `${s.piece} is shared by ${s.flows}`)
  // the submodule is measured, not followed: it holds logic (no styled-components) and almost no markup
  assert.equal(r.submodule.styledImporters, 0)
  assert.ok(r.submodule.files > 100, 'the submodule src/@/components is not checked out: git submodule update --init')
})

// ---- the audit ----

test('audit: the markdown and the json are generated from the analysis and say what they must', () => {
  const r = run('bad')
  const md = buildMarkdown(r, '2026-01-01')
  assert.match(md, /^<!-- Generated by `pnpm design:coherence --write-audit`/)
  assert.match(md, /## Veredicto por ruta/)
  assert.match(md, /## Deuda compartida/)
  assert.match(md, /`component:Totals`/)
  const json = buildJson(r, '2026-01-01')
  assert.equal(json.schema, 'design-coherence/1')
  assert.deepEqual(json.thresholds, THRESHOLDS)
  assert.equal(json.totals.own + json.totals.shared + json.totals.unreached, Object.values(json.totals).slice(0, 4).reduce((a, b) => a + b, 0))
  assert.equal(buildMarkdown(r, '2026-01-01'), md) // deterministic
})

test('audit: a clean tree reports zero findings without a percentage of zero', () => {
  const markdown = buildMarkdown(run('good'), '2026-01-01')
  assert.match(markdown, /^- 0 hallazgos en total\.$/m)
})
