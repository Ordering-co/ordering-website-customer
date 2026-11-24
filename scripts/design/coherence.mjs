// Design coherence per route (implementation notes, phase 3): does a route's OWN code look designed?
//
//   node scripts/design/coherence.mjs [--check | --write-audit | --report] [--from-report file] [--out file]
//
//   --check            (default) fail when the total of a guard (own + shared + unreached) is not the sum of that guard's baseline
//                      (baselines/{literal,icon,pieces}.json; coherence has no baseline file of its own: `pnpm design:baseline` lowers them)
//   --write-audit      write docs/DESIGN_COHERENCE_AUDIT.md and docs/design-coherence-audit.json from the current code
//   --report           the analysis as JSON on stdout (or --out)
//   --from-report f    use a saved `guard.mjs all --report` file instead of running the guards in-process
//
// The input is the report of the four guards (engine.report, the same JSON as `guard.mjs --report`): this file
// never scans a style or a literal itself. It only adds the graph: which files a route reaches, and who owns them.
//
//  - A route (a "flow" below: store, cart, checkout...) starts at its pages (read from src/App.js) and at its
//    `surfaces`: components that are not a page but that other routes only OPEN (the login modal, the cart
//    popover, the product modal). Its imports are followed through src/pages, src/components and
//    src/ui/src/{components,styles}.
//  - A surface belongs to its flow: its folder is that flow's own, and another flow that opens it is not
//    followed into it (a link, not a dependency). Without that, the login form would be "shared by every route"
//    and no route would answer for it.
//  - Any other file reached by ONE flow is that flow's own. A file reached by 2+ flows is shared debt: reported
//    once, by piece, never inside a route. The shell (Header, NavigationBar, Footer, App.js) is mounted on every
//    route, so it does not compete for ownership: a file reached by the shell and by one flow is that flow's.
//    The shell also starts at what src/App.js mounts directly (QueryLoginSpoonity, the Modal, the Alert...), except the
//    pages, which belong to their flows.
//  - The base pieces (src/ui/src/design-system) are the clean foundation: never own, never shared debt, never
//    followed. `base` counts the own files that import one.
//  - The submodule (src/@/components) is outside this repo and is never followed (see `submodule` in the audit).
//
// shortcut: a file under src/utils, src/contexts or src/ui/{utils,hooks,contexts} is infrastructure with no markup
// to judge, so it is not followed: a context that renders a component of the UI tree would hide it. Upgrade the
// walker if that ever appears.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { areaOf, BASELINE_DIR, loadBaseline, report as guardReport, ROOT } from './engine.mjs'
import { GUARDS } from './guard.mjs'
import { analyze as scanSource, importsOf, isUnder, readSource, resolveImport, sourceFiles } from './scan.mjs'

export const AUDIT_MD = path.join(ROOT, 'docs/DESIGN_COHERENCE_AUDIT.md')
export const AUDIT_JSON = path.join(ROOT, 'docs/design-coherence-audit.json')

const GUARD_NAMES = ['literal', 'icon', 'pieces', 'ui-scope']
const BASE_DIR = 'src/ui/src/design-system'
const SHELL = 'shell'
const OTHER = 'other'

// ---- the routes: which pages and which non-page components make each flow --------------------------------
// The paths of a flow are read from src/App.js; this table only says which page belongs to which flow (a page
// missing here fails --check: map it). `surfaces` are components that are not a page and that other routes only open.
export const FLOWS = {
  store: { label: 'Tienda', pages: ['BusinessProductsList'], surfaces: ['ProductForm'] },
  cart: { label: 'Carrito', pages: ['MultiCart'], surfaces: ['Cart', 'CartContent', 'CartPopover', 'CartSidebar', 'MultiCart'] },
  checkout: { label: 'Checkout', pages: ['Checkout', 'MultiCheckout'] },
  order: {
    label: 'Confirmación y detalle del pedido',
    pages: ['OrderDetails', 'MultiOrdersDetails'],
    surfaces: ['OrderDetails', 'MultiOrdersDetails', 'OrderSuccessModal', 'CancellationComponent', 'ReviewTrigger', 'ReviewOrder', 'ReviewProduct', 'ReviewDriver']
  },
  profile: {
    label: 'Perfil',
    pages: ['Profile', 'AddressList', 'SavedCards', 'Wallets', 'Favorite', 'SessionsList', 'MessagesList', 'Help', 'CompleteProfile']
  },
  'my-orders': { label: 'Mis pedidos', pages: ['MyOrders'], surfaces: ['MyOrders'] },
  auth: {
    label: 'Login y registro',
    pages: ['ResetPassword', 'UserVerification', 'SignUpBusiness', 'SignUpDriver'],
    surfaces: ['LoginForm', 'SignUpForm', 'ForgotPasswordForm', 'VerifyCodeForm', 'SignUpApproval']
  },
  search: { label: 'Búsqueda', pages: ['BusinessesList', 'BusinessListingSearch', 'Promotions'] },
  home: { label: 'Marketplace y home', pages: ['Home', 'Landing'] },
  [OTHER]: { label: 'Otras páginas (CMS, 404, seguimiento, tienda privada)', pages: ['PagesList', 'Cms', 'PageNotFound', 'TrackingHome', 'StorePrivate'], appComponents: ['TrackingOnlyRoutes'] },
  [SHELL]: {
    label: 'Carcasa (cabecera, navegación, pie, App.js)',
    surfaces: ['Header', 'HeaderOption', 'NavigationBar', 'Footer', 'SidebarMenu', 'SmartAppBanner', 'PWAPrompt', 'CookieConsentBanner', 'NotNetworkConnectivity', 'WebsocketStatus', 'SpinnerLoader', 'PostLoginHomeGate'],
    appComponents: ['IntercomWrapper'],
    styles: ['Toast'],
    files: ['src/App.js']
  }
}

// ---- the verdict ------------------------------------------------------------------------------------------
// Counted over the route's OWN files, every guard together (a finding is one thing the guards flag).
//   coherent: no finding.
//   legacy:   widespread AND heavy: half or more of the own files carry debt (share >= LEGACY_SHARE) and there are
//             LEGACY_DENSITY or more findings per own file. One bad file in a clean route is not a legacy route.
//   partial:  anything in between.
export const THRESHOLDS = { LEGACY_SHARE: 0.5, LEGACY_DENSITY: 3 }
export const RANK = { coherent: 0, partial: 1, legacy: 2 }

export const verdictOf = ({ files, debtFiles, findings }, t = THRESHOLDS) => {
  if (!findings) return 'coherent'
  if (debtFiles / Math.max(files, 1) >= t.LEGACY_SHARE && findings / Math.max(files, 1) >= t.LEGACY_DENSITY) return 'legacy'
  return 'partial'
}

// ---- the graph --------------------------------------------------------------------------------------------

const inScope = f => /^src\/(?:pages|components)\//.test(f) || /^src\/ui\/src\/(?:components|styles)\//.test(f)
const EXPORT_FROM = /\bexport\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(['"])([^'"]+)\1/g
const SUBMODULE = 'src/@/components/src'

const fileOf = (root, target) => ['.js', '.jsx', '/index.js', '/index.jsx'].map(e => target + e).find(f => existsSync(path.join(root, f))) ?? null

/** Edges of one file: { follow: [repo files in scope], base: bool, submodule: [submodule files] }. */
const edgesOf = (root, file) => {
  const { plain } = scanSource(readSource(root, file))
  const specs = [...importsOf(plain).map(i => i.spec), ...[...plain.matchAll(EXPORT_FROM)].map(m => m[2])]
  const out = { follow: new Set(), base: false, submodule: new Set() }
  for (const spec of specs) {
    if (spec.startsWith('~components/')) {
      const sub = fileOf(root, `${SUBMODULE}/${spec.slice('~components/'.length)}`)
      if (sub) out.submodule.add(sub)
      continue
    }
    const target = resolveImport(file, spec)
    const resolved = target && fileOf(root, target)
    if (!resolved) continue
    if (isUnder(resolved, BASE_DIR)) out.base = true
    else if (inScope(resolved)) out.follow.add(resolved)
  }
  return out
}

/** Every file reachable from `entries` (included), through in-scope imports, not into a file `skip` rejects. -> Map(file -> edges) */
const reach = (root, entries, cache, skip) => {
  const seen = new Map()
  const queue = [...entries]
  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    if (!cache.has(file)) cache.set(file, edgesOf(root, file))
    const edges = cache.get(file)
    seen.set(file, edges)
    queue.push(...[...edges.follow].filter(f => !skip(f)))
  }
  return seen
}

/** The pages and paths of src/App.js: [{ path, pages: [dir] }] and the page dir of each loadable. */
export const routesOf = (root = ROOT) => {
  const app = scanSource(readSource(root, 'src/App.js')).plain
  const pageOf = {}
  for (const m of app.matchAll(/\bconst\s+(\w+)\s*=\s*loadable\([^\n]*?import\(\s*(['"])\.\/pages\/(\w+)\2/g)) pageOf[m[1]] = m[3]
  const routes = []
  for (const m of app.matchAll(/<Route\s+(?:exact\s+)?path=(['"])([^'"]+)\1\s*>([\s\S]*?)<\/Route>/g)) {
    const pages = [...new Set([...m[3].matchAll(/<([A-Z]\w*)/g)].map(x => pageOf[x[1]]).filter(Boolean))]
    if (pages.length) routes.push({ path: m[2], pages })
  }
  // every folder of src/pages counts, routed or not (TrackingHome is rendered by TrackingOnlyRoutes, not by a <Route>)
  const dirs = readdirSync(path.join(root, 'src/pages'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  return { routes, pages: [...new Set([...Object.values(pageOf), ...dirs])] }
}

const pieceOf = file => {
  const area = areaOf(file)
  return area === 'other' ? path.posix.dirname(file) : area
}

const zero = () => Object.fromEntries(GUARD_NAMES.map(g => [g, 0]))
const sum = (files, guards) => {
  const by = zero()
  const rules = {}
  for (const f of files) {
    for (const g of GUARD_NAMES) {
      const r = guards[f]?.[g]
      if (!r) continue
      by[g] += r.total
      for (const [rule, n] of Object.entries(r.rules)) rules[rule] = (rules[rule] || 0) + n
    }
  }
  return { by, rules, total: Object.values(by).reduce((a, b) => a + b, 0) }
}

/** What the submodule is, measured: why its files are not followed or judged. */
export const submoduleEvidence = root => {
  const files = sourceFiles(root, [SUBMODULE])
  const styled = []
  const dom = []
  for (const f of files) {
    const { plain, bare } = scanSource(readSource(root, f))
    if (/from\s*['"]styled-components['"]/.test(plain)) styled.push(f)
    if (/<(?:div|span|button|input|svg|img|ul|li|a|p|h[1-6]|form|label|select|table|iframe)[\s/>]/.test(bare)) dom.push(f)
  }
  return { files: files.length, styled: styled.length, dom }
}

/**
 * -> { flows, shared, unreached, submodule, totals, unmappedPages, owners }
 * `guards`: the JSON of `guard.mjs --report` (default: run the guards in-process, the same function).
 */
export const analyze = ({ root = ROOT, guards, flows = FLOWS } = {}) => {
  const rep = guards ?? guardReport(GUARDS, { root })
  const byFile = rep.files
  const { routes, pages } = routesOf(root)
  const cache = new Map()

  const pageFlow = {}
  for (const [id, def] of Object.entries(flows)) for (const p of def.pages ?? []) pageFlow[p] = id
  const unmappedPages = pages.filter(p => !pageFlow[p]).sort()

  const entryFile = t => {
    const file = fileOf(root, t)
    if (!file) throw new Error(`coherence: entry ${t} of a flow does not exist (update FLOWS)`)
    return file
  }
  const surfaceDir = c => `src/ui/src/components/${c}`
  const entryFiles = def => [
    ...(def.pages ?? []).map(p => `src/pages/${p}`),
    ...(def.surfaces ?? []).map(surfaceDir),
    ...(def.appComponents ?? []).map(c => `src/components/${c}`),
    ...(def.styles ?? []).map(c => `src/ui/src/styles/${c}`)
  ].map(entryFile)

  // a surface belongs to its flow: its folder is that flow's, and no other flow is followed into it
  const claims = Object.entries(flows).flatMap(([id, def]) => (def.surfaces ?? []).map(c => [surfaceDir(c), id]))
  const claimOf = f => claims.find(([dir]) => isUnder(f, dir))?.[1]

  const reached = {}
  for (const [id, def] of Object.entries(flows)) {
    // `files` (App.js) are entries too: what they import is reached, but a page is the flow's, not the shell's
    const skip = f => { const c = claimOf(f); return (c !== undefined && c !== id) || (id === SHELL && isUnder(f, 'src/pages')) }
    reached[id] = reach(root, [...entryFiles(def), ...(def.files ?? []).map(f => entryFile(f.replace(/\.js$/, '')))], cache, skip)
  }
  const ownable = f => !isUnder(f, BASE_DIR)
  const competitors = f => Object.keys(flows).filter(id => id !== SHELL && reached[id].has(f))
  const owner = new Map()
  const sharedFiles = new Map()
  const all = new Set(Object.values(reached).flatMap(m => [...m.keys()]))
  for (const f of all) {
    if (!ownable(f)) continue
    const c = competitors(f)
    if (claimOf(f)) owner.set(f, claimOf(f))
    else if (c.length > 1) sharedFiles.set(f, c)
    else owner.set(f, c[0] ?? SHELL)
  }
  // the shell's App.js is a file of the shell, not a file it reaches
  if (flows[SHELL]) for (const f of flows[SHELL].files ?? []) owner.set(f, SHELL)

  const result = {}
  for (const [id, def] of Object.entries(flows)) {
    const own = [...owner].filter(([, o]) => o === id).map(([f]) => f).sort()
    const { by, rules, total } = sum(own, byFile)
    const reachShared = [...sharedFiles].filter(([, c]) => c.includes(id)).map(([f]) => f)
    const dirs = {}
    for (const f of own) { const n = sum([f], byFile).total; if (n) dirs[path.posix.dirname(f)] = (dirs[path.posix.dirname(f)] || 0) + n }
    const stat = { files: own.length, debtFiles: own.filter(f => sum([f], byFile).total).length, findings: total }
    result[id] = {
      label: def.label,
      paths: routes.filter(r => r.pages.some(p => pageFlow[p] === id)).map(r => r.path),
      entries: entryFiles(def),
      own: own.length,
      debtFiles: stat.debtFiles,
      findings: by,
      total,
      rules,
      base: { own: own.filter(f => cache.get(f)?.base).length, shared: reachShared.filter(f => cache.get(f)?.base).length },
      dirs: Object.fromEntries(Object.entries(dirs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
      sharedReached: { files: reachShared.length, findings: sum(reachShared, byFile).total, rules: sum(reachShared, byFile).rules },
      verdict: verdictOf(stat)
    }
  }

  const pieces = {}
  for (const [f, c] of sharedFiles) {
    const piece = (pieces[pieceOf(f)] ??= { files: [], flows: new Set() })
    piece.files.push(f)
    c.forEach(x => piece.flows.add(x))
  }
  const shared = Object.entries(pieces).map(([piece, p]) => {
    const { by, rules, total } = sum(p.files, byFile)
    return { piece, files: p.files.length, flows: [...p.flows].sort(), findings: by, rules, total }
  }).filter(p => p.total).sort((a, b) => b.total - a.total || a.piece.localeCompare(b.piece))

  // findings in files no flow reaches: orphans, or reached only from App.js outside the entries above
  const placed = new Set([...owner.keys(), ...sharedFiles.keys()])
  const orphan = Object.keys(byFile).filter(f => !placed.has(f) && !isUnder(f, BASE_DIR))
  const unreachedSum = sum(orphan, byFile)
  const unreachedPieces = {}
  const unreachedFiles = {}
  for (const f of orphan) { const n = sum([f], byFile).total; if (n) { unreachedFiles[f] = n; unreachedPieces[pieceOf(f)] = (unreachedPieces[pieceOf(f)] || 0) + n } }

  const ev = submoduleEvidence(root)
  const imports = {}
  for (const [file, e] of cache) if (inScope(file) || file === 'src/App.js') for (const sub of e.submodule) { const top = sub.replace(`${SUBMODULE}/`, '').split('/')[0]; imports[top] = (imports[top] || 0) + 1 }
  const consumers = Object.fromEntries(ev.dom.map(d => [d, Object.entries(flows).map(([id]) => id).filter(id => [...reached[id].values()].some(e => e.submodule.has(d)))]))

  const totals = Object.fromEntries(GUARD_NAMES.map(g => [g, rep.summary[g]?.total ?? 0]))
  return {
    flows: result,
    shared,
    unreached: { files: Object.keys(unreachedFiles).length, findings: unreachedSum.by, total: unreachedSum.total, pieces: unreachedPieces, list: unreachedFiles },
    submodule: { files: ev.files, styledImporters: ev.styled, importsByFolder: imports, withDomTags: Object.fromEntries(Object.entries(consumers).map(([f, c]) => [f.replace(`${SUBMODULE}/`, ''), c])) },
    totals,
    unmappedPages,
    // who has each file (for tools that group by folder; not part of the audit JSON)
    owners: { own: Object.fromEntries(owner), shared: Object.fromEntries(sharedFiles) }
  }
}

// ---- the ratchet ------------------------------------------------------------------------------------------

/** The total per guard of the guards' own baselines (the sum of every file and rule); null if one is missing. ui-scope has none: 0. */
export const baselineTotals = (dir = BASELINE_DIR) => {
  const totals = {}
  for (const g of GUARDS) {
    const files = g.baseline ? loadBaseline(g, dir) : {}
    if (!files) return null
    totals[g.name] = Object.values(files).reduce((n, rules) => n + Object.values(rules).reduce((a, b) => a + b, 0), 0)
  }
  return totals
}

/**
 * What the ratchet compares: per guard, everything the guards find (own + shared + unreached). Moving a file
 * from one route to another, or from a route to the shared pieces, changes who answers for it and never this total.
 */
export const totalsOf = result => Object.fromEntries(GUARD_NAMES.map(g => [g, Object.values(result.flows).reduce((n, f) => n + f.findings[g], 0) +
  result.shared.reduce((n, s) => n + s.findings[g], 0) + result.unreached.findings[g]]))

/**
 * The total of a guard may not go up (a baseline above reality is loose). The per-route verdict is informative:
 * a route's own debt rises when a file stops being shared and falls when it starts to be, with no change in the
 * code, so gating it fails refactors; a real regression is a higher total, and the per-file guards already hold it.
 * A page of src/App.js that no flow lists is a problem: it would hide its debt from the audit.
 */
export const checkCoherence = (result, baseline) => {
  const problems = []
  const violations = []
  const loose = []
  if (!baseline) problems.push('no baseline for coherence: scripts/design/baselines/{literal,icon,pieces}.json are missing (pnpm design:baseline)')
  for (const page of result.unmappedPages) problems.push(`page ${page} of src/App.js is in no flow: add it to FLOWS in scripts/design/coherence.mjs`)
  const totals = totalsOf(result)
  for (const g of GUARD_NAMES) {
    const allowed = baseline?.[g]
    if (allowed === undefined) continue
    if (totals[g] > allowed) violations.push({ kind: 'total-up', guard: g, from: allowed, to: totals[g] })
    else if (totals[g] < allowed) loose.push({ guard: g, allowed, found: totals[g] })
  }
  const verdicts = Object.fromEntries(Object.entries(result.flows).map(([id, f]) => [id, f.verdict]))
  return { ok: !problems.length && !violations.length && !loose.length, problems, violations, loose, totals, verdicts, scanned: Object.keys(result.flows).length }
}

const FIX = 'pnpm design:baseline'
export const formatCoherence = r => {
  const lines = [
    ...r.problems.map(p => `FAIL ${p}`),
    ...r.violations.map(v => `FAIL ${v.guard} findings (own + shared + unreached) ${v.from} -> ${v.to}`),
    ...r.loose.map(l => `FAIL loose baseline entry, ${l.guard} is ${l.allowed} but found ${l.found} (${FIX})`)
  ]
  lines.push(r.ok
    ? `coherence: OK (${GUARD_NAMES.map(g => `${g} ${r.totals[g]}`).join(', ')} within baseline)`
    : `coherence: FAILED (${r.problems.length} problems, ${r.violations.length} over baseline, ${r.loose.length} loose)`)
  lines.push(`verdicts (informative, not gated): ${Object.entries(r.verdicts).map(([id, v]) => `${id} ${v}`).join(', ')}`)
  return lines.join('\n')
}

// ---- the audit --------------------------------------------------------------------------------------------

const GUARD_COLUMNS = [['literal', 'Literales'], ['icon', 'Iconos'], ['pieces', 'Piezas'], ['ui-scope', 'ui:']]
const LEGACY_RULES = {
  'legacy-buttons': 'Buttons antiguo (`styles/Buttons`)',
  'legacy-inputs': 'Inputs antiguo (`styles/Inputs`)',
  'legacy-overlay': 'Modal / BottomSheet antiguos',
  'native-button': '`<button>` nativo',
  'native-input': '`<input>` nativo',
  'restyled-piece': '`styled()` sobre una pieza base',
  'legacy-icon': '`<Icon>` antiguo (registro react-icons)',
  'icon-lib': 'react-icons y otras librerías de iconos',
  'inline-svg': '`<svg>` en línea',
  'lucide-direct': 'lucide-react directo',
  px: 'px escritos',
  duration: 'ms/s escritos',
  hex: 'hex escritos',
  rgb: 'rgb/hsl escritos',
  rem: 'rem escritos',
  font: 'familias tipográficas escritas',
  'computed-color': 'colores calculados',
  'ui-class': 'clases `ui:` fuera de la carpeta compilada'
}

/** Findings by rule across everything the guards report, split by who owns them. */
const rulesByOwner = result => {
  const out = {}
  const row = rule => (out[rule] ??= { own: 0, shared: 0, routes: 0 })
  for (const f of Object.values(result.flows)) {
    for (const [rule, n] of Object.entries(f.rules)) row(rule).own += n
    for (const rule of new Set([...Object.keys(f.rules), ...Object.keys(f.sharedReached.rules)])) row(rule).routes++
  }
  for (const s of result.shared) for (const [rule, n] of Object.entries(s.rules)) row(rule).shared += n
  return out
}

export const buildJson = (result, generatedAt) => {
  const own = Object.values(result.flows).reduce((n, f) => n + f.total, 0)
  const shared = result.shared.reduce((n, s) => n + s.total, 0)
  return {
    schema: 'design-coherence/1',
    generatedBy: 'pnpm design:coherence --write-audit',
    generatedAt,
    thresholds: THRESHOLDS,
    totals: { ...result.totals, own, shared, unreached: result.unreached.total },
    routes: Object.fromEntries(Object.entries(result.flows).map(([id, f]) => [id, f])),
    sharedDebt: result.shared,
    unreached: result.unreached,
    submodule: result.submodule
  }
}

const n = x => String(x)
const today = () => new Date().toLocaleDateString('sv')
export const buildMarkdown = (result, generatedAt) => {
  const flows = Object.entries(result.flows)
  const count = v => flows.filter(([, f]) => f.verdict === v).length
  const own = flows.reduce((a, [, f]) => a + f.total, 0)
  const shared = result.shared.reduce((a, s) => a + s.total, 0)
  const grand = own + shared + result.unreached.total
  const L = [
    '<!-- Generated by `pnpm design:coherence --write-audit`. Do not edit by hand. -->',
    '# Auditoría de coherencia de diseño por ruta',
    '',
    `Generada el ${generatedAt} por \`scripts/design/coherence.mjs\` (implementation notes, fase 3) a partir del informe de las cuatro guardas (\`node scripts/design/guard.mjs all --report\`). Es una foto del código, no una prueba de qué está desplegado.`,
    '',
    '## Resumen',
    '',
    `- ${flows.length} rutas: ${count('coherent')} coherentes, ${count('partial')} parciales, ${count('legacy')} legadas.`,
    grand === 0
      ? '- 0 hallazgos en total.'
      : `- ${grand} hallazgos en total: ${own} en archivos propios de una ruta (${Math.round(100 * own / grand)} %), ${shared} en deuda compartida (${Math.round(100 * shared / grand)} %) y ${result.unreached.total} en archivos que ninguna ruta alcanza.`,
    '- Una ruta se juzga solo por sus archivos propios. Un archivo que alcanzan dos o más rutas es deuda compartida y se cuenta una sola vez, abajo, nunca dentro de una ruta.',
    '',
    '## Veredicto por ruta',
    '',
    `Veredicto sobre los archivos propios, con las cuatro guardas juntas: **coherent** si no hay hallazgos; **legacy** si la deuda es amplia y pesada a la vez (el ${THRESHOLDS.LEGACY_SHARE * 100} % o más de los archivos propios la tienen y hay ${THRESHOLDS.LEGACY_DENSITY} o más hallazgos por archivo propio); **partial** en medio.`,
    '',
    '| Ruta | Veredicto | Archivos propios | Con deuda | Literales | Iconos | Piezas | `ui:` | Pieza base (propios + compartidos) | Deuda compartida que alcanza |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ]
  for (const [, f] of flows) L.push(`| ${f.label} | ${f.verdict} | ${n(f.own)} | ${n(f.debtFiles)} | ${GUARD_COLUMNS.map(([g]) => f.findings[g]).join(' | ')} | ${f.base.own} + ${f.base.shared} | ${f.sharedReached.findings} (${f.sharedReached.files} archivos) |`)
  L.push('', 'Rutas de `src/App.js` por flujo:', '')
  for (const [, f] of flows) if (f.paths.length) L.push(`- ${f.label}: ${f.paths.map(p => `\`${p}\``).join(', ')}`)
  L.push('', '## Dónde está la deuda propia de cada ruta', '', 'Carpetas de archivos propios con hallazgos (hallazgos entre paréntesis).', '')
  for (const [, f] of flows) {
    const dirs = Object.entries(f.dirs)
    if (dirs.length) L.push(`- **${f.label}**: ${dirs.slice(0, 12).map(([d, c]) => `\`${d.replace('src/ui/src/', '')}\` (${c})`).join(', ')}${dirs.length > 12 ? `, y ${dirs.length - 12} más` : ''}`)
  }
  L.push('', '## Deuda compartida', '', 'Piezas (carpetas) con hallazgos que alcanzan dos o más rutas. Cada una cuenta una sola vez.', '', '| Pieza | Rutas | Archivos | Hallazgos | Literales | Iconos | Piezas |', '| --- | --- | --- | --- | --- | --- | --- |')
  for (const s of result.shared.slice(0, 30)) L.push(`| \`${s.piece}\` | ${s.flows.length} | ${s.files} | ${s.total} | ${s.findings.literal} | ${s.findings.icon} | ${s.findings.pieces} |`)
  if (result.shared.length > 30) L.push(`| … ${result.shared.length - 30} piezas más (ver el JSON) | | | | | | |`)
  L.push('', '### Por pieza o primitiva antigua', '', 'Hallazgos por regla de las guardas, según quién los posee (sin contar los de archivos sin ruta). «Rutas» son las rutas que tienen la regla en sus archivos propios o en una pieza compartida que alcanzan.', '', '| Regla | Propios | Compartidos | Total | Rutas |', '| --- | --- | --- | --- | --- |')
  const byRule = rulesByOwner(result)
  for (const [rule, v] of Object.entries(byRule).sort((a, b) => b[1].own + b[1].shared - a[1].own - a[1].shared)) L.push(`| ${LEGACY_RULES[rule] || rule} (\`${rule}\`) | ${v.own} | ${v.shared} | ${v.own + v.shared} | ${v.routes} |`)
  const u = result.unreached
  L.push('', '### Sin ruta', '', `${u.total} hallazgos en ${u.files} archivos que ninguna ruta alcanza (componentes huérfanos, o alcanzados solo por el barril \`src/ui/index.js\` o por código fuera del grafo).`)
  const up = Object.entries(u.pieces).sort((a, b) => b[1] - a[1]).slice(0, 12)
  if (up.length) L.push('', up.map(([p, c]) => `\`${p}\` (${c})`).join(', '))
  const sub = result.submodule
  const dom = Object.entries(sub.withDomTags)
  const imported = Object.values(sub.importsByFolder).reduce((a, b) => a + b, 0)
  L.push(
    '', '## Método', '',
    '1. Entrada: el informe de las guardas (`literal`, `icon`, `pieces`, `ui-scope`), por archivo y regla. Este script no vuelve a escanear estilos.',
    '2. Rutas: las de `src/App.js` (`<Route path>` → página cargada con `loadable`), agrupadas en flujos por la tabla `FLOWS` de `scripts/design/coherence.mjs`. Los flujos añaden como entradas los componentes que no son página (el modal de login, el popover del carrito). Una página de `App.js` sin flujo hace fallar `--check`.',
    '3. Grafo: desde las entradas de cada flujo se siguen los imports (estáticos, dinámicos y `export … from`) por `src/pages`, `src/components` y `src/ui/src/{components,styles}`.',
    '4. Propiedad: un archivo que alcanza un solo flujo es suyo. Si lo alcanzan dos o más, es deuda compartida. La carcasa (Header, NavigationBar, Footer y `App.js`) está montada en todas las rutas: no compite por la propiedad, así que un archivo que alcanzan la carcasa y un flujo es del flujo.',
    '5. Piezas base (`src/ui/src/design-system`): son la base limpia. No son de nadie, no cuentan como deuda y no se siguen; «Pieza base» cuenta los archivos propios y los compartidos alcanzados que importan una.',
    `6. Submódulo (\`src/@/components\`, fuera de este repo): no se sigue ni se juzga. Evidencia medida: ${sub.files} archivos de código, ${sub.styledImporters} importan styled-components y ${dom.length} tienen etiquetas DOM. Este repo lo importa desde ${imported} puntos (${Object.entries(sub.importsByFolder).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}): contextos, controladores y utilidades que renderizan el \`UIComponent\` de este repo, así que casi no hay marcado propio que juzgar. Los archivos con etiquetas DOM son deuda de \`ordering-components\`, no de una ruta, y se anotan en implementation notes${dom.map(([f, c]) => `\`${f}\` (${c.join(', ') || 'sin ruta'})`).join('; ') || 'ninguno'}.`,
    '7. Línea base: la suma de las líneas base por archivo de cada guarda (`scripts/design/baselines/{literal,icon,pieces}.json`), contra el total por guarda, propio + compartido + sin ruta. Un total no puede subir y uno por encima de la realidad (flojo) también falla; no hay un archivo de línea base propio, así que dos sesiones que bajan archivos distintos no chocan, y `pnpm design:baseline` solo baja. El veredicto por ruta es informativo y no bloquea: la deuda propia de una ruta sube o baja cuando un archivo deja de ser compartido o empieza a serlo, sin cambiar el código, y bloquearla falla las refactorizaciones; una regresión real es un total más alto, y las líneas base por archivo de las guardas la frenan donde ocurre.',
    '', '## Límites', '',
    '- Las guardas miden lo que pueden ver (literales, iconos, piezas base, `ui:`). Un veredicto `coherent` no prueba que la pantalla se vea bien en cada tema ni que el flujo no tenga callejones sin salida (`order-flows.md`): eso se revisa en navegador.',
    // eslint-disable-next-line no-template-curly-in-string -- the text is the literal `${…}px`
    '- Falsos negativos conocidos de la guarda de literales (lista completa en `docs/design-system/guards.md`): una interpolación con la unidad fuera (`${…}px`), un color con nombre dentro de una interpolación o como prop (`color=\'red\'`; el que sigue a una propiedad de color sí se cuenta), `em`, los números sin unidad, la familia de un `font:` abreviado (se ve su tamaño en px, no la familia) y los números JS en estilos en línea (`style={{ width: 40 }}`). El recuento es un mínimo.',
    '- La propiedad depende del grafo de imports. Un archivo pasa de propio a compartido cuando una segunda ruta lo importa, y entonces baja la deuda de la ruta sin que el código mejore: por eso el veredicto no bloquea y la línea base es el total (propio + compartido + sin ruta).',
    '- Una superficie pertenece a su flujo aunque otra ruta la renderice en línea: `Checkout` renderiza `Cart` y `CartContent` (y `MultiCheckout`, `Cart`), y esa deuda cuenta en Carrito, no en Checkout. Quien lea el veredicto de Checkout debe leer también el de Carrito.',
    '- Un archivo en `src/utils`, `src/contexts` o `src/ui/{utils,hooks,contexts}` no se sigue. La carcasa sí sigue lo que `App.js` importa, salvo las páginas; un componente que solo monte otro archivo fuera de ese grafo cae en «Sin ruta».',
    '- La auditoría es una foto: se regenera con `pnpm design:coherence --write-audit` y no se comprueba en CI. Lo que obliga en CI es `--check`.',
    ''
  )
  return L.join('\n')
}

// ---- CLI --------------------------------------------------------------------------------------------------

const main = () => {
  const args = process.argv.slice(2)
  const val = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
  const guards = val('--from-report') ? JSON.parse(readFileSync(path.resolve(val('--from-report')), 'utf8')) : undefined
  const result = analyze({ guards })

  if (args.includes('--report')) {
    const json = `${JSON.stringify(buildJson(result, today()), null, 2)}\n`
    if (val('--out')) writeFileSync(path.resolve(val('--out')), json)
    else process.stdout.write(json)
    return
  }
  if (args.includes('--write-audit')) {
    const date = today()
    writeFileSync(AUDIT_MD, buildMarkdown(result, date))
    writeFileSync(AUDIT_JSON, `${JSON.stringify(buildJson(result, date), null, 2)}\n`)
    console.log(`wrote ${path.relative(ROOT, AUDIT_MD)} and ${path.relative(ROOT, AUDIT_JSON)}`)
    return
  }
  if (args.includes('--update-baseline')) { console.error('coherence has no baseline of its own: pnpm design:baseline lowers the three guards\' baselines, which are the sum it checks'); process.exit(2) }
  const r = checkCoherence(result, baselineTotals())
  console.log(formatCoherence(r))
  process.exit(r.ok ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
