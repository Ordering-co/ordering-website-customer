// icon-guard (design-system.md › Icons): new code draws its icons with Lucide, through the base `Icon`,
// and its brand marks from src/ui/src/components/Icon/brands/. Debt that exists today (the legacy
// react-icons registry and the screens that use the legacy <Icon>) is a ratchet: it may go down, never up.
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { analyze, applyRuleExceptions, importsOf, isUnder, lineOf, resolveImport, sourceFiles } from '../scan.mjs'

export const DIRS = ['src']
export const EXCLUDE = ['src/ui/src/design-system/preview']

const LEGACY_ICON = 'src/ui/src/components/Icon'
const ICON_HOMES = ['src/ui/src/design-system/components', LEGACY_ICON]
const ICON_LIBS = /^(?:react-icons(?:\/|$)|@meronex\/|@heroicons\/|@fortawesome\/|react-feather$|feather-icons|@tabler\/|phosphor-react|@phosphor-icons\/|@mui\/icons-material|bootstrap-icons|react-bootstrap-icons|@radix-ui\/react-icons|ionicons|@iconify|simple-icons|lucide$|lucide-static)/

export const RULES = {
  'icon-lib': 'icon library other than Lucide (react-icons, @meronex...): use the base Icon (Lucide) or a brand mark',
  'lucide-direct': 'lucide-react imported outside design-system/components and Icon/: use the base Icon',
  'legacy-icon': 'legacy <Icon> (react-icons registry): use the base Icon of the design system',
  'inline-svg': 'inline <svg> outside Icon/ and the design system: an icon is a Lucide stroke or a brand mark, an illustration is an image file with <img>',
  'entry-full-icon': 'the entry chunk (static imports from src/index.js) reaches the full Icon and its Lucide registry: use createIcon with a glyph map'
}

// ---- the entry chunk (design-system.md › Icons, R2-01) ----
// What src/index.js reaches through static imports is in the first load. The full base Icon carries the whole
// Lucide registry (~13 kB gzip); the entry takes createIcon with a glyph map instead. Dynamic import() is a
// separate chunk and is not followed. No build: a regex over the source, as trace.mjs of the R2 review.
export const ENTRY = 'src/index.js'
export const ENTRY_FORBIDDEN = ['src/ui/src/design-system/components/Icon.jsx', 'src/ui/src/components/Icon/lucideRegistry.js']
// `;`, `=` and `<>` left out of the specifier list (they are never in one) so a "from" in a later statement (a JSX text) is not read as an import
const STATIC_IMPORT = /(?:^|[\n;}])\s*(?:import|export)(?![\w$])\s*(?:[^'";()=<>]*?\s*from\s*)?['"]([^'"]+)['"]/g
const EXTS = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx']

const toFile = (root, from, spec) => {
  let base = spec.startsWith('~components') ? `src/@/components/src${spec.slice('~components'.length)}` : resolveImport(from, spec)
  if (base === null) return null
  base = base.replace(/\/$/, '')
  // resolveImport drops .js/.jsx and /index: probe the real file
  for (const e of EXTS) { const f = base + e; const abs = path.join(root, f); if (existsSync(abs) && statSync(abs).isFile()) return f }
  return null
}

/** The static import chain from src/index.js to the first forbidden module, or null. */
export const entryReaches = (root, forbidden = ENTRY_FORBIDDEN) => {
  const parent = new Map([[ENTRY, null]])
  const queue = [ENTRY]
  while (queue.length) {
    const file = queue.shift()
    if (forbidden.includes(file)) {
      const chain = []
      for (let f = file; f; f = parent.get(f)) chain.unshift(f)
      return chain
    }
    if (!/\.(?:jsx?|mjs)$/.test(file)) continue
    const { plain } = analyze(readFileSync(path.join(root, file), 'utf8'))
    for (const m of plain.matchAll(STATIC_IMPORT)) {
      const next = toFile(root, file, m[1])
      if (next && !parent.has(next)) { parent.set(next, file); queue.push(next) }
    }
  }
  return null
}

export const scan = ({ file, source, root, exceptions = {} }) => {
  const { plain, bare } = analyze(source)
  const at = lineOf(source)
  const found = []
  const push = (index, rule, value) => found.push({ line: at(index), rule, value, reason: RULES[rule] })
  const home = ICON_HOMES.some(h => isUnder(file, h))

  for (const imp of importsOf(plain)) {
    if (ICON_LIBS.test(imp.spec)) push(imp.index, 'icon-lib', imp.spec)
    else if (imp.spec === 'lucide-react' && !home) push(imp.index, 'lucide-direct', imp.spec)
    // the legacy <Icon>: one finding per JSX use (or one for the import when it is passed some other way)
    const target = resolveImport(file, imp.spec)
    if (target && isUnder(target, LEGACY_ICON) && !isUnder(file, LEGACY_ICON) && target !== `${LEGACY_ICON}/brands` && !/\/(?:lucideRegistry|orderContextGlyphs)$|\/(?:brands|custom)(?:\/|$)/.test(target)) {
      for (const { local: name } of imp.bindings.filter(b => b.imported === 'Icon')) {
        const uses = [...bare.matchAll(new RegExp(`<${name}(?![\\w.])`, 'g'))]
        if (uses.length) uses.forEach(u => push(u.index, 'legacy-icon', `<${name}>`))
        else push(imp.index, 'legacy-icon', `import ${name}`)
      }
    }
  }
  if (!home) for (const m of bare.matchAll(/<svg(?![\w-])/g)) push(m.index, 'inline-svg', '<svg>')
  if (file === ENTRY && root && existsSync(path.join(root, ENTRY))) {
    const chain = entryReaches(root)
    if (chain) {
      const first = importsOf(plain).find(i => toFile(root, file, i.spec) === chain[1])
      push(first ? first.index : 0, 'entry-full-icon', chain.join(' -> '))
    }
  }
  return applyRuleExceptions(found, file, exceptions.icon)
}

export default {
  name: 'icon',
  baseline: true,
  exceptions: true,
  exactExceptionCounts: true,
  files: root => sourceFiles(root, DIRS, EXCLUDE),
  scan
}
