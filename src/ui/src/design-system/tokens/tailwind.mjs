// How the catalog (catalog.mjs) and the aliases (aliases.mjs) read in Tailwind:
// each token's `--color-…`, `--spacing-…` name. One place for the generator
// (scripts/theme-css-catalog.mjs, which writes the `@theme inline` block) and
// for `cn` (tailwind-merge needs the same names), so they cannot disagree.
// Plain ESM: Node runs it.
import { ALIASES, BRAND_COLORS } from './aliases.mjs'

const kebab = (name) => name.replace(/_/g, '-')

// token group → Tailwind theme namespace (absent: Tailwind has none, so the
// token is only reachable as an arbitrary value, `border-(length:--ot-…)`)
const NAMESPACES = { color: '--color-', radius: '--radius-', space: '--spacing-', size: '--spacing-size-', icon: '--spacing-icon-', shadow: '--shadow-' }

const catalogName = ({ group, key, part }) => {
  const k = kebab(key)
  if (group === 'typography') return { size: `--text-${k}`, line: `--text-${k}--line-height`, weight: `--font-weight-${k}` }[part]
  if (group === 'font') return `--font-${k}`
  if (group === 'color') return `--color-${BRAND_COLORS[key] ?? k}`
  return NAMESPACES[group] && `${NAMESPACES[group]}${k}`
}

// An alias is a color (`--color-ring`) or a radius (`--radius-md`) in Tailwind.
const aliasName = (name, { group, key }) => {
  if (group === 'color' || (group === 'focus_ring' && key === 'color')) return `--color-${name}`
  if (group === 'radius') return `--radius-${name.replace(/^radius-/, '')}`
  throw new Error(`alias ${name}: no Tailwind namespace for ${group}`)
}

/**
 * Every Tailwind theme variable of the catalog and its aliases, as a Map
 * `--color-on-primary` → the catalog entry it reads. A name taken twice by two
 * different tokens throws: a Tailwind name has one meaning (the web's
 * `background` and `secondary` are renamed in BRAND_COLORS for that).
 */
export const tailwindLines = (entries, aliases = ALIASES) => {
  const lines = new Map()
  const add = (name, entry) => {
    if (lines.has(name) && lines.get(name).ot !== entry.ot) {
      throw new Error(`${name} is taken by ${lines.get(name).ot} and ${entry.ot}: give one a name in BRAND_COLORS`)
    }
    lines.set(name, entry)
  }
  for (const entry of entries) {
    const name = catalogName(entry)
    if (name) add(name, entry)
  }
  for (const [name, ot] of Object.entries(aliases)) {
    const entry = entries.find((e) => e.ot === ot)
    if (!entry) throw new Error(`alias ${name}: ${ot} is not in the catalog`)
    add(aliasName(name, entry), entry)
  }
  return lines
}

// The names tailwind-merge has to know, by its theme scales
// (`--color-on-primary` → `color: ['on-primary']`).
const MERGE_SCALES = [['--color-', 'color'], ['--radius-', 'radius'], ['--spacing-', 'spacing'], ['--shadow-', 'shadow'], ['--font-weight-', 'font-weight'], ['--font-', 'font'], ['--text-', 'text']]

export const mergeTheme = (lines) => {
  const theme = {}
  for (const name of lines.keys()) {
    if (name.endsWith('--line-height')) continue
    const [prefix, scale] = MERGE_SCALES.find(([start]) => name.startsWith(start))
    ;(theme[scale] ||= []).push(name.slice(prefix.length))
  }
  return theme
}
