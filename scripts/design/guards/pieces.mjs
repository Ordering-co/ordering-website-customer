// pieces-guard (design-system.md › Using and extending pieces): where a base piece exists, the screen uses it.
// A native <button>/<input>, the legacy primitives of src/ui/src/styles/ that have a piece (Buttons, Inputs,
// Select, Tabs, Chip, Avatar, Choice, Checkbox, FavoriteButton) and the legacy Modal/BottomSheet for overlays
// are debt with a ratchet per file; a new file has none. A control with no base piece yet (switch, stepper,
// slider...) is not counted. For overlays only an import of Modal or BottomSheet themselves
// counts, not their helpers (ModalHeading, titleLevel, styles...): a screen that reads the heading level of a
// legacy modal does not open one.
//
// Also, with no baseline of their own (0 cases today): `@base-ui/react` imported outside the pieces, a style that
// reaches into a piece (`[data-slot...]`, `--ui-*` set from a screen) and `piece-override`: a container of a component
// that renders a piece (it or a file beside it imports one) with a rule whose subject is the element of a piece
// (`button`, `input`, `textarea`, `select`, a piece's `[role=...]`, in any selector: `> button`, `&& > button:focus-visible`,
// `button:first-child`...) that sets its presentation (color, background, border, radius, padding, type, size, ring).
// Placing the piece (margin, flex/grid placement, position) or the container's own layout is not counted.
// Limits: a selector that names the piece by a styled reference (`${Button} { ... }`) or inside `:is()` is not seen.
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { analyze, applyRuleExceptions, importsOf, isStyleFile, isUnder, lineOf, readSource, resolveImport, sourceFiles } from '../scan.mjs'

export const DIRS = ['src']
export const EXCLUDE = ['src/ui/src/design-system/preview']

const PIECES_DIR = 'src/ui/src/design-system/components'
const LEGACY = {
  'legacy-buttons': ['src/ui/src/styles/Buttons'],
  'legacy-inputs': ['src/ui/src/styles/Inputs'],
  'legacy-overlay': ['src/ui/src/components/Modal', 'src/ui/src/components/BottomSheet'],
  // the pieces of PZ-1 and Wave 2 (R2-03): each legacy primitive that now has a base piece
  'legacy-select': ['src/ui/src/styles/Select', 'src/ui/src/styles/Selects'],
  'legacy-tabs': ['src/ui/src/styles/Tabs'],
  'legacy-chip': ['src/ui/src/styles/Chip'],
  'legacy-avatar': ['src/ui/src/styles/Avatar'],
  'legacy-choice': ['src/ui/src/styles/Choice'],
  'legacy-checkbox': ['src/ui/src/styles/Checkbox'],
  'legacy-favorite': ['src/ui/src/styles/FavoriteButton']
}

export const RULES = {
  'native-button': 'native button (styled.button / <button>): use the base Button',
  'native-input': 'native input (styled.input / <input>): use the base Input',
  'legacy-buttons': 'legacy Buttons primitive of src/ui/src/styles: use the base Button',
  'legacy-inputs': 'legacy Inputs primitive of src/ui/src/styles: use the base Input',
  'legacy-overlay': 'import of the legacy Modal/BottomSheet: use the base Dialog/Sheet',
  'legacy-select': 'legacy Select/Selects primitive of src/ui/src/styles: use the base Select',
  'legacy-tabs': 'legacy Tabs primitive of src/ui/src/styles: use the base Tabs (or RadioGroup segmented to pick a value)',
  'legacy-chip': 'legacy Chip primitive of src/ui/src/styles: use the base Chip',
  'legacy-avatar': 'legacy Avatar primitive of src/ui/src/styles: use the base Avatar',
  'legacy-choice': 'legacy Choice primitive of src/ui/src/styles: use the base Choice',
  'legacy-checkbox': 'legacy Checkbox primitive of src/ui/src/styles: use the base Checkbox/Radio',
  'legacy-favorite': 'legacy FavoriteButton of src/ui/src/styles: use the base Button (favorite)',
  'legacy-textarea': 'legacy TextArea of src/ui/src/styles/Inputs: use the base Textarea',
  'base-ui-direct': '@base-ui/react imported outside design-system/components: use the base piece (Dialog, Sheet, Button...)',
  'piece-selector': 'a style reaching into a piece ([data-slot], --ui-*): use its variants or the theme',
  'restyled-piece': 'styled(...) over a base piece: its utilities live in @layer and unlayered CSS wins; use its variants or the theme',
  'piece-override': 'a container rewrites the look of a base piece (button, input, [role]...): unlayered CSS wins over the piece; use its prop, variant or appearance'
}

// Symbols of a legacy module counted under a rule of their own: TextArea has its piece (Textarea) since d5a3ae97,
// and a rule of its own lets its baseline be seeded without raising legacy-inputs. Everything else the module
// exports is counted under the module's rule.
const SPLIT = { 'legacy-inputs': { TextArea: 'legacy-textarea' } }
const DESIGN_SYSTEM = 'src/ui/src/design-system'
const PIECE_SELECTOR = /\[data-slot|--ui-[a-z][\w-]*/g
const BASE_UI = /^@base-ui\/react(?:\/|$)/
const HIDDEN_TYPE = /\btype\s*=\s*(?:'hidden'|"hidden"|\{\s*(?:'hidden'|"hidden")\s*\})/

const MIXIN = '${}'
const PIECE_TAG = /^(?:button|input|textarea|select)(?![\w-])/i
// the classes `react-phone-number-input` puts on the number and the country select that InputPhone renders
const PIECE_CLASS = /^\.PhoneInput(?:Input|CountrySelect)(?![\w-])/
const PIECE_ROLE = /\[\s*role\s*[~|^$*]?=\s*["']?(?:tab|tablist|radio|radiogroup|checkbox|switch|combobox|listbox|option|menuitem\w*)\b/i
// what a container may not set on a piece's element; margin, flex/grid placement, position, display, z-index are the container's layout
const PRESENTATION = /^(?:color|background(?:-[\w-]+)?|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|box-shadow|opacity|padding(?:-[\w-]+)?|font(?:-[\w-]+)?|line-height|letter-spacing|text-(?:align|transform|decoration[\w-]*|overflow|shadow|indent)|white-space|word-break|(?:min-|max-)?(?:width|height|inline-size|block-size)|aspect-ratio|gap|row-gap|column-gap|fill|stroke|filter|accent-color|caret-color|appearance)$/

// Top-level split of a selector list or a compound chain, blind to what sits inside () and [].
const splitTop = (s, isSep) => {
  const out = []
  let depth = 0
  let from = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (depth === 0 && isSep(c)) { out.push(s.slice(from, i)); from = i + 1 }
  }
  out.push(s.slice(from))
  return out
}

/** CSS rules of a style text (interpolations already blanked): [{ index, selectors: [resolved selector], props: [declared property] }], nesting and `&` resolved. */
export const cssRules = (text, plain = text) => {
  const rules = []
  const stack = [{ selectors: ['&'], props: [] }]
  let start = 0
  const declare = to => {
    const m = /^\s*([a-z-]+)\s*:/i.exec(text.slice(start, to))
    // a whole declaration that is an interpolation (`${focusRingCss(theme)}`) is a mixin: what it sets is not read, it counts as presentation
    if (m) top().props.push(m[1].toLowerCase())
    else if (/^\s*\$\{/.test(plain.slice(start, to))) top().props.push(MIXIN)
  }
  const top = () => stack[stack.length - 1]
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    // a string (`content: "}"`) is a value: its braces and semicolons end nothing (it ends at its quote or its line)
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1
      if (text[j] === c) { i = j; continue }
    }
    if (c === ';') { declare(i); start = i + 1 } else if (c === '{') {
      // a style file also holds import paths as strings, ahead of the first template
      const raw = text.slice(start, i).replace(/^(?:\s*(?:'[^']*'|"[^"]*"))+/, '')
      const prelude = raw.trim()
      const parents = top().selectors
      const selectors = prelude.startsWith('@')
        ? parents
        : splitTop(prelude, c => c === ',').flatMap(sel => parents.map(p => (sel.includes('&') ? sel.replace(/&/g, p) : `${p} ${sel}`)))
      const rule = { index: start + (raw.length - raw.trimStart().length) + (text.slice(start, i).length - raw.length), selectors, props: [], at: prelude.startsWith('@') }
      if (!rule.at) rules.push(rule)
      stack.push(rule.at ? { selectors, props: top().props } : rule)
      start = i + 1
    } else if (c === '}') {
      declare(i)
      if (stack.length > 1) stack.pop()
      start = i + 1
    }
  }
  return rules
}

/** The last compound of a selector (its subject): `& > button:focus-visible` -> `button:focus-visible`. */
const subject = selector => splitTop(selector.trim(), c => /[\s>+~]/.test(c)).filter(Boolean).pop() || ''

// Pieces that paint no control of their own (an icon, a dot, an avatar, a tooltip): importing one is not rendering a control.
const PASSIVE = new Set(['Icon', 'createIcon', 'Dot', 'Avatar', 'Tooltip'])
// Pieces that render the `<input>`/`<textarea>` a container could reach.
const FIELDS = new Set(['Input', 'InputCode', 'InputPhone', 'Textarea', 'DateField', 'SdkField', 'Choice', 'Checkbox', 'Switch', 'Select', 'Stepper'])

/** The pieces a file renders: the base pieces imported by it or by a file of its folder. A container can only rewrite what it renders. */
const piecesOf = (file, plain, root) => {
  const used = new Set()
  const read = (from, source) => {
    for (const imp of importsOf(source)) {
      const t = resolveImport(from, imp.spec)
      if (t && isUnder(t, PIECES_DIR)) used.add(path.posix.basename(t).replace(/Appearances$/, ''))
    }
  }
  read(file, plain)
  const dir = path.posix.dirname(file)
  if (root && existsSync(path.join(root, dir))) {
    for (const name of readdirSync(path.join(root, dir))) {
      const sibling = `${dir}/${name}`
      if (sibling !== file && /\.jsx?$/.test(name) && !/\.(?:test|spec)\./.test(name)) read(sibling, analyze(readSource(root, sibling)).plain)
    }
  }
  return [...used].filter(name => !PASSIVE.has(name))
}

// An `<input type="hidden">` paints nothing and takes no focus: it only carries a value to the form, so no piece
// replaces it. Reads the opening tag from `plain` (strings kept), skipping the `{...}` of its props.
const isHiddenInput = (plain, from) => {
  let depth = 0
  for (let i = from; i < plain.length; i++) {
    const c = plain[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return HIDDEN_TYPE.test(plain.slice(from, i))
  }
  return false
}

export const scan = ({ file, source, root, exceptions = {} }) => {
  const { text, plain, bare } = analyze(source, { styleFile: isStyleFile(file) })
  const at = lineOf(source)
  const found = []
  const push = (index, rule, value) => found.push({ line: at(index), rule, value, reason: RULES[rule] })
  const inPieces = isUnder(file, PIECES_DIR)

  if (!inPieces) {
    for (const [tag, rule] of [['button', 'native-button'], ['input', 'native-input']]) {
      for (const m of bare.matchAll(new RegExp(`(?<![\\w.$])styled\\.${tag}(?![\\w-])|<${tag}(?![\\w.-])`, 'g'))) {
        if (tag === 'input' && m[0][0] === '<' && isHiddenInput(plain, m.index)) continue
        push(m.index, rule, m[0].replace(/\s+/g, ''))
      }
    }
  }
  if (!isUnder(file, DESIGN_SYSTEM)) {
    // a piece's variable set from a screen, style={{ '--ui-button-height': ... }}, is read in `plain` (reading it with componentVars is fine)
    const reach = [...text.matchAll(PIECE_SELECTOR)].map(m => [m.index, m[0]]).concat([...plain.matchAll(/style=\{\{[^}]*?(--ui-[a-z][\w-]*)/g)].map(m => [m.index, m[1]]))
    const seen = new Set()
    for (const [index, value] of reach) if (!seen.has(`${at(index)}|${value}`) && seen.add(`${at(index)}|${value}`)) push(index, 'piece-selector', value)
  }
  const rendered = isUnder(file, DESIGN_SYSTEM) || !text.includes('{') ? [] : piecesOf(file, plain, root)
  if (rendered.length) {
    const fields = rendered.some(name => FIELDS.has(name))
    for (const rule of cssRules(text, plain)) {
      if (!rule.props.some(p => p === MIXIN || PRESENTATION.test(p))) continue
      const hit = rule.selectors.find(sel => { const s = subject(sel); return /^(?:input|textarea)(?![\w-])/i.test(s) ? fields : PIECE_TAG.test(s) || PIECE_ROLE.test(s) || PIECE_CLASS.test(s) })
      if (hit) push(rule.index, 'piece-override', hit.replace(/\s+/g, ' ').trim())
    }
  }
  const pieces = new Set()
  for (const imp of importsOf(plain)) {
    if (BASE_UI.test(imp.spec) && !inPieces) push(imp.index, 'base-ui-direct', imp.spec)
    const target = resolveImport(file, imp.spec)
    if (!target) continue
    for (const [rule, bases] of Object.entries(LEGACY)) {
      const hits = b => (rule === 'legacy-overlay' ? target === b || target === `${b}/index` : isUnder(target, b))
      // a primitive of the same family (styles/Select reading styles/Selects) is not a screen: not counted.
      // Modal and BottomSheet are two families: BottomSheet opening a Modal still counts.
      const family = rule === 'legacy-overlay' ? bases.filter(hits) : bases
      if (bases.some(hits) && !family.some(b => isUnder(file, b))) {
        // one finding per imported name (an import with no names, `export ... from` or a side effect, counts once),
        // judged by the exported name, so an alias does not hide it nor free it
        const bindings = imp.bindings.length ? imp.bindings : [{ local: '*', imported: '*' }]
        bindings.forEach(b => push(imp.index, SPLIT[rule]?.[b.imported] || rule, `${b.local} from ${target.replace('src/ui/', '~ui/')}`))
      }
    }
    if (isUnder(target, PIECES_DIR)) imp.names.forEach(n => pieces.add(n))
  }
  for (const name of pieces) for (const m of bare.matchAll(new RegExp(`(?<![\\w.$])styled\\(\\s*${name}\\s*\\)`, 'g'))) push(m.index, 'restyled-piece', `styled(${name})`)
  return applyRuleExceptions(found, file, exceptions.pieces)
}

export default {
  name: 'pieces',
  baseline: true,
  exceptions: true,
  exactExceptionCounts: true,
  files: root => sourceFiles(root, DIRS, EXCLUDE),
  scan
}
