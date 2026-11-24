// literal-guard (THEMING.md §1 and §7): a visual value in a component comes from the theme.
//
// Accepted as a token, without looking at it: everything that is an interpolation or a reference
// (props.theme.*, theme.*, themeColor(theme, ...), themeSpace(theme, ...), var(--ot-*), var(--ds-*),
// var(--ui-*)): only a literal written in the source is a finding. Flagged: hex, rgb()/rgba()/hsl(),
// px, rem, durations (ms, s), font names, computed colors (darken, lighten, mix... that do not come from
// @orderingco/ordering-theme-engine/colors) and the arbitrary Tailwind classes `ui:...[...]` with a literal.
//
// Not a design value, so not a finding: 0, percentages and every relative unit (ch, em, lh, fr, vw/vh and their
// dvh/svh/lvh/vi/vb/vmin/vmax/cq* forms), so `min(100%, 60ch)`, `minmax(0, 1fr)`, `calc(100dvh - var(--header-height))` and
// `clamp()` of tokens are the fluid layout recipes of docs/design-system/px-map.md (the finding is a fixed `px` or `rem` inside them), @media/@container/@supports and
// (min|max)-width features, the 44px accessibility floor in touch-area rules (marked `/* touch-target */`),
// the named rules of NAMED_RULES (only inside their helper file),
// url(...), the text of t('...'), comments, tests, the submodule
// (src/@/components) and the recorded exceptions of scripts/design/exceptions.json (each exempts `count` occurrences).
import { analyze, importsOf, isStyleFile, lineOf, sourceFiles, withoutNonValues } from '../scan.mjs'

export const DIRS = ['src/ui', 'src/pages', 'src/components']
// design-system/preview is the dev-only preview page (its fixtures are themes, with hex by design).
export const EXCLUDE = ['src/ui/src/design-system/preview']

// The rules that are not design values (1px of the sr-only pattern, the 16px floor of a phone field, the 8px height of a popover arrow), written
// once with their reason. Accepted in this file and only these values; anywhere else they are findings.
export const NAMED_RULES = { file: 'src/ui/src/styles/Rules/index.js', values: ['1px', '8px', '12px', '16px'] }

export const RULES = {
  hex: 'color literal: use a color token of the theme (THEMING §1)',
  rgb: 'color function with literal values: use a color token of the theme (THEMING §1)',
  px: 'length in px: use the theme (space, radius, size, border) (THEMING §1)',
  rem: 'length in rem: use the theme (THEMING §1)',
  duration: 'duration in ms/s: use the theme motion (THEMING §1)',
  font: 'font family written in a component: use the theme typography (THEMING §1)',
  'named-color': 'named color (white, red...) after a color property: use a color token of the theme (THEMING §1)',
  'computed-color': 'color computed in a component: derive it in the schema or use the engine colors (THEMING §7)'
}

const GENERIC_FONT = /^(?:inherit|initial|unset|revert|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[\w-]+|math|emoji|fangsong)$/i
const COMPUTED = /(?<![\w.$-])(darken|lighten|mix|shade|tint|saturate|desaturate|transparentize|opacify)\s*\(/g
const ENGINE_COLORS = '@orderingco/ordering-theme-engine/colors'

// not followed, on its line, by a `{`: `#add, #bad { ... }` is a selector, not a color
const HEX = /(?<![\w&$-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])(?!(?:[^;{}$\n]|\$(?!\{))*\{)/g
const RGB = /(?<![\w-])(?:rgba?|hsla?)\((?!\s*(?:var\(|from\b))/gi
const UNIT = /(?<![\w$#.])(?:\d*\.?\d+)(px|rem|ms|s)(?![\w-])/g
const FONT_FAMILY = /(?<![\w-])font-family\s*:\s*([^;{}]*)/g
const FONT_FAMILY_JS = /\bfontFamily\s*:\s*(['"`])([^'"`]*)\1/g

const UI_CLASS = /(?<![\w-])ui:[^\s'"`]+/g
const blank = s => s.replace(/[^\n]/g, ' ')
const isZero = literal => parseFloat(literal) === 0

/** Literal findings of one piece of style text: [{ index, rule, value }]. */
const literalsIn = s => {
  const out = []
  for (const m of s.matchAll(HEX)) out.push({ index: m.index, rule: 'hex', value: m[0] })
  for (const m of s.matchAll(RGB)) out.push({ index: m.index, rule: 'rgb', value: `${m[0].slice(0, -1)}()` })
  for (const m of s.matchAll(UNIT)) {
    if (isZero(m[0])) continue
    out.push({ index: m.index, rule: m[1] === 'px' ? 'px' : m[1] === 'rem' ? 'rem' : 'duration', value: m[0] })
  }
  return out
}

/** Font families written in css text (font-family: ...) or as a JS key (fontFamily: '...'). */
const fontsIn = (s, re) => {
  const out = []
  for (const m of s.matchAll(re)) {
    for (const family of (m[2] ?? m[1]).split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)) {
      if (!GENERIC_FONT.test(family) && !/^var\(/.test(family)) out.push({ index: m.index, rule: 'font', value: family })
    }
  }
  return out
}

const TOUCH_MINIMUM = /(?<![\w-])(?:min-(?:width|height|inline-size|block-size)|--[\w-]+-(?:floor|target))\s*:\s*44px\s*(?=[;}])/g
const hasTouchTargetMarker = (source, index) => source.slice(0, index).trimEnd().endsWith('/* touch-target */')

// The marker applies to one declaration, including layout reserved for a control.
const touchFloorOffsets = (source, text) => new Set(
  [...text.matchAll(TOUCH_MINIMUM)]
    .filter(match => hasTouchTargetMarker(source, match.index))
    .map(match => match.index + match[0].lastIndexOf('44px'))
)

const TOUCH_UTILITY = /:min-[hw]-\[(?:44px|max\(var\(--[\w-]+\),44px\)|calc\(44px\+var\(--[\w-]+\)\))\]!?$/
const TOUCH_AREA_VAR = /:\[--[\w-]+-(?:floor|target|action-size):(?:44px|max\(var\(--[\w-]+\),44px\))\]$/

// A Tailwind class `ui:...[...]` with a literal in its brackets (a breakpoint variant is not a value).
const arbitraryClassLiterals = (value, touchTarget) => {
  const out = []
  for (const m of value.matchAll(UI_CLASS)) {
    if (touchTarget && (TOUCH_UTILITY.test(m[0]) || TOUCH_AREA_VAR.test(m[0]))) continue
    const token = m[0].replace(/(?:min|max)-\[[^\]]*\]/g, '')
    for (const b of token.matchAll(/\[([^\]]*)\]/g)) out.push(...literalsIn(b[1]).map(l => ({ ...l, index: m.index })))
  }
  return out
}

// A closed list, after a color property: the names people actually type. `transparent`, `currentColor` and `inherit` are not here.
const NAMED_COLORS = 'white|black|red|green|blue|gray|grey|orange|yellow'
const COLOR_PROP = '(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|fill|stroke|caret-color|accent-color|text-decoration-color)'
const NAMED_CSS = new RegExp(`(?<![\\w-])${COLOR_PROP}\\s*:\\s*([^;{}]*)`, 'g')
const NAMED_JS = /(?<![\w.$-])(?:color|backgroundColor|background|borderColor|border|outlineColor|fill|stroke)\s*:\s*(['"])([^'"\n]*)\1/g
const NAMED_WORD = new RegExp(`(?<![\\w$.#-])(${NAMED_COLORS})(?![\\w-])`, 'gi')

/** Named colors in the value of a color property, in css text (`color: white`) or as a JS key (`color: 'white'`). */
const namedColorsIn = (s, re, group) => {
  const out = []
  for (const m of s.matchAll(re)) {
    const offset = m.index + m[0].length - m[group].length
    for (const w of m[group].matchAll(NAMED_WORD)) out.push({ index: offset + w.index, rule: 'named-color', value: w[1].toLowerCase() })
  }
  return out
}

// The name a string is the value of (`width: '12px'`, `padding='12px'`): the last `name:` or `name=` before it, within
// 3 lines (strings blanked, so a ternary's other branch is not mistaken for a name). Only these names are styles:
// `aria-label='3s'` or `data-id='#abc'` are not. A name ending in color/width/size... (`closeIconColor`, `openWidth`) is one too.
const STYLE_NAME = /^(?:style|color|fill|stroke\w*|background\w*|border\w*|outline\w*|(?:min|max)?(?:width|height)|top|left|right|bottom|inset\w*|margin\w*|padding\w*|(?:row|column)?gap|size|fontsize|lineheight|letterspacing|radius|boxshadow|transition\w*|animation\w*|duration|delay|\w*(?:color|width|height|size|radius|gap|padding|margin|duration))$/i
const styleNameBefore = (bare, index) => {
  const before = bare.slice(Math.max(0, index - 300), index).split('\n').slice(-3).join('\n')
  const name = [...before.matchAll(/([A-Za-z_$][\w$-]*)\s*[:=](?![=>])/g)].at(-1)?.[1]
  return Boolean(name) && STYLE_NAME.test(name.replace(/-/g, ''))
}

const WHOLE = /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgba?|hsla?)\(.*|-?(?:\d*\.?\d+)(?:px|rem|ms|s))$/i

export const scan = ({ file, source, exceptions }) => {
  const style = isStyleFile(file)
  const { text, code, plain, bare, strings } = analyze(source, { styleFile: style })
  const at = lineOf(source)
  const found = []
  const push = (index, rule, value) => found.push({ index, line: at(index), rule, value, reason: RULES[rule] })

  // a `ui:` class is read apart, with its own rules
  const values = s => withoutNonValues(s).replace(UI_CLASS, blank)
  const touchFloors = touchFloorOffsets(source, text)
  for (const l of literalsIn(values(code))) {
    if (!touchFloors.has(l.index)) push(l.index, l.rule, l.value)
  }
  for (const l of fontsIn(values(text), FONT_FAMILY)) push(l.index, l.rule, l.value)
  for (const l of fontsIn(values(plain), FONT_FAMILY_JS)) push(l.index, l.rule, l.value)
  for (const l of namedColorsIn(values(text), NAMED_CSS, 1)) push(l.index, l.rule, l.value)
  for (const l of namedColorsIn(values(plain), NAMED_JS, 2)) push(l.index, l.rule, l.value)

  // the colors of an inline <svg> are artwork, not styling: icon-guard's `inline-svg` counts the svg itself
  const svg = [...bare.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m => [m.index, m.index + m[0].length])
  for (const s of strings) {
    // a string that is nothing but a literal and the value of a style (`style={{ width: '12px' }}`, a `padding` prop) outside style regions
    if (!s.style && !svg.some(([a, b]) => s.index >= a && s.index < b) && WHOLE.test(s.value.trim()) && styleNameBefore(bare, s.index)) for (const l of literalsIn(s.value.trim())) push(s.index, l.rule, l.value)
    if (s.value.includes('ui:')) for (const l of arbitraryClassLiterals(s.value, hasTouchTargetMarker(source, s.index))) push(s.index + l.index, l.rule, l.value)
  }

  // computed colors, unless the file imports that function from the engine's colors
  const fromEngine = new Set(importsOf(plain).filter(i => i.spec === ENGINE_COLORS).flatMap(i => i.names))
  for (const m of withoutNonValues(bare).matchAll(COMPUTED)) if (!fromEngine.has(m[1])) push(m.index, 'computed-color', `${m[1]}()`)
  for (const m of withoutNonValues(code).matchAll(/(?<![\w-])color-mix\(/g)) push(m.index, 'computed-color', 'color-mix()')

  // one finding per literal and place
  const seen = new Set()
  const unique = found.filter(f => { const k = `${f.index}|${f.rule}|${f.value}`; if (seen.has(k)) return false; seen.add(k); return true })
  // the named rules, inside their helper only
  if (file === NAMED_RULES.file) for (const f of unique) if (NAMED_RULES.values.includes(f.value)) f.exception = 'named-rule'
  // an exception exempts its first `count` occurrences (default 1) of that value in that file, in source order:
  // the n+1-th is a finding, so an exception cannot cover a later, unrelated use
  unique.sort((a, b) => a.index - b.index)
  const left = new Map()
  for (const f of unique) {
    const e = (exceptions.literal || []).find(x => x.file === file && x.value === f.value)
    if (!e) continue
    const n = left.get(e.id) ?? e.count ?? 1
    if (n > 0) { f.exception = e.id; left.set(e.id, n - 1) }
  }
  return unique.map(({ index, ...f }) => f)
}

export default {
  name: 'literal',
  baseline: true,
  exceptions: true,
  exactExceptionCounts: true,
  files: root => sourceFiles(root, DIRS, EXCLUDE),
  scan
}
