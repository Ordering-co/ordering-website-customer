// Design guards: the ratchet, the baseline and the report, on a throwaway repo root.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { check, format, loadBaseline, report, updateBaseline } from '../../scripts/design/engine.mjs'
import literal from '../../scripts/design/guards/literal.mjs'
import icon from '../../scripts/design/guards/icon.mjs'
import pieces from '../../scripts/design/guards/pieces.mjs'
import uiScope from '../../scripts/design/guards/ui-scope.mjs'

const VALID_REASON = 'This legacy control is retained until its migration.'
const NO_EXCEPTIONS = { literal: [] }
const FILE = 'src/ui/src/components/Thing/styles.js'
const css = body => `import styled from 'styled-components'\nexport const A = styled.div\`\n${body}\n\`\n`

const setUp = (files, baseline) => {
  const root = mkdtempSync(path.join(tmpdir(), 'design-guards-'))
  const baselineDir = path.join(root, 'baselines')
  mkdirSync(baselineDir)
  const put = (file, source) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), source) }
  for (const [file, source] of Object.entries(files)) put(file, source)
  if (baseline) writeFileSync(path.join(baselineDir, 'literal.json'), JSON.stringify({ guard: 'literal', files: baseline }))
  return { root, baselineDir, put, done: () => rmSync(root, { recursive: true, force: true }) }
}
const run = (t, opts = {}) => check(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS, ...opts })

test('ratchet: a new file with a literal fails, a clean one passes', () => {
  const t = setUp({ [FILE]: css('  padding: 12px;'), 'src/ui/src/components/Clean/styles.js': css('  padding: var(--ds-space-md);') }, {})
  try {
    const r = run(t)
    assert.equal(r.ok, false)
    assert.deepEqual(r.violations.map(v => [v.file, v.line, v.rule, v.value]), [[FILE, 3, 'px', '12px']])
    assert.match(format(literal, r), /FAIL src\/ui\/src\/components\/Thing\/styles\.js:3 literal\/px 12px/)
  } finally { t.done() }
})

test('ratchet: a baselined file may keep its count per rule, but not exceed it nor trade one rule for another', () => {
  const t = setUp({ [FILE]: css('  padding: 12px;\n  color: #fff;') }, { [FILE]: { px: 1, hex: 1 } })
  try {
    assert.equal(run(t).ok, true)
    t.put(FILE, css('  padding: 12px 8px;\n  color: #fff;'))
    assert.deepEqual(run(t).violations.map(v => v.value), ['8px'])
    // a hex fixed and a px added: the total is the same, the rules are not
    t.put(FILE, css('  padding: 12px 8px;\n  color: var(--x);'))
    const r = run(t)
    assert.equal(r.ok, false)
    assert.deepEqual([r.violations.length, r.loose.length], [1, 1])
  } finally { t.done() }
})

test('ratchet: a baseline above reality is loose and one whose file is gone is stale; both fail', () => {
  const t = setUp({ [FILE]: css('  padding: 12px;') }, { [FILE]: { px: 3 }, 'src/ui/src/components/Gone/styles.js': { px: 2 } })
  try {
    const r = run(t)
    assert.equal(r.ok, false)
    assert.deepEqual(r.loose, [{ file: FILE, rule: 'px', allowed: 3, found: 1 }])
    assert.deepEqual(r.stale, ['src/ui/src/components/Gone/styles.js'])
  } finally { t.done() }
})

test('prove the gate: a hex added to a clean styles.js turns the check red at that line, and removing it turns it green', () => {
  const clean = css('  padding: var(--ds-space-md);')
  const t = setUp({ [FILE]: clean }, {})
  try {
    assert.equal(run(t).ok, true)
    t.put(FILE, css('  padding: var(--ds-space-md);\n  color: #ff0000;'))
    const r = run(t)
    assert.equal(r.ok, false)
    assert.deepEqual(r.violations.map(v => [v.line, v.rule, v.value]), [[4, 'hex', '#ff0000']])
    t.put(FILE, clean)
    assert.equal(run(t).ok, true)
  } finally { t.done() }
})

test('exceptions: a recorded exception that matches nothing fails the check (the list cannot rot)', () => {
  const t = setUp({ [FILE]: css('  padding: var(--x);') }, {})
  try {
    const exceptions = { literal: [{ id: 'ghost', file: FILE, value: '44px', reason: VALID_REASON }, { id: 'unseen', file: FILE, value: '1.2', reason: VALID_REASON, detected: false }] }
    const r = run(t, { exceptions })
    assert.deepEqual(r.unusedExceptions, ['ghost'])
    assert.equal(r.ok, false)
    t.put(FILE, css('  min-height: 44px;'))
    assert.equal(run(t, { exceptions }).ok, true)
  } finally { t.done() }
})

for (const [guard, source, entry] of [
  [literal, css('  min-height: 44px;'), { rule: 'px', value: '44px' }],
  [pieces, 'export const A = () => <button />', { rule: 'native-button', value: '<button' }]
]) {
  test(`${guard.name} exceptions reject unused allowance`, () => {
    const t = setUp({ [FILE]: source })
    const exception = { ...entry, id: 'control', file: FILE, count: 1, reason: VALID_REASON }
    const run = () => check(guard, { root: t.root, baseline: {}, exceptions: { [guard.name]: [exception] } })
    try {
      assert.equal(run().ok, true)
      exception.count = 3
      const result = run()
      assert.equal(result.ok, false)
      assert.match(format(guard, result), /control.*matches 1 of 3/)
    } finally { t.done() }
  })

  test(`${guard.name} rejects duplicate exception IDs across files before counting`, () => {
    const otherFile = 'src/ui/src/components/Other/styles.js'
    const t = setUp({ [FILE]: source, [otherFile]: source }, {})
    const short = { ...entry, id: 'control', file: FILE, count: 2, reason: VALID_REASON }
    const other = { ...short, file: otherFile, id: 'other-control', count: 1 }
    const exceptions = { [guard.name]: [short, other] }
    const run = () => check(guard, { root: t.root, baseline: {}, exceptions })
    try {
      assert.match(format(guard, run()), /control.*matches 1 of 2/)
      other.id = short.id
      const result = run()
      assert.equal(result.ok, false)
      assert.match(format(guard, result), /duplicate exception ID control/)
      assert.match(result.problems[0], /Thing.*Other/)
      assert.match(updateBaseline(guard, { root: t.root, baselineDir: t.baselineDir, exceptions }).problems[0], /duplicate exception ID control/)
      other.id = 'other-control'
      short.count = 1
      assert.equal(run().ok, true)
    } finally { t.done() }
  })

  test(`${guard.name} exceptions require a reason of at least 30 characters`, () => {
    const t = setUp({ [FILE]: source })
    const exception = { ...entry, id: 'control', file: FILE }
    const run = () => check(guard, { root: t.root, baseline: {}, exceptions: { [guard.name]: [exception] } })
    try {
      for (const reason of [undefined, '', '   ', ' x '.padEnd(35)]) {
        exception.reason = reason
        const result = run()
        assert.equal(result.ok, false)
        assert.match(format(guard, result), /control.*reason.*30/)
      }
      exception.reason = VALID_REASON
      assert.equal(run().ok, true)
    } finally { t.done() }
  })
}

test('icon exceptions: a partial migration must release its unused allowance', () => {
  const file = 'src/ui/src/styles/Stepper/index.js'
  const source = "import { Icon } from '~ui-icon'\nexport const IconRow = () => <><Icon name='dashLg' /><Icon name='plusLg' /></>\n"
  const t = setUp({ [file]: source })
  const entry = { id: 'stepper', file, rule: 'legacy-icon', value: '<Icon>', count: 2, reason: VALID_REASON }
  const run = () => check(icon, { root: t.root, baseline: {}, exceptions: { icon: [entry] } })
  try {
    assert.equal(run().ok, true)
    t.put(file, source.replace("<Icon name='dashLg' />", ''))
    const partial = run()
    assert.equal(partial.ok, false)
    assert.match(format(icon, partial), /stepper.*matches 1 of 2/)
    entry.count = 1
    assert.equal(run().ok, true)
    t.put(file, source)
    assert.equal(run().violations.length, 1)
  } finally { t.done() }
})

test('baseline: it seeds once, then only goes down', () => {
  const t = setUp({ [FILE]: css('  padding: 12px 8px;') })
  try {
    assert.equal(loadBaseline(literal, t.baselineDir), null)
    assert.equal(run(t).problems.length, 1)
    const seeded = updateBaseline(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS })
    assert.deepEqual([seeded.ok, seeded.files], [true, { [FILE]: { px: 2 } }])
    assert.equal(run(t).ok, true)

    t.put(FILE, css('  padding: 12px 8px 4px;'))
    const raise = updateBaseline(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS })
    assert.equal(raise.ok, false)
    assert.match(raise.problems[0], /px baseline has 2, found 3/)
    assert.deepEqual(loadBaseline(literal, t.baselineDir), { [FILE]: { px: 2 } })

    t.put('src/ui/src/components/New/styles.js', css('  color: #fff;'))
    t.put(FILE, css('  padding: 12px;'))
    const added = updateBaseline(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS })
    assert.equal(added.ok, false)
    assert.match(added.problems[0], /New\/styles\.js.*not in the baseline/)

    rmSync(path.join(t.root, 'src/ui/src/components/New'), { recursive: true })
    const lowered = updateBaseline(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS })
    assert.deepEqual([lowered.ok, lowered.files], [true, { [FILE]: { px: 1 } }])
    assert.equal(run(t).ok, true)
    const written = readFileSync(path.join(t.baselineDir, 'literal.json'), 'utf8')
    assert.ok(written.endsWith('\n'))
    assert.deepEqual(JSON.parse(written), { guard: 'literal', files: { [FILE]: { px: 1 } } })

    t.put(FILE, css('  padding: var(--x);'))
    const cleared = updateBaseline(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS })
    assert.deepEqual([cleared.ok, cleared.files], [true, {}])
  } finally { t.done() }
})

test('baseline: a rule that is new in the guard is written once with seed; any other rise is still refused', () => {
  const t = setUp({ [FILE]: css('  padding: 12px;\n  color: white;'), 'src/ui/src/components/New/styles.js': css('  color: red;') }, { [FILE]: { px: 1 } })
  const update = seed => updateBaseline(literal, { root: t.root, baselineDir: t.baselineDir, exceptions: NO_EXCEPTIONS, seed })
  try {
    assert.equal(update([]).ok, false)
    const seeded = update(['named-color'])
    assert.deepEqual([seeded.ok, seeded.files], [true, { [FILE]: { 'named-color': 1, px: 1 }, 'src/ui/src/components/New/styles.js': { 'named-color': 1 } }])
    assert.equal(run(t).ok, true)
    t.put(FILE, css('  padding: 12px 8px;\n  color: white;'))
    assert.match(update(['named-color']).problems[0], /px baseline has 1, found 2/)
  } finally { t.done() }
})

test('ui-scope has no baseline: any ui: class outside the pieces fails, inside them it passes', () => {
  const t = setUp({
    'src/pages/Thing/index.js': "export const A = () => <div className='ui:p-md' />\n",
    'src/ui/src/design-system/components/Piece.jsx': "export const B = () => <div className='ui:p-md' />\n"
  })
  try {
    const r = check(uiScope, { root: t.root })
    assert.deepEqual(r.violations.map(v => [v.file, v.value]), [['src/pages/Thing/index.js', 'ui:p-md']])
    assert.match(format(uiScope, r), /FAIL src\/pages\/Thing\/index\.js:1 ui-scope\/ui-class ui:p-md/)
  } finally { t.done() }
})

test('report: per file, the counts by guard and rule next to the baseline, and the area that owns the file', () => {
  const t = setUp({
    'src/pages/Home/styles.js': css('  padding: 12px;\n  color: #fff;'),
    'src/ui/src/components/Shared/styles.js': css('  margin: 4px;'),
    'src/ui/src/components/Shared/index.js': "import { Button } from '~ui/src/styles/Buttons'\nexport const S = () => <button />\n"
  }, { 'src/ui/src/components/Shared/styles.js': { px: 1 } })
  try {
    const pieces = { ...literal, name: 'pieces', baseline: false, scan: ({ file }) => (file.endsWith('index.js') ? [{ line: 2, rule: 'native-button', value: '<button', reason: 'x' }] : []) }
    const r = report([literal, pieces], { root: t.root, baselineDir: t.baselineDir, withFindings: true })
    assert.equal(r.schema, 'design-guards/1')
    assert.deepEqual(r.files['src/pages/Home/styles.js'], {
      area: 'page:Home',
      literal: { total: 2, rules: { px: 1, hex: 1 }, baseline: null, over: true, findings: [{ line: 3, rule: 'px', value: '12px' }, { line: 4, rule: 'hex', value: '#fff' }] }
    })
    assert.deepEqual(r.files['src/ui/src/components/Shared/styles.js'].literal, { total: 1, rules: { px: 1 }, baseline: { px: 1 }, over: false, findings: [{ line: 3, rule: 'px', value: '4px' }] })
    assert.equal(r.files['src/ui/src/components/Shared/styles.js'].area, 'component:Shared')
    assert.deepEqual(r.files['src/ui/src/components/Shared/index.js'].pieces.rules, { 'native-button': 1 })
    assert.deepEqual(r.summary.literal.byRule, { px: 2, hex: 1 })
    assert.deepEqual(r.summary.literal.byFolder, { 'src/pages/Home': 2, 'src/ui/src/components/Shared': 1 })
  } finally { t.done() }
})
