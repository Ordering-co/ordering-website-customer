// The ratchet of the baselines against main: temporary git repos, never this one's history.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { mergeBase, ratchet } from '../../scripts/design/baseline-ratchet.mjs'

const git = (root, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const put = (root, file, value) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`) }

const literal = files => ({ guard: 'literal', files })
const BASE = {
  'scripts/design/baselines/literal.json': literal({ 'a.js': { px: 5, hex: 1 }, 'b.js': { px: 2 } }),
  'scripts/design/baselines/icon.json': { guard: 'icon', files: { 'i.js': { 'legacy-icon': 3 } } },
  'scripts/design/exceptions.json': { literal: [{ id: 'floor', file: 'x.js', value: '44px', reason: 'touch floor' }] },
  'scripts/entry-size.baseline.json': { entry_gzip_bytes: 1000 }
}

// A repo whose main has BASE and whose branch (HEAD) starts as an identical copy; `edit` changes the working tree.
const repo = (edit, base = BASE) => {
  const root = mkdtempSync(path.join(tmpdir(), 'design-ratchet-'))
  git(root, 'init', '-q', '-b', 'main')
  for (const [file, value] of Object.entries(base)) put(root, file, value)
  git(root, 'add', '-A')
  git(root, 'commit', '-q', '-m', 'main')
  git(root, 'checkout', '-q', '-b', 'feature')
  edit?.(root)
  return root
}
const run = (edit, opts, base) => { const root = repo(edit, base); try { return ratchet({ root, base: 'main', ...opts }) } finally { rmSync(root, { recursive: true, force: true }) } }

test('an unchanged tree passes; lowering a count, a total or the entry passes', () => {
  assert.equal(run().ok, true)
  const lower = run(root => {
    put(root, 'scripts/design/baselines/literal.json', literal({ 'a.js': { px: 4, hex: 1 }, 'b.js': { px: 1 } }))
    put(root, 'scripts/entry-size.baseline.json', { entry_gzip_bytes: 900 })
  })
  assert.deepEqual([lower.ok, lower.problems], [true, []])
})

test('a count raised by hand in a guard baseline fails, even uncommitted, and so does a new rule', () => {
  const up = run(root => put(root, 'scripts/design/baselines/literal.json', literal({ 'a.js': { px: 6, hex: 1 }, 'b.js': { px: 2 } })))
  assert.equal(up.ok, false)
  assert.deepEqual(up.problems, ['scripts/design/baselines/literal.json total: px 7 -> 8'])
  const rule = run(root => put(root, 'scripts/design/baselines/literal.json', literal({ 'a.js': { px: 5, hex: 1, rem: 1 }, 'b.js': { px: 2 } })))
  assert.match(rule.problems[0], /rem 0 -> 1/)
})

test('moving findings between files (a refactor) keeps the total and passes', () => {
  const moved = run(root => put(root, 'scripts/design/baselines/literal.json', literal({ 'a.js': { px: 2, hex: 1 }, 'c.js': { px: 5 } })))
  assert.deepEqual([moved.ok, moved.problems], [true, []])
})

test('a total of another guard baseline may not go up either; the retired coherence.json is not compared', () => {
  const r = run(root => put(root, 'scripts/design/baselines/icon.json', { guard: 'icon', files: { 'i.js': { 'legacy-icon': 4 } } }))
  assert.deepEqual(r.problems, ['scripts/design/baselines/icon.json total: legacy-icon 3 -> 4'])
  const retired = run(root => rmSync(path.join(root, 'scripts/design/baselines/coherence.json')), undefined, { ...BASE, 'scripts/design/baselines/coherence.json': { totals: { literal: 8 } } })
  assert.deepEqual([retired.ok, retired.problems], [true, []])
})

test('a rule that does not exist in the base guard is a new rule: seeded, accepted and noted; a rule that does exist is not', () => {
  const guard = 'export const RULES = { px: 1, hex: 2 }\n'
  const base = { ...BASE, 'scripts/design/guards/literal.mjs': guard }
  const seeded = (rule, edit) => run(root => { put(root, 'scripts/design/baselines/literal.json', literal({ 'a.js': { px: 5, hex: 1, [rule]: 3 }, 'b.js': { px: 2 } })); edit?.(root) }, undefined, base)
  const fresh = seeded('named-color')
  assert.deepEqual([fresh.ok, fresh.problems], [true, []])
  assert.match(fresh.notes[0], /NEW rule named-color seeded with 3 findings/)
  // `rem` is not written in the base baseline, but the guard at the base knows the word: a hand-written entry is a rise
  const known = run(root => put(root, 'scripts/design/baselines/literal.json', literal({ 'a.js': { px: 5, hex: 1, rem: 1 }, 'b.js': { px: 2 } })), undefined, { ...base, 'scripts/design/guards/literal.mjs': `${guard}const REM = 'rem'\n` })
  assert.match(known.problems[0], /rem 0 -> 1/)
})

test('a new exception needs a reason; one with it passes and is reported; an old one may not lose it', () => {
  const noReason = run(root => put(root, 'scripts/design/exceptions.json', { literal: [...BASE['scripts/design/exceptions.json'].literal, { id: 'new', file: 'y.js', value: '9px', reason: '  ' }] }))
  assert.deepEqual(noReason.problems, ['scripts/design/exceptions.json: exception literal/new has no reason'])
  const withReason = run(root => put(root, 'scripts/design/exceptions.json', { literal: [...BASE['scripts/design/exceptions.json'].literal, { id: 'new', file: 'y.js', value: '9px', reason: 'because' }] }))
  assert.equal(withReason.ok, true)
  assert.match(withReason.notes.join('\n'), /NEW exception literal\/new .*Sergio's approval/)
  const lost = run(root => put(root, 'scripts/design/exceptions.json', { literal: [{ id: 'floor', file: 'x.js', value: '44px' }] }))
  assert.match(lost.problems[0], /literal\/floor has no reason/)
})

test('a first exceptions file is accepted, but an entry of it with no reason is not', () => {
  const { 'scripts/design/exceptions.json': _, ...withoutExceptions } = BASE
  const first = run(root => put(root, 'scripts/design/exceptions.json', { literal: [{ id: 'a', file: 'x.js', value: '1px' }] }), undefined, withoutExceptions)
  assert.deepEqual(first.problems, ['scripts/design/exceptions.json: exception literal/a has no reason'])
})

test('the entry baseline may not go up unless the flag says so', () => {
  const grow = root => put(root, 'scripts/entry-size.baseline.json', { entry_gzip_bytes: 1500 })
  assert.match(run(grow).problems[0], /entry_gzip_bytes 1000 -> 1500/)
  assert.equal(run(grow, { allowEntryGrowth: true }).ok, true)
})

test('the CSS budget can be seeded once and then ratchets independently', () => {
  const file = 'scripts/entry-size.baseline.json'
  const budget = { entry_gzip_bytes: 1000, entry_css_gzip_bytes: 500 }
  const withCssBudget = { ...BASE, [file]: budget }
  const seed = root => put(root, file, budget)
  const grow = root => put(root, file, { ...budget, entry_css_gzip_bytes: 700 })
  assert.equal(run(seed).ok, true)
  assert.match(run(grow, undefined, withCssBudget).problems[0], /entry_css_gzip_bytes 500 -> 700/)
  assert.equal(run(grow, { allowEntryGrowth: true }, withCssBudget).ok, true)
  assert.match(run(root => put(root, file, BASE[file]), undefined, withCssBudget).problems[0], /missing entry_css_gzip_bytes/)
})

test('a baseline gone from the tree fails; a file the base does not have is accepted as new', () => {
  const gone = run(root => rmSync(path.join(root, 'scripts/design/baselines/literal.json')))
  assert.match(gone.problems[0], /literal\.json: exists in the base and is gone/)
  const fresh = run(root => put(root, 'scripts/design/baselines/pieces.json', { guard: 'pieces', files: { 'z.js': { 'native-button': 99 } } }))
  assert.deepEqual([fresh.ok, fresh.notes], [true, ['scripts/design/baselines/pieces.json: not in the base, accepted as new']])
  const noBase = run(undefined, undefined, { 'README.md': {} })
  assert.equal(noBase.ok, true)
})

test('a base that does not exist, or no common history, fails with a clear message', () => {
  const root = repo()
  try {
    assert.throws(() => mergeBase(root, 'origin/nope'), /does not exist and could not be fetched/)
    git(root, 'checkout', '-q', '--orphan', 'island')
    git(root, 'commit', '-q', '--allow-empty', '-m', 'island')
    assert.throws(() => mergeBase(root, 'main'), /no common history .*fetch-depth: 0/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
