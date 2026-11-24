// The catalog of the theme's tokens, once, with no CSS framework in it: every
// token and its runtime variable (`--ot-<group>-<level>`). The generator
// (scripts/theme-css-catalog.mjs) fills the values from the schema's defaults
// and the writer (variables.js) from the theme, so the two cannot disagree on
// a name. Plain ESM, no aliases: Node runs it.

const kebab = (name) => name.replace(/_/g, '-')

// token group → its variable's group name, in the catalog's order
// (`border_fixed`: the border a control that draws a shape keeps, Identity aside)
const GROUPS = ['color', 'radius', 'space', 'size', 'icon', 'shadow', 'border', 'border_fixed', 'opacity', 'font', 'focus_ring']

/** The levels of each group, from `tokens` (the schema's, completed). */
export const keysFromTokens = (tokens) => (group) => Object.keys(tokens[group === 'border_fixed' ? 'border' : group])

/**
 * Every entry of the catalog as `{ ot, group, key, part, value }`: the runtime
 * variable, its token group and level (typography also its `part`: size, line,
 * weight) and its value. `keysOf(group)` lists a group's levels; `read(group,
 * key)` gives the value (typography: `{ size, line, weight }`).
 */
export const catalogEntries = (keysOf, read) => {
  const entries = []
  for (const group of GROUPS) {
    for (const key of keysOf(group)) entries.push({ ot: `--ot-${kebab(group)}-${kebab(key)}`, group, key, value: read(group, key) })
  }
  for (const key of keysOf('typography')) {
    const text = read('typography', key)
    for (const part of ['size', 'line', 'weight']) {
      entries.push({ ot: `--ot-text-${kebab(key)}-${part}`, group: 'typography', key, part, value: text[part] })
    }
  }
  return entries
}
