// Design guards: the ratchet engine shared by the four guards.
//
// A guard is { name, baseline: boolean, files(root), scan({ file, source, root, exceptions }) -> findings }.
// A finding is { rule, line, value, reason, exception? } (an `exception` id marks a recorded exception:
// it is not counted).
//
//  - A file NOT in the baseline may have ZERO findings: new code follows the rules from day one.
//  - A file in the baseline may not exceed its count PER RULE (it can only go down).
//  - A baseline entry above the real count fails as loose, and one whose file is gone as stale: the
//    baseline always equals reality, so a hand-raised number is caught. Fix with --update-baseline.
//  - --update-baseline never raises a count and never adds a file with findings, once the baseline exists.
//  - A guard without a baseline (ui-scope) tolerates nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSource } from './scan.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '../..')
export const BASELINE_DIR = path.join(HERE, 'baselines')
export const EXCEPTIONS_PATH = path.join(HERE, 'exceptions.json')

export const baselinePath = (guard, dir = BASELINE_DIR) => path.join(dir, `${guard.name}.json`)
export const loadExceptions = (file = EXCEPTIONS_PATH) => JSON.parse(readFileSync(file, 'utf8'))

/** { file: { rule: n } } or null when the guard has no baseline file yet. */
export const loadBaseline = (guard, dir = BASELINE_DIR) => {
  const file = baselinePath(guard, dir)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).files : null
}

const countRules = findings => findings.reduce((acc, f) => ({ ...acc, [f.rule]: (acc[f.rule] || 0) + 1 }), {})

const duplicateExceptionProblem = entries => {
  const filesById = new Map()
  for (const { id, file } of entries) {
    if (filesById.has(id)) return `duplicate exception ID ${id} in ${filesById.get(id)} and ${file}`
    filesById.set(id, file)
  }
  return null
}

/** Scan the guard's files (or given sources), counting matched occurrences by exception ID. */
export const collect = (guard, { root = ROOT, sources, exceptions = loadExceptions() } = {}) => {
  const files = sources ? Object.keys(sources) : guard.files(root)
  const found = {}
  const used = new Map()
  for (const file of files) {
    const source = sources ? sources[file] : readSource(root, file)
    const all = guard.scan({ file, source, root, exceptions })
    for (const f of all) if (f.exception) used.set(f.exception, (used.get(f.exception) ?? 0) + 1)
    found[file] = all.filter(f => !f.exception)
  }
  return { found, used, scanned: new Set(files) }
}

export const check = (guard, { root = ROOT, sources, baseline, baselineDir, exceptions = loadExceptions() } = {}) => {
  const entries = guard.exceptions ? exceptions[guard.name] ?? [] : []
  const duplicate = duplicateExceptionProblem(entries)
  if (duplicate) {
    return { ok: false, violations: [], loose: [], stale: [], unusedExceptions: [], problems: [duplicate], scanned: 0, total: 0, found: {} }
  }
  const { found, used, scanned } = collect(guard, { root, sources, exceptions })
  let base = {}
  const problems = []
  if (guard.baseline) {
    base = baseline ?? loadBaseline(guard, baselineDir)
    if (!base) { base = {}; problems.push(`no baseline for ${guard.name}: run --update-baseline once to seed it`) }
  }
  const violations = []
  const loose = []
  let total = 0
  for (const [file, findings] of Object.entries(found)) {
    total += findings.length
    const allowed = Object.hasOwn(base, file) ? base[file] : {}
    const counts = countRules(findings)
    for (const rule of Object.keys(counts)) {
      const over = counts[rule] - (allowed[rule] || 0)
      if (over > 0) for (const f of findings.filter(x => x.rule === rule).slice(allowed[rule] || 0)) violations.push({ file, ...f })
    }
    for (const rule of Object.keys(allowed)) {
      if ((counts[rule] || 0) < allowed[rule]) loose.push({ file, rule, allowed: allowed[rule], found: counts[rule] || 0 })
    }
  }
  // A run over given sources can only judge the files it was given.
  const stale = sources ? [] : Object.keys(base).filter(file => !scanned.has(file))
  for (const entry of entries) {
    if (sources && !scanned.has(entry.file)) continue
    const reason = typeof entry.reason === 'string' ? entry.reason.trim() : ''
    if (reason.length < 30) problems.push(`recorded exception ${entry.id} must have a reason of at least 30 characters`)
  }
  const recorded = sources ? [] : entries.filter(e => e.detected !== false)
  const unusedExceptions = recorded.filter(e => !used.has(e.id)).map(e => e.id)
  if (guard.exactExceptionCounts) {
    for (const entry of recorded) {
      const matched = used.get(entry.id)
      const count = entry.count ?? 1
      if (matched && matched < count) problems.push(`recorded exception ${entry.id} matches ${matched} of ${count}: reduce its count in scripts/design/exceptions.json`)
    }
  }
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const ok = !violations.length && !stale.length && !loose.length && !unusedExceptions.length && !problems.length
  return { ok, violations, loose, stale, unusedExceptions, problems, scanned: scanned.size, total, found }
}

export const format = (guard, r) => {
  const fix = `fix: node scripts/design/guard.mjs ${guard.name} --update-baseline`
  const lines = [
    ...r.problems.map(p => `FAIL ${p}`),
    ...r.violations.map(v => `FAIL ${v.file}:${v.line} ${guard.name}/${v.rule} ${v.value} (${v.reason})`),
    ...r.stale.map(f => `FAIL stale baseline entry, the file is gone (${fix}): ${f}`),
    ...r.loose.map(l => `FAIL loose baseline entry, ${l.rule} is ${l.allowed} but found ${l.found} (${fix}): ${l.file}`),
    ...r.unusedExceptions.map(id => `FAIL recorded exception ${id} no longer matches anything: remove it from scripts/design/exceptions.json`)
  ]
  lines.push(r.ok
    ? `${guard.name}-guard: OK (${r.scanned} files scanned, ${r.total} findings${guard.baseline ? ' within baseline' : ''})`
    : `${guard.name}-guard: FAILED (${r.violations.length} findings over baseline, ${r.stale.length} stale, ${r.loose.length} loose, ${r.unusedExceptions.length} unused exceptions)`)
  return lines.join('\n')
}

/**
 * Regenerate the baseline from reality. Fail-closed once it exists: refuses when a count would rise or a
 * file with findings is not already listed. `seed`: rules that are NEW in the guard (a rule added to its source in
 * this same change) may be written once as they are; design:ratchet accepts them only if the base guard has no such rule.
 * -> { ok, problems, files }
 */
export const updateBaseline = (guard, { root = ROOT, baselineDir = BASELINE_DIR, exceptions = loadExceptions(), seed = [] } = {}) => {
  const prior = loadBaseline(guard, baselineDir)
  const duplicate = guard.exceptions && duplicateExceptionProblem(exceptions[guard.name] ?? [])
  if (duplicate) return { ok: false, problems: [duplicate], files: prior }
  const { found } = collect(guard, { root, exceptions })
  const files = {}
  const problems = []
  for (const file of Object.keys(found).sort()) {
    const counts = countRules(found[file])
    if (!Object.keys(counts).length) continue
    const was = prior && Object.hasOwn(prior, file) ? prior[file] : null
    const old = Object.keys(counts).filter(rule => !seed.includes(rule))
    if (prior && was === null && old.length) { problems.push(`${file}: ${found[file].length} findings, not in the baseline (new code must have zero)`); continue }
    for (const rule of old) {
      if (was && counts[rule] > (was[rule] || 0)) problems.push(`${file}: ${rule} baseline has ${was[rule] || 0}, found ${counts[rule]} (would raise it)`)
    }
    files[file] = counts
  }
  if (problems.length) return { ok: false, problems, files: prior }
  mkdirSync(baselineDir, { recursive: true })
  const sorted = Object.fromEntries(Object.keys(files).sort().map(f => [f, Object.fromEntries(Object.keys(files[f]).sort().map(r => [r, files[f][r]]))]))
  writeFileSync(baselinePath(guard, baselineDir), `${JSON.stringify({ guard: guard.name, files: sorted }, null, 2)}\n`)
  return { ok: true, problems: [], files: sorted }
}

// ---- report: what part 2 (coherence per route) consumes ----

/** Who owns a file: a page, a component, a legacy primitive, the design system, or other shared code. */
export const areaOf = file => {
  let m
  if ((m = file.match(/^src\/pages\/([^/]+)/))) return `page:${m[1]}`
  if ((m = file.match(/^src\/ui\/src\/components\/([^/]+)/))) return `component:${m[1]}`
  if ((m = file.match(/^src\/ui\/src\/styles\/([^/]+)/))) return `style:${m[1]}`
  if (file.startsWith('src/ui/src/design-system/')) return 'design-system'
  if ((m = file.match(/^src\/components\/([^/]+)/))) return `app:${m[1]}`
  return 'other'
}

const folderOf = file => file.split('/').slice(0, file.startsWith('src/pages/') ? 3 : 5).join('/')

/**
 * One JSON for every guard: per file, per guard, the counts by rule (what counts is what is NOT in a
 * recorded exception) next to the baseline. Shared debt is listed once, under its own file: whoever
 * attributes it to routes decides who owns it (`area`), the report never repeats it per route.
 */
export const report = (guards, { root = ROOT, baselineDir, withFindings = false, exceptions } = {}) => {
  const files = {}
  const summary = {}
  for (const guard of guards) {
    const r = check(guard, { root, baselineDir, exceptions })
    const base = guard.baseline ? (loadBaseline(guard, baselineDir) || {}) : {}
    const byRule = {}
    const byFolder = {}
    for (const [file, findings] of Object.entries(r.found)) {
      if (!findings.length) continue
      const rules = countRules(findings)
      files[file] ??= { area: areaOf(file) }
      files[file][guard.name] = { total: findings.length, rules, baseline: base[file] || null, over: r.violations.some(v => v.file === file) }
      if (withFindings) files[file][guard.name].findings = findings.map(({ line, rule, value }) => ({ line, rule, value }))
      for (const [rule, n] of Object.entries(rules)) byRule[rule] = (byRule[rule] || 0) + n
      byFolder[folderOf(file)] = (byFolder[folderOf(file)] || 0) + findings.length
    }
    summary[guard.name] = { ok: r.ok, total: r.total, files: Object.values(r.found).filter(f => f.length).length, scanned: r.scanned, byRule, byFolder }
  }
  return { schema: 'design-guards/1', summary, files }
}
