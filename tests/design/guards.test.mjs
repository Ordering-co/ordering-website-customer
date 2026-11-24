// Design guards: each rule against a good and a bad fixture, with the known false positives.
// Fixtures are .txt files with a pretend repo path: no live file is a reference (a live file gets fixed).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import icon, { entryReaches } from '../../scripts/design/guards/icon.mjs'
import { ROOT } from '../../scripts/design/engine.mjs'
import literal, { NAMED_RULES } from '../../scripts/design/guards/literal.mjs'
import pieces from '../../scripts/design/guards/pieces.mjs'
import uiScope from '../../scripts/design/guards/ui-scope.mjs'
import { sourceFiles } from '../../scripts/design/scan.mjs'

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fixture = name => readFileSync(path.join(FIXTURES, name), 'utf8')
const scan = (guard, name, file, exceptions = { literal: [] }) => guard.scan({ file, source: fixture(name), exceptions })
const rules = findings => findings.reduce((acc, f) => ({ ...acc, [f.rule]: (acc[f.rule] || 0) + 1 }), {})
const values = (findings, rule) => findings.filter(f => f.rule === rule).map(f => f.value)

const STYLES = 'src/ui/src/components/Fixture/styles.js'
const SCREEN = 'src/ui/src/components/Fixture/index.js'

// ---- literal-guard ----

test('literal: the good fixture has no finding (theme reads, 0, %, vh/vw, @media, url(), t(), comments, id selectors, engine colors)', () => {
  assert.deepEqual(scan(literal, 'literal-good.js.txt', STYLES), [])
})

test('literal: the good fixture is clean in a screen file too (not a style file)', () => {
  assert.deepEqual(scan(literal, 'literal-good.js.txt', SCREEN), [])
})

test('literal: the bad fixture is caught rule by rule', () => {
  const found = scan(literal, 'literal-bad.js.txt', SCREEN)
  assert.deepEqual(values(found, 'hex').sort(), ['#266DF0', '#abc', '#fff', '#fff'].sort())
  assert.deepEqual(values(found, 'rgb').sort(), ['hsl()', 'rgb()', 'rgba()'])
  assert.deepEqual(values(found, 'px').sort(), ['12px', '16px', '1px', '24px', '44px', '4px', '8px'])
  assert.deepEqual(values(found, 'rem'), ['1.5rem'])
  assert.deepEqual(values(found, 'duration').sort(), ['0.3s', '200ms', '300ms'])
  assert.deepEqual(values(found, 'font').sort(), ['Arial', 'Georgia', 'Helvetica Neue'])
  assert.deepEqual(values(found, 'named-color').sort(), ['black', 'red', 'white', 'white', 'yellow'])
  assert.deepEqual(values(found, 'computed-color').sort(), ['color-mix()', 'darken()', 'lighten()'])
  assert.equal(found.filter(f => !f.line).length, 0)
})

test('literal: a literal in an arbitrary ui: class is found; a breakpoint variant and a var() are not', () => {
  const found = scan(literal, 'literal-bad.js.txt', 'src/ui/src/design-system/components/Fixture.jsx')
  assert.deepEqual(values(found, 'px').filter(v => v === '44px'), ['44px'])
  assert.ok(values(found, 'hex').includes('#fff'))
})

test('literal: the touch floor does not exempt decorative CSS or Tailwind sizes', () => {
  const source = [
    'const Hero = styled.div`@media (pointer: coarse) { min-height: 44px; }`',
    "const decoration = 'ui:max-mobile:min-h-[44px]'"
  ].join('\n')
  const findings = literal.scan({ file: STYLES, source, exceptions: { literal: [] } })
  assert.deepEqual(findings.map(({ line, value }) => [line, value]), [[1, '44px'], [2, '44px']])
})

test('literal: the marked touch floor accepts a button pseudo-element and keeps other 44px findings', () => {
  const source = [
    'const A = styled.button`',
    '  &::after { /* touch-target */ min-inline-size: 44px; /* touch-target */ min-block-size: 44px; }',
    '  min-height: 44px; /* touch-target */ padding: 44px;',
    '`',
    "const controls = /* touch-target */ 'ui:after:min-h-[44px] ui:pointer-coarse:[&_button]:min-w-[44px]! ui:pointer-coarse:min-h-[max(var(--ui-menu-item-height),44px)] ui:max-mobile:p-[44px]'"
  ].join('\n')
  const findings = literal.scan({ file: STYLES, source, exceptions: { literal: [] } })
  assert.deepEqual(findings.map(({ line, value }) => [line, value]), [[3, '44px'], [3, '44px'], [5, '44px']])
})

test('literal: the named rules (sr-only 1px, the 16px phone field floor) are accepted only inside their helper file', () => {
  const source = readFileSync(path.join(ROOT, NAMED_RULES.file), 'utf8')
  const inside = literal.scan({ file: NAMED_RULES.file, source, exceptions: { literal: [] } })
  assert.ok(inside.length > 0 && inside.every(f => f.exception === 'named-rule'), 'every literal of the helper is a named rule')
  assert.deepEqual([...new Set(inside.map(f => f.value))].sort(), [...NAMED_RULES.values].sort())
  // the same text anywhere else, or another value inside the helper, is a finding
  const elsewhere = literal.scan({ file: 'src/ui/src/components/Other/styles.js', source, exceptions: { literal: [] } })
  assert.equal(elsewhere.length, inside.length)
  assert.ok(elsewhere.every(f => !f.exception))
  const other = literal.scan({ file: NAMED_RULES.file, source: `${source}\nexport const wide = \`width: 13px; color: #fff;\``, exceptions: { literal: [] } })
  assert.deepEqual(other.filter(f => !f.exception).map(f => f.value).sort(), ['#fff', '13px'])
})

test('literal: the popover arrow height (8px) is a named rule of the Rules file only, and the Popover reads it from there', () => {
  assert.ok(NAMED_RULES.values.includes('8px'))
  const rule = "export const POPOVER_ARROW_HEIGHT = '8px'\n"
  assert.deepEqual(literal.scan({ file: NAMED_RULES.file, source: rule, exceptions: { literal: [] } }).map(f => [f.value, f.exception]), [['8px', 'named-rule']])
  assert.deepEqual(literal.scan({ file: STYLES, source: rule, exceptions: { literal: [] } }).map(f => [f.value, f.exception]), [['8px', undefined]])
  assert.deepEqual(literal.scan({ file: STYLES, source: 'const A = styled.i`\n  height: 8px;\n`', exceptions: { literal: [] } }).map(f => f.value), ['8px'])
  const popover = 'src/ui/src/design-system/components/Popover.jsx'
  assert.deepEqual(literal.scan({ file: popover, source: readFileSync(path.join(ROOT, popover), 'utf8'), exceptions: { literal: [] } }), [])
})

test('literal: the 44px touch floor stays accepted by its local marker only', () => {
  const marked = literal.scan({ file: STYLES, source: 'const A = styled.span`\n  /* touch-target */ min-inline-size: 44px;\n`', exceptions: { literal: [] } })
  assert.deepEqual(marked, [])
  const bare = literal.scan({ file: STYLES, source: 'const A = styled.span`\n  min-inline-size: 44px;\n`', exceptions: { literal: [] } })
  assert.deepEqual(bare.map(f => f.value), ['44px'])
})

test('the guards scan app files, not the Vitest setup, tests or fixtures', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'scan-'))
  mkdirSync(path.join(root, 'src/__tests__'), { recursive: true })
  for (const f of ['src/app.js', 'src/setupTests.js', 'src/a.test.js', 'src/__tests__/b.js']) writeFileSync(path.join(root, f), '')
  assert.deepEqual(sourceFiles(root, ['src']), ['src/app.js'])
})

test('literal: the fluid layout recipes (ch, fr, %, vw/dvh, min/clamp of tokens) are accepted, a fixed px or rem inside them is not', () => {
  const run = source => literal.scan({ file: STYLES, source, exceptions: { literal: [] } }).map(f => f.value)
  const fluid = [
    'const A = styled.div`max-width: min(100%, 60ch); width: 40ch; flex: 0 0 min(85%, 30ch);`',
    'const A = styled.div`grid-template-columns: repeat(auto-fill, minmax(min(100%, 16ch), 1fr)); grid-auto-columns: minmax(0, 2fr);`',
    'const A = styled.div`min-height: calc(100dvh - var(--header-height, ${h})); max-height: 70svh; width: clamp(50%, 60vw, 90lvh);`',
    'const A = styled.div`width: min(100%, calc(8 * ${themeSize(theme, "xl")})); aspect-ratio: 16 / 9; inline-size: 50vi; max-width: 40cqw;`',
    "const c = 'ui:max-w-[min(100%,60ch)] ui:w-[40ch] ui:min-h-[50dvh] ui:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'",
    "const s = { width: 'min(100%, 60ch)', maxHeight: '60dvh' }"
  ]
  for (const source of fluid) assert.deepEqual(run(source), [], source)
  assert.deepEqual(run('const A = styled.div`max-width: min(100%, 480px);`'), ['480px'])
  assert.deepEqual(run('const A = styled.div`width: calc(100% - 20px); height: 30rem;`'), ['20px', '30rem'])
  assert.deepEqual(run('const A = styled.div`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));`'), ['200px'])
  assert.deepEqual(run("const c = 'ui:max-w-[min(100%,480px)] ui:w-[30rem]'"), ['480px', '30rem'])
  assert.deepEqual(run("const s = { width: '480px', maxWidth: 'min(100%, 30rem)' }"), ['480px', '30rem'])
})

test('literal: the colors inside an inline svg are artwork, left to icon-guard', () => {
  assert.ok(!values(scan(literal, 'literal-bad.js.txt', SCREEN), 'hex').includes('#123456'))
})

test('literal: a string that is only a literal counts when it is the value of a style, not of aria-label or data-*', () => {
  const found = source => literal.scan({ file: SCREEN, source, exceptions: { literal: [] } }).map(f => f.value)
  assert.deepEqual(found("export const A = () => <i aria-label='3s' data-id='#abc' title='12px' />\n"), [])
  assert.deepEqual(found("export const A = () => <i style={{ color: '#fff', width: '12px' }} />\n"), ['#fff', '12px'])
  assert.deepEqual(found("export const A = () => <i style={{ color: on ? '#fff' : '#000' }} />\n"), ['#fff', '#000'])
  assert.deepEqual(found("export const A = () => <i style={{\n  color: on\n    ? '#fff'\n    : '#000'\n}} />\n"), ['#fff', '#000'])
})

test('literal: a named color counts after a color property, from a closed list; transparent, currentColor and var() do not', () => {
  const found = source => literal.scan({ file: SCREEN, source, exceptions: { literal: [] } }).map(f => f.value)
  assert.deepEqual(found('export const A = styled.div`\n  border: 1px solid Red;\n  color: white;\n`\n'), ['1px', 'red', 'white'])
  assert.deepEqual(found("export const A = { backgroundColor: 'black', color: 'inherit', fill: 'none' }\n"), ['black'])
  assert.deepEqual(found('export const A = styled.div`\n  color: transparent; fill: currentColor; background: var(--black); border: 0;\n`\n'), [])
})

test('literal: lines point at the literal, and the same value twice is two findings', () => {
  const source = 'const A = styled.div`\n  padding: 12px 12px;\n`\n'
  const found = literal.scan({ file: STYLES, source, exceptions: { literal: [] } })
  assert.deepEqual(found.map(f => [f.line, f.value]), [[2, '12px'], [2, '12px']])
})

test('literal: styled(X).attrs(...) with a long attrs body is still a style template', () => {
  const attrs = `props => ({ ${Array.from({ length: 60 }, (_, i) => `'data-k${i}': props.k${i}`).join(', ')} })`
  const source = `const A = styled.div.attrs(${attrs})\`\n  padding: 12px;\n\`\n`
  assert.deepEqual(literal.scan({ file: SCREEN, source, exceptions: { literal: [] } }).map(f => f.value), ['12px'])
})

/* eslint-disable no-template-curly-in-string */
test('literal: a plain template is style only when it holds css declarations; a font named by the theme and prose are not findings', () => {
  const scanSource = source => literal.scan({ file: SCREEN, source, exceptions: { literal: [] } })
  assert.deepEqual(scanSource('const f = css`font-family: ${theme.font};`\nconst g = `${a}px`\nconst h = `Zoom 12px please`\n'), [])
  assert.deepEqual(scanSource('el.style.cssText = `position: fixed; bottom: calc(${b} + 60px)`\n').map(f => f.value), ['60px'])
  assert.deepEqual(scanSource('const html = `<p style="margin: 12px">x</p>`\n').map(f => f.value), ['12px'])
})

/* eslint-enable no-template-curly-in-string */

test('literal: a recorded exception exempts its first `count` occurrences (default 1), the n+1-th is a finding', () => {
  const source = 'const A = styled.div`\n  min-height: 44px;\n  min-width: 44px;\n  height: 44px;\n`\n'
  const run = e => literal.scan({ file: STYLES, source, exceptions: { literal: [{ id: 'floor', file: STYLES, value: '44px', ...e }] } }).map(f => f.exception ?? 'finding')
  assert.deepEqual(run({}), ['floor', 'finding', 'finding'])
  assert.deepEqual(run({ count: 2 }), ['floor', 'floor', 'finding'])
  assert.deepEqual(run({ count: 3 }), ['floor', 'floor', 'floor'])
})

test('literal: a recorded exception exempts that value in that file only, and says which', () => {
  const exceptions = { literal: [{ id: 'touch-target', file: STYLES, value: '44px' }] }
  const source = 'const A = styled.div`\n  min-height: 44px;\n  min-width: 45px;\n`\n'
  const here = literal.scan({ file: STYLES, source, exceptions })
  assert.deepEqual(here.map(f => [f.value, f.exception]), [['44px', 'touch-target'], ['45px', undefined]])
  const elsewhere = literal.scan({ file: 'src/ui/src/components/Other/styles.js', source, exceptions })
  assert.ok(elsewhere.every(f => !f.exception))
})

test('literal: the recorded exceptions of the repo each name a file, a value and a reason', async () => {
  const { loadExceptions } = await import('../../scripts/design/engine.mjs')
  // (no minimum count: the register shrinks toward zero; the check is shown on fixtures so an empty register still proves it works)
  const wellFormed = e => Boolean(e.id && e.file && e.value && e.reason?.length > 20)
  assert.ok(wellFormed({ id: 'x', file: STYLES, value: '44px', reason: 'A reason longer than twenty characters.' }))
  assert.ok(!wellFormed({ id: 'x', file: STYLES, value: '44px', reason: 'short' }))
  assert.ok(!wellFormed({ id: 'x', file: STYLES, reason: 'A reason longer than twenty characters.' }))
  const list = loadExceptions().literal
  assert.ok(Array.isArray(list))
  for (const e of list) assert.ok(wellFormed(e), e.id)
})

test('exceptions.json and the "Recorded exceptions" list of the skill record the same exceptions', () => {
  execFileSync(process.execPath, ['scripts/design/generate-exceptions-doc.mjs', '--check'], { cwd: ROOT })
})

// ---- icon-guard ----

test('icon: the good fixture has no finding (base Icon, brand marks, Lucide registry)', () => {
  assert.deepEqual(scan(icon, 'icon-good.js.txt', 'src/pages/Fixture/index.js'), [])
})

test('icon: the bad fixture is caught rule by rule', () => {
  const found = scan(icon, 'icon-bad.js.txt', 'src/pages/Fixture/index.js')
  assert.deepEqual(rules(found), { 'icon-lib': 2, 'lucide-direct': 1, 'legacy-icon': 3, 'inline-svg': 1 })
  assert.deepEqual(values(found, 'icon-lib').sort(), ['@meronex/icons/md', 'react-icons/fa'])
})

test('icon: a counted exception matches only its own file, rule and value', () => {
  const file = 'src/pages/Fixture/index.js'
  const source = [
    "import { FaBeer } from 'react-icons/fa'",
    "import { FaStar } from 'react-icons/fa'",
    "import { BiBeer } from 'react-icons/bi'",
    '<svg />'
  ].join('\n')
  const iconExceptions = [
    { id: 'first-fa', file, rule: 'icon-lib', value: 'react-icons/fa' },
    { id: 'wrong-file', file: 'src/pages/Other/index.js', rule: 'icon-lib', value: 'react-icons/bi' },
    { id: 'wrong-rule', file, rule: 'icon-lib', value: '<svg>' }
  ]
  const found = icon.scan({ file, source, exceptions: { icon: iconExceptions } })
  assert.deepEqual(found.map(f => f.exception ?? f.value), ['first-fa', 'react-icons/fa', 'react-icons/bi', '<svg>'])
})

test('pieces: a shared detection can retain a separate reason per occurrence', () => {
  const source = '<><button>First</button><button>Second</button><button>Extra</button></>'
  const entries = ['first-button', 'second-button'].map(id => ({
    id, file: SCREEN, rule: 'native-button', value: '<button'
  }))
  const found = pieces.scan({ file: SCREEN, source, exceptions: { pieces: entries } })
  assert.deepEqual(found.map(f => f.exception), ['first-button', 'second-button', undefined])
})

test('icon: lucide-react is free inside design-system/components and Icon/, and so is the legacy registry itself', () => {
  const source = "import { Check } from 'lucide-react'\nimport { FaBeer } from 'react-icons/fa'\nexport const x = <svg />\n"
  for (const file of ['src/ui/src/design-system/components/Foo.jsx', 'src/ui/src/components/Icon/lucideRegistry.js']) {
    assert.deepEqual(rules(icon.scan({ file, source })), { 'icon-lib': 1 }, file)
  }
})

// a pretend repo on disk: { 'src/index.js': '...', ... } -> its root
const tree = files => {
  const root = mkdtempSync(path.join(tmpdir(), 'entry-'))
  for (const [file, source] of Object.entries(files)) {
    mkdirSync(path.join(root, path.dirname(file)), { recursive: true })
    writeFileSync(path.join(root, file), source)
  }
  return root
}
const entryFindings = files => {
  const root = tree(files)
  return icon.scan({ file: 'src/index.js', source: files['src/index.js'], root }).filter(f => f.rule === 'entry-full-icon').map(f => f.value)
}
const ICON = { 'src/ui/src/design-system/components/Icon.jsx': "import { Check } from 'lucide-react'\nexport const Icon = () => null\n" }

test('icon: the entry may not reach the full Icon through static imports (import, export from, side effect, a folder index)', () => {
  const chain = 'src/index.js -> src/ui/src/components/Confirm/index.js -> src/ui/src/design-system/components/Icon.jsx'
  for (const confirm of [
    "import { Icon } from '~ui/src/design-system/components/Icon'\n",
    "export { Icon } from '../../design-system/components/Icon.jsx'\n",
    "import {\n  Icon as X\n} from '~ui/src/design-system/components/Icon'\n",
    "import '~ui/src/design-system/components/Icon'\n",
    "import {Icon} from'~ui/src/design-system/components/Icon'\n",
    "const a = () => {}import '~ui/src/design-system/components/Icon'\n"
  ]) {
    assert.deepEqual(entryFindings({ ...ICON, 'src/index.js': "import { Alert } from '~ui/src/components/Confirm'\n", 'src/ui/src/components/Confirm/index.js': confirm }), [chain], confirm)
  }
})

test('icon: a dynamic import, a comment or createIcon do not put the full Icon in the entry', () => {
  for (const confirm of [
    "const load = () => import('~ui/src/design-system/components/Icon')\n",
    "// import { Icon } from '~ui/src/design-system/components/Icon'\n",
    "import { createIcon } from '~ui/src/design-system/components/createIcon'\n",
    'export default 1\nconst s = <p>Pick one from "../../design-system/components/Icon"</p>\n'
  ]) {
    assert.deepEqual(entryFindings({ ...ICON, 'src/ui/src/design-system/components/createIcon.jsx': 'export const createIcon = () => null\n', 'src/index.js': "import { Alert } from '~ui/src/components/Confirm'\n", 'src/ui/src/components/Confirm/index.js': confirm }), [], confirm)
  }
})

test('icon: the real entry does not reach the full Icon, and the graph is real (it reaches Confirm)', () => {
  assert.equal(entryReaches(ROOT), null)
  assert.deepEqual(entryReaches(ROOT, ['src/ui/src/components/Confirm/index.js']), ['src/index.js', 'src/components/OrderAlert/index.js', 'src/ui/src/components/Confirm/index.js'])
})

// implementation noteswhat the first load must not carry. Each of these is a Base UI piece (or a surface over one) that
// only a flow after the first paint draws; the entry reaches the light module next to it instead (tabs-bar.js,
// input-variants.js, field-box.js, components/Radio.jsx) or loads it with loadable (SelectSurface, StatusNotice).
const OUT_OF_THE_ENTRY = [
  'src/ui/src/design-system/components/Tabs.jsx',
  'src/ui/src/design-system/components/Checkbox.jsx',
  'src/ui/src/design-system/components/Input.jsx',
  'src/ui/src/design-system/components/SdkField.jsx',
  'src/ui/src/design-system/components/SelectSurface.jsx',
  'src/ui/src/design-system/components/Tooltip.jsx',
  'src/ui/src/components/WebsocketStatus/StatusNotice.js'
]

test('entry: none of the pieces of the deferred flows is in the static graph of src/index.js', () => {
  for (const file of OUT_OF_THE_ENTRY) assert.equal(entryReaches(ROOT, [file]), null, `${file} is in the first load`)
})

test('entry: the graph is real (it reaches the header\'s Select and Radio, and the light modules that stand for the pieces)', () => {
  for (const file of [
    'src/ui/src/design-system/components/Select.jsx',
    'src/ui/src/design-system/components/Radio.jsx',
    'src/ui/src/design-system/components/tabs-bar.js',
    'src/ui/src/design-system/components/input-variants.js',
    'src/ui/src/design-system/components/field-box.js',
    'src/ui/src/components/WebsocketStatus/index.js'
  ]) assert.ok(entryReaches(ROOT, [file]), `${file} should be in the first load`)
})

// ---- pieces-guard ----

test('pieces: the good fixture has no finding (a base piece, a control with no piece yet, words in strings)', () => {
  assert.deepEqual(scan(pieces, 'pieces-good.js.txt', 'src/pages/Fixture/index.js'), [])
})

test('pieces: the bad fixture is caught rule by rule', () => {
  const found = scan(pieces, 'pieces-bad.js.txt', 'src/pages/Fixture/index.js')
  assert.deepEqual(rules(found), { 'native-button': 2, 'native-input': 2, 'legacy-buttons': 2, 'legacy-inputs': 1, 'legacy-overlay': 2, 'restyled-piece': 1 })
})

test('pieces: a hidden input is not a field (no visual control), any other input still is', () => {
  const found = source => pieces.scan({ file: 'src/ui/src/components/Fixture/index.js', source }).map(f => f.rule)
  assert.deepEqual(found("export const A = () => <input type='hidden' name='birthdate' />\n"), [])
  assert.deepEqual(found('export const A = () => <input type="hidden" defaultValue={x ? 1 : 2} ref={register({ validate: v => v > 1 })} />\n'), [])
  assert.deepEqual(found("export const A = () => <input name='x' type={'hidden'} />\n"), [])
  // a type that only looks like it: not hidden, or hidden somewhere else in the file
  assert.deepEqual(found("export const A = () => <input type='text' />\n"), ['native-input'])
  assert.deepEqual(found("export const A = () => <input type={kind} value='hidden' />\n"), ['native-input'])
  assert.deepEqual(found("export const A = () => <><input type='text' /><input type='hidden' /></>\n"), ['native-input'])
  assert.deepEqual(found("const B = styled.input`display: none;`\nexport const A = () => <B type='hidden' />\n"), ['native-input'])
})

test('pieces: a legacy module may import its own siblings, and the base pieces themselves are not counted', () => {
  assert.deepEqual(pieces.scan({ file: 'src/ui/src/components/Modal/index.js', source: "import { x } from './modalStack'\nimport { Y } from '~ui/src/components/Modal/ModalHeading'\n" }), [])
  assert.deepEqual(rules(pieces.scan({ file: 'src/ui/src/components/Fixture/index.js', source: "import { Input } from '../../styles/Inputs'\n" })), { 'legacy-inputs': 1 })
  // only the Modal and the BottomSheet count, not their helpers (ModalHeading, titleLevel, styles)
  const overlay = source => rules(pieces.scan({ file: 'src/ui/src/components/Fixture/index.js', source }))
  assert.deepEqual(overlay("import { Modal } from '~ui/src/components/Modal'\nimport { BottomSheet } from '../BottomSheet/index'\n"), { 'legacy-overlay': 2 })
  assert.deepEqual(overlay("import { ModalHeading } from '~ui/src/components/Modal/ModalHeading'\nimport { modalSectionLevel } from '~ui/src/components/Modal/titleLevel'\nimport { ModalTitle } from '../Modal/styles'\n"), {})
  assert.deepEqual(pieces.scan({ file: 'src/ui/src/design-system/components/Foo.jsx', source: 'export const Foo = () => <button />\n' }), [])
})

test('pieces: TextArea has its piece and a rule of its own (legacy-textarea), Input stays legacy-inputs; an alias changes neither', () => {
  const found = source => pieces.scan({ file: 'src/ui/src/components/Fixture/index.js', source }).map(f => [f.rule, f.value])
  assert.deepEqual(found("import { TextArea } from '~ui/src/styles/Inputs'\n"), [['legacy-textarea', 'TextArea from ~ui/src/styles/Inputs']])
  assert.deepEqual(found("import { TextArea as Area } from '~ui/src/styles/Inputs'\n"), [['legacy-textarea', 'Area from ~ui/src/styles/Inputs']])
  assert.deepEqual(found("import { Input } from '~ui/src/styles/Inputs'\n"), [['legacy-inputs', 'Input from ~ui/src/styles/Inputs']])
  assert.deepEqual(found("import { Input as Field, TextArea } from '~ui/src/styles/Inputs'\n"), [['legacy-inputs', 'Field from ~ui/src/styles/Inputs'], ['legacy-textarea', 'TextArea from ~ui/src/styles/Inputs']])
  assert.deepEqual(found("import * as Inputs from '~ui/src/styles/Inputs'\n"), [['legacy-inputs', 'Inputs from ~ui/src/styles/Inputs']])
})

test('pieces: each legacy primitive that has a piece is counted under its rule (R2-03); one with no piece is not', () => {
  const found = (source, file = 'src/ui/src/components/Fixture/index.js') => pieces.scan({ file, source }).map(f => f.rule)
  for (const [spec, rule] of [
    ['~ui/src/styles/Select', 'legacy-select'], ['~ui/src/styles/Selects', 'legacy-select'], ['~ui/src/styles/Tabs', 'legacy-tabs'],
    ['~ui/src/styles/Chip', 'legacy-chip'], ['~ui/src/styles/Avatar', 'legacy-avatar'], ['~ui/src/styles/Choice', 'legacy-choice'],
    ['~ui/src/styles/Checkbox', 'legacy-checkbox'], ['~ui/src/styles/FavoriteButton', 'legacy-favorite'], ['../../styles/Tabs/index.js', 'legacy-tabs']
  ]) assert.deepEqual(found(`import { X } from '${spec}'\n`), [rule], spec)
  assert.deepEqual(found("import { Switch } from '~ui/src/styles/Switch'\nimport { Stepper } from '~ui/src/styles/Stepper'\n"), [])
  // a primitive of the same family is not a screen: styles/Select reading styles/Selects
  assert.deepEqual(found("import { menuBoxCss } from '~ui/src/styles/Selects'\n", 'src/ui/src/styles/Select/index.js'), [])
  assert.deepEqual(found("import { menuBoxCss } from '~ui/src/styles/Selects'\n", 'src/ui/src/styles/Switch/index.js'), ['legacy-select'])
  // Modal and BottomSheet are separate families: one opening the other still counts
  assert.deepEqual(found("import { Modal } from '~ui/src/components/Modal'\n", 'src/ui/src/components/BottomSheet/index.js'), ['legacy-overlay'])
})

test('pieces: a recorded exception exempts the finding with its file, rule and value, nothing else', () => {
  const file = 'src/ui/src/components/Fixture/index.js'
  const source = "import { Modal } from '~ui/src/components/Modal'\nimport { Button } from '~ui/src/styles/Buttons'\n"
  const entry = { id: 'host', file, rule: 'legacy-overlay', value: 'Modal from ~ui/src/components/Modal', reason: 'r' }
  const left = exceptions => pieces.scan({ file, source, exceptions }).filter(f => !f.exception).map(f => f.rule)
  assert.deepEqual(left({ pieces: [entry] }), ['legacy-buttons'])
  assert.equal(pieces.scan({ file, source, exceptions: { pieces: [entry] } }).find(f => f.rule === 'legacy-overlay').exception, 'host')
  // another file, rule or value is not exempted
  assert.deepEqual(left({ pieces: [{ ...entry, file: 'src/pages/Other/index.js' }] }), ['legacy-overlay', 'legacy-buttons'])
  assert.deepEqual(left({ pieces: [{ ...entry, rule: 'legacy-buttons' }] }), ['legacy-overlay', 'legacy-buttons'])
  assert.deepEqual(left({ pieces: [{ ...entry, value: 'BottomSheet from ~ui/src/components/BottomSheet' }] }), ['legacy-overlay', 'legacy-buttons'])
  // the guard reports a recorded exception that no longer matches (engine `unusedExceptions`)
  assert.equal(pieces.exceptions, true)
})

test('pieces: an exception exempts its first `count` occurrences (default 1), as literal\'s', () => {
  const file = 'src/ui/src/components/Fixture/index.js'
  const source = 'const A = styled(Button)``\nconst B = styled(Button)``\nconst C = styled(Button)``\n'
  const head = "import { Button } from '~ui/src/design-system/components/Button'\n"
  const entry = { id: 'r', file, rule: 'restyled-piece', value: 'styled(Button)', reason: 'r' }
  const left = exceptions => pieces.scan({ file, source: head + source, exceptions }).filter(f => !f.exception).length
  assert.equal(left({}), 3)
  assert.equal(left({ pieces: [entry] }), 2)
  assert.equal(left({ pieces: [{ ...entry, count: 2 }] }), 1)
})

test('pieces: @base-ui/react outside the pieces and a style reaching into a piece are findings; reading a piece variable is not', () => {
  const found = (source, file = 'src/pages/Fixture/index.js') => pieces.scan({ file, source }).map(f => [f.rule, f.value])
  assert.deepEqual(found("import { Dialog } from '@base-ui/react/dialog'\n"), [['base-ui-direct', '@base-ui/react/dialog']])
  assert.deepEqual(found("import { Dialog } from '@base-ui/react/dialog'\n", 'src/ui/src/design-system/components/Dialog.jsx'), [])
  assert.deepEqual(found("const A = styled.div`\n  [data-slot='button'] { box-shadow: none; }\n`\n"), [['piece-selector', '[data-slot']])
  assert.deepEqual(found('const A = styled.div`\n  --ui-button-height: 2px;\n`\n'), [['piece-selector', '--ui-button-height']])
  assert.deepEqual(found("export const A = () => <b style={{ '--ui-button-height': size }} />\n"), [['piece-selector', '--ui-button-height']])
  assert.deepEqual(found("const { '--ui-button-height': size } = componentVars(theme, 'button')\nconst NOT_A_PIECE = ':where(:not([data-slot]))'\n"), [])
  assert.deepEqual(found("const A = styled.div`\n  [data-slot='x'] { top: 0 }\n`\n", 'src/ui/src/design-system/components/Piece.jsx'), [])
})

/* eslint-disable no-template-curly-in-string */
// A component folder: its index renders `imports`, its styles.js is `styles`. -> the piece-override findings of styles.js.
const overrides = (styles, imports = "import { Button } from '~ui/src/design-system/components/Button'\n", { folder = 'src/ui/src/components/Fixture', exceptions } = {}) => {
  const root = mkdtempSync(path.join(tmpdir(), 'override-'))
  mkdirSync(path.join(root, folder), { recursive: true })
  writeFileSync(path.join(root, folder, 'index.js'), `${imports}export const A = () => null\n`)
  const file = `${folder}/styles.js`
  const source = `import styled, { css } from 'styled-components'\nexport const Box = styled.div\`\n${styles}\n\`\n`
  return pieces.scan({ file, source, root, exceptions }).filter(f => f.rule === 'piece-override')
}

test('pieces: piece-override catches a container that rewrites the look of a piece it renders', () => {
  const bad = {
    'button { color: red; }': 'button',
    'button { background: var(--x); border-radius: 0; }': 'button',
    '> button { min-width: 18ch; max-width: 70%; }': '> button',
    '&&&& > button:focus-visible {\n ${focusRingInsetCss(theme)}\n }': '&&&& > button:focus-visible',
    'button:first-child:not(:last-child) { width: 100%; }': 'button:first-child:not(:last-child)',
    'button { &:hover { color: red; } }': 'button:hover',
    '.row { button { padding: 0; } }': '.row button',
    'a, button { font-size: 12px; }': 'button',
    '@media (max-width: 40px) { button { height: 20px; } }': 'button',
    "[role='tab'] { color: red; }": "[role='tab']",
    'button::before { content: ""; border: 0; }': 'button::before',
    'button { ${mixin} }': 'button',
    // the CSS of a plain template inside an interpolation is style too (BusinessTypes had `button { white-space }` there)
    'display: flex;\n${({ $a }) => !$a && `\n button { white-space: nowrap; }\n`}': 'button'
  }
  for (const [css, selector] of Object.entries(bad)) {
    const found = overrides(css)
    assert.equal(found.length, 1, `${css} -> ${JSON.stringify(found)}`)
    assert.ok(found[0].value.endsWith(selector), `${found[0].value} should end with ${selector}`)
  }
  assert.equal(overrides('input { width: 100% }', "import { Input } from '~ui/src/design-system/components/Input'\n").length, 1)
  assert.equal(overrides('button { color: red; }', "import { MenuItemButton } from '~ui/src/design-system/components/ButtonAppearances'\n").length, 1)
})

test('pieces: piece-override leaves alone the container\'s own layout, the placement of a piece, and what is not a piece', () => {
  const good = [
    'display: grid; gap: 8px; padding: 4px; color: red;',
    '&:hover { color: red; }',
    '&:focus-visible { outline: 0; }',
    'button { margin-top: 4px; flex: 1; align-self: center; position: relative; z-index: 1; display: none; }',
    '.button { color: red; }',
    '.my-button, #button { color: red; }',
    'button.x { }',
    'p { color: red; } span { font-size: 1px; } svg { width: 1px; }',
    ':not(button) { color: red; }',
    'input[type=hidden] { display: none; }',
    '/* button { color: red } */',
    "[role='dialog'] { color: red; }",
    'button { margin: 0; ${p => p.x && css`flex: 1;`} }'
  ]
  // the `${...}` of the last one is a value inside a declaration of a placement: ours is a mixin on its own line, a separate case
  for (const css of good.slice(0, -1)) assert.deepEqual(overrides(css), [], css)
  // a field selector with no field piece, and a folder that renders no control piece, are not this rule's
  assert.deepEqual(overrides('input { width: 100% }'), [])
  assert.deepEqual(overrides('button { color: red; }', "import { Icon } from '~ui/src/design-system/components/Icon'\n"), [])
  assert.deepEqual(overrides('button { color: red; }', "import { x } from '~ui/src/styles/Buttons'\n"), [])
  // the pieces themselves style their own element
  assert.deepEqual(overrides('button { color: red; }', "import { Button } from '~ui/src/design-system/components/Button'\n", { folder: 'src/ui/src/design-system/components/Foo' }), [])
  // a piece imported by the style file itself counts; a legacy primitive's folder (no piece) does not
  const alone = pieces.scan({ file: 'src/ui/src/components/Fixture/styles.js', source: "import { Button } from '~ui/src/design-system/components/Button'\nexport const A = styled.div`\n button { color: red; }\n`\n" })
  assert.deepEqual(alone.map(f => f.rule), ['piece-override'])
})

test('pieces: piece-override sees the phone number input by its known class, any case of a property, and a brace inside a string (implementation notes review M3)', () => {
  const field = "import { InputPhone } from '~ui/src/design-system/components/InputPhone'\n"
  // the number of InputPhone carries the library's class: a container that aligns or paints it is overriding the piece
  for (const css of ['.PhoneInputInput { text-align: center; }', '.phone_number .PhoneInputInput { padding: 0; }', '&& .PhoneInputInput:focus { border-color: red; }', '.PhoneInputCountrySelect { color: red; }']) {
    const found = overrides(css, field)
    assert.equal(found.length, 1, `${css} -> ${JSON.stringify(found)}`)
  }
  // property names are not case sensitive
  assert.equal(overrides('button { COLOR: red; }').length, 1)
  assert.equal(overrides('button { Background-Color: red; }').length, 1)
  // a brace or a semicolon inside a string does not end the rule or the declaration
  assert.equal(overrides('button { content: "}"; color: red; }').length, 1)
  assert.equal(overrides("button { content: '}'; color: red; }").length, 1)
  assert.equal(overrides('button { content: ";"; padding: 0; }').length, 1)
  // ... and what a string says is not a declaration
  assert.deepEqual(overrides('button { margin: 0; content: "a; color: red"; }'), [])
  assert.deepEqual(overrides('button { margin: 0; content: "} p { color: red }"; }'), [])
  // negatives: the class says nothing about a piece unless it is the field's; its layout and placement are free
  assert.deepEqual(overrides('.PhoneInputInput { display: none; }', field), [])
  assert.deepEqual(overrides('.PhoneInputInput { margin: 0; flex: 1; }', field), [])
  assert.deepEqual(overrides('.phone_number { display: flex; justify-content: center; }', field), [])
  assert.deepEqual(overrides('.PhoneInput { text-align: center; }', field), [])
  assert.deepEqual(overrides('.input { text-align: center; }', field), [])
  // no piece rendered, no override
  assert.deepEqual(overrides('.PhoneInputInput { text-align: center; }', "import { Icon } from '~ui/src/design-system/components/Icon'\n"), [])
})

test('pieces: piece-override reports its line and honors a recorded exception', () => {
  const [one] = overrides('display: flex;\n\nbutton { color: red; }')
  assert.equal(one.line, 5)
  const entry = { id: 'x', file: 'src/ui/src/components/Fixture/styles.js', rule: 'piece-override', value: '& button', reason: 'r' }
  assert.equal(overrides('button { color: red; }', undefined, { exceptions: { pieces: [entry] } })[0].exception, 'x')
})

/* eslint-enable no-template-curly-in-string */

// ---- ui-scope-guard ----

test('ui-scope: ui: classes outside design-system/components are findings; prose and keys are not', () => {
  const bad = scan(uiScope, 'ui-scope-bad.js.txt', 'src/pages/Fixture/index.js')
  assert.deepEqual(bad.map(f => f.value).sort(), ['ui:[border:var(--ui-x)]', 'ui:bg-primary', 'ui:font-bold', 'ui:max-mobile:hidden', 'ui:p-md', 'ui:text-body'])
  assert.deepEqual(scan(uiScope, 'ui-scope-good.js.txt', 'src/pages/Fixture/index.js'), [])
})

test('ui-scope: the same classes inside design-system/components are free', () => {
  assert.deepEqual(scan(uiScope, 'ui-scope-bad.js.txt', 'src/ui/src/design-system/components/Fixture.jsx'), [])
})
