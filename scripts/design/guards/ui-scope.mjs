// ui-scope-guard (design-system.md › "How a store's theme reaches a piece"): Tailwind compiles only
// src/ui/src/design-system/components/, so a `ui:` class anywhere else is not compiled and silently does
// nothing. There is no baseline: it tolerates nothing.
import { analyze, isUnder, lineOf, sourceFiles } from '../scan.mjs'

export const DIRS = ['src']
export const COMPILED_DIR = 'src/ui/src/design-system/components'

export const RULES = {
  'ui-class': 'a `ui:` class outside src/ui/src/design-system/components/ is not compiled by Tailwind'
}

// a class token: `ui:` at the start of a word inside a string, followed by a variant or utility
const UI_CLASS = /(?<![\w-])ui:[a-z0-9[(&*!@-][^\s'"`]*/g

export const scan = ({ file, source }) => {
  if (isUnder(file, COMPILED_DIR)) return []
  const { strings } = analyze(source)
  const at = lineOf(source)
  return strings.flatMap(s => [...s.value.matchAll(UI_CLASS)].map(m => ({ line: at(s.index), rule: 'ui-class', value: m[0], reason: RULES['ui-class'] })))
}

export default {
  name: 'ui-scope',
  baseline: false,
  files: root => sourceFiles(root, DIRS),
  scan
}
