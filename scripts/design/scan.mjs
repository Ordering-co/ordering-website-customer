// Design guards: shared source scanner.
//
// One pass over a JS/JSX file that separates what is style from what is not, so the
// guards read the same regions and never count a comment, a translation or an
// interpolation as a literal. No dependency: the repo does not declare a parser.
//
// shortcut: a regex literal that holds a quote or a backtick, or JSX text with an
// apostrophe, can desync the scanner until the end of that line (strings stop at a
// newline); upgrade to a real parser if a guard ever misses a region because of it.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export const posix = p => p.split(path.sep).join('/')

// a lowercase css property followed by a literal length, duration or color
const CSS_DECLARATION = /(?:^|[\s;{"'])[a-z][a-z-]*\s*:\s*[^;{}]*(?:\d(?:px|rem|ms|s)\b|#[0-9a-fA-F]{3,8}\b|rgba?\()/

const STYLE_FNS = new Set(['css', 'keyframes', 'createGlobalStyle', 'injectGlobal'])
const blank = s => s.replace(/[^\n]/g, ' ')

/** Is the backtick at `end` the start of a styled-components template (styled.x``, styled(X).attrs(...)``, css``...)? */
const isStyleTag = (src, end) => {
  let i = end - 1
  let head = ''
  for (let step = 0; step < 20; step++) {
    while (i >= 0 && /\s/.test(src[i])) i--
    if (src[i] === ')') {
      let depth = 0
      for (; i >= 0; i--) {
        if (src[i] === ')') depth++
        else if (src[i] === '(' && --depth === 0) break
      }
      i--
      while (i >= 0 && /\s/.test(src[i])) i--
    }
    let j = i
    while (j >= 0 && /[\w$]/.test(src[j])) j--
    head = src.slice(j + 1, i + 1)
    i = j
    while (i >= 0 && /\s/.test(src[i])) i--
    if (src[i] === '.') { i--; continue }
    break
  }
  return head === 'styled' || STYLE_FNS.has(head)
}

/**
 * -> {
 *   text:   the css text of style templates (and, in a style file, of every string and template),
 *           interpolations and comments blanked; same length and lines as the source
 *   code:   style regions with their interpolations (the expressions are code that can hold literals)
 *   plain:  the whole source with comments blanked
 *   bare:   plain with the content of strings and template texts blanked (code only: JSX tags, calls)
 *   strings: [{ index, value, style }] every string token (`style`: it sits inside a style region)
 * }
 * `styleFile`: the whole file is style (a styles.js, a styles/ folder): its top-level strings count too.
 */
export const analyze = (src, { styleFile = false } = {}) => {
  const n = src.length
  const text = blank(src).split('')
  const code = blank(src).split('')
  const plain = src.split('')
  const bare = src.split('')
  const strings = []

  const wipe = (from, to) => { for (let k = from; k < to; k++) if (src[k] !== '\n') plain[k] = bare[k] = ' ' }
  const hide = (from, to) => { for (let k = from; k < to; k++) if (src[k] !== '\n') bare[k] = ' ' }

  const str = (i, ctx, textOn) => {
    const q = src[i]
    let j = i + 1
    while (j < n && src[j] !== q && src[j] !== '\n') { if (src[j] === '\\') j++; j++ }
    if (src[j] !== q) return i + 1
    strings.push({ index: i, value: src.slice(i + 1, j), style: ctx })
    hide(i + 1, j)
    if (ctx || textOn) for (let k = i; k <= j; k++) { code[k] = src[k]; if (textOn) text[k] = src[k] }
    return j + 1
  }

  const tpl = (i, ctx, textOn) => {
    const tagged = isStyleTag(src, i)
    const inText = tagged || textOn || ctx
    const inCode = tagged || ctx || textOn
    let j = i + 1
    let value = ''
    const segments = []
    while (j < n && src[j] !== '`') {
      if (src[j] === '\\') { value += src.slice(j, j + 2); j += 2; continue }
      if (src[j] === '$' && src[j + 1] === '{') { j = run(j + 2, 0, inCode, false) + 1; value += ' '; continue }
      hide(j, j + 1)
      if (inCode) code[j] = src[j]
      if (inText) text[j] = src[j]
      segments.push(j)
      value += src[j]
      j++
    }
    strings.push({ index: i, value, style: ctx || tagged })
    // a plain template that holds css declarations (el.style.cssText = `...`, an html style="...") is style too
    if (!inText && CSS_DECLARATION.test(value)) for (const k of segments) text[k] = code[k] = src[k]
    return j + 1
  }

  // exprDepth -1: top level; 0: inside a ${...} (returns at its closing brace)
  function run (start, exprDepth, ctx, textOn) {
    let i = start
    let depth = 0
    while (i < n) {
      const c = src[i]
      const d = src[i + 1]
      if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const to = e < 0 ? n : e; wipe(i, to); i = to; continue }
      if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const to = e < 0 ? n : e + 2; wipe(i, to); i = to; continue }
      if (c === '"' || c === "'") { i = str(i, ctx, textOn); continue }
      if (c === '`') { i = tpl(i, ctx, textOn); continue }
      if (exprDepth >= 0) {
        if (c === '{') depth++
        else if (c === '}') { if (depth === 0) return i; depth-- }
      }
      if (ctx) code[i] = c
      i++
    }
    return i
  }

  run(0, -1, styleFile, styleFile)

  const clean = s => s
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[\s;{}])\/\/[^\n]*/g, (m, p) => p + blank(m.slice(p.length)))
  return { text: clean(text.join('')), code: clean(code.join('')), plain: clean(plain.join('')), bare: clean(bare.join('')), strings }
}

/** 1-based line of an index. */
export const lineOf = src => {
  const starts = [0]
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1)
  return index => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= index) lo = mid; else hi = mid - 1 }
    return lo + 1
  }
}

// a translation call t('KEY', 'default text', { values }): text for people, not style
const QUOTED = ["'(?:\\\\.|[^'\\\\])*'", '"(?:\\\\.|[^"\\\\])*"', '`(?:\\\\.|[^`\\\\])*`'].join('|')
const T_CALL = new RegExp(`(?<![\\w.$])t\\(\\s*(?:${QUOTED})(?:\\s*,\\s*(?:${QUOTED}|[\\w.$]+|\\{[^}]*\\}))*\\s*\\)`, 'g')

/** Blank the parts of a style that are not design values: translations, media features, urls, breakpoints. */
export const withoutNonValues = s => s
  .replace(T_CALL, blank)
  .replace(/@(?:media|container|supports)[^{;]*/g, blank)
  .replace(/\((?:min|max)-(?:device-)?(?:width|height)\s*:[^)]*\)/g, blank)
  .replace(/url\((?:[^()'"]|'[^']*'|"[^"]*")*\)/g, blank)

// ---- files ----

const walk = (root, dir, skip) => {
  const abs = path.join(root, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs).flatMap(name => {
    const rel = `${dir}/${name}`
    if (skip(rel, name)) return []
    return statSync(path.join(root, rel)).isDirectory() ? walk(root, rel, skip) : [rel]
  })
}

// `setupTests.js` is the Vitest setup (DOM mocks of the plugins), never part of the shipped app
const TEST_FILE = /\.(?:test|spec)\.[jt]sx?$|(?:^|\/)setupTests\.[jt]sx?$/
const SOURCE_FILE = /\.(?:js|jsx)$/

/**
 * Source files under `dirs` (repo-relative, sorted), never the submodule, tests (and the Vitest setup) or fixtures.
 * `exclude`: path prefixes left out of this guard's scope.
 */
export const sourceFiles = (root, dirs, exclude = []) => {
  const skip = (rel, name) => name === '__tests__' || name === 'node_modules' || rel === 'src/@' || exclude.some(e => rel === e || rel.startsWith(`${e}/`))
  return dirs.flatMap(dir => walk(root, dir, skip)).filter(f => SOURCE_FILE.test(f) && !TEST_FILE.test(f)).sort()
}

export const readSource = (root, file) => readFileSync(path.join(root, file), 'utf8')

/** Match recorded exceptions in source order, up to their explicit occurrence count. */
export const applyRuleExceptions = (findings, file, exceptions) => {
  findings.sort((a, b) => a.line - b.line)
  const remaining = new Map()
  for (const finding of findings) {
    const entry = exceptions?.find(e =>
      e.detected !== false && e.file === file && e.rule === finding.rule && e.value === finding.value &&
      (remaining.get(e.id) ?? e.count ?? 1) > 0
    )
    if (!entry) continue
    const count = remaining.get(entry.id) ?? entry.count ?? 1
    finding.exception = entry.id
    remaining.set(entry.id, count - 1)
  }
  return findings
}

/** A style.js / styles.js or anything under a styles/ folder: the whole file is style. */
export const isStyleFile = file => /(?:^|\/)styles?\.js$/.test(file) || /(?:^|\/)styles\//.test(file)

// ---- imports ----

const IMPORT = /\bimport\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+))?\s*from\s*(['"])([^'"]+)\4/g
const SIDE_IMPORT = /\bimport\s*(['"])([^'"]+)\1/g
const REQUIRE = /\b(?:require|import)\s*\(\s*(['"])([^'"]+)\1\s*\)/g

/** Imports of a file (read from `plain`): [{ spec, names: [local names], bindings: [{ local, imported }], index }] (dynamic and side-effect ones have no names). */
export const importsOf = plain => {
  const out = []
  for (const m of plain.matchAll(IMPORT)) {
    const bindings = []
    if (m[1]) bindings.push({ local: m[1], imported: 'default' })
    if (m[3]) bindings.push({ local: m[3], imported: '*' })
    for (const part of (m[2] || '').split(',')) {
      const p = part.trim()
      if (!p) continue
      const as = p.split(/\s+as\s+/)
      bindings.push({ local: (as[1] || as[0]).trim(), imported: as[0].trim() })
    }
    out.push({ spec: m[5], names: bindings.map(b => b.local), bindings, index: m.index })
  }
  for (const m of plain.matchAll(SIDE_IMPORT)) out.push({ spec: m[2], names: [], bindings: [], index: m.index })
  for (const m of plain.matchAll(REQUIRE)) out.push({ spec: m[2], names: [], bindings: [], index: m.index })
  return out
}

/** The repo path an import points at (aliases of jsconfig/vite), without extension or /index; null for a package. */
export const resolveImport = (file, spec) => {
  let p
  if (spec === '~ui-icon') p = 'src/ui/src/components/Icon'
  else if (spec === '~ui' || spec.startsWith('~ui/')) p = `src/ui${spec.slice(3)}`
  else if (spec.startsWith('~/')) p = `src/${spec.slice(2)}`
  else if (spec.startsWith('.')) p = path.posix.join(path.posix.dirname(file), spec)
  else return null
  return p.replace(/\.(?:js|jsx)$/, '').replace(/\/index$/, '').replace(/\/$/, '')
}

export const isUnder = (target, base) => target === base || target.startsWith(`${base}/`)
