// Design baselines against main: the ratchet of the ratchet.
//
//   node scripts/design/baseline-ratchet.mjs [--base <ref>] [--allow-entry-growth]     (pnpm design:ratchet)
//
// `design:check` proves the baselines equal the code, not that nobody raised one by hand: a raised number plus
// code that really has that many findings passes it. This compares the baselines of the TREE (the working copy,
// so an uncommitted edit counts) with the ones at `git merge-base HEAD <base>` (default origin/main) and fails when:
//
//   - the total of a rule in scripts/design/baselines/{literal,icon,pieces}.json went up (a file moving its
//     findings to another keeps the total, so a refactor passes; a raised or new entry does not);
//   - scripts/design/exceptions.json has an exception with no reason (new, or an old one that lost it);
//     a new exception with a reason, or one that exempts more occurrences (`count`), passes but is printed: it needs
//     Sergio's approval in the PR (design-system.md);
//   - scripts/entry-size.baseline.json went up (`--allow-entry-growth` accepts it: a deliberate growth is the
//     decision of whoever reviews the PR that adds the flag to the CI step);
//   - a baseline that exists in the base is gone from the tree.
//
// A file that does not exist in the base is accepted as new. If the base ref is missing, it is fetched; if there
// is still no common history (a shallow clone: actions/checkout needs `fetch-depth: 0`) it fails with that message.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const DEFAULT_BASE = 'origin/main'
const BASELINES = 'scripts/design/baselines'
// retired: coherence --check sums the three guard baselines now; a base that still has the file is not compared with it
const COHERENCE = `${BASELINES}/coherence.json`
const EXCEPTIONS = 'scripts/design/exceptions.json'
const ENTRY = 'scripts/entry-size.baseline.json'

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim()
const tryGit = (root, ...args) => { try { return git(root, ...args) } catch { return null } }

/** The commit to compare with: the merge-base of HEAD and `base`, fetching the ref if it is not there. */
export const mergeBase = (root, base = DEFAULT_BASE) => {
  if (tryGit(root, 'rev-parse', '--verify', '--quiet', `${base}^{commit}`) === null) {
    const [remote, ...branch] = base.split('/')
    if (branch.length && tryGit(root, 'remote', 'get-url', remote) !== null) {
      const shallow = tryGit(root, 'rev-parse', '--is-shallow-repository') === 'true'
      tryGit(root, 'fetch', '--no-tags', '--quiet', ...(shallow ? ['--depth=200'] : []), remote, branch.join('/'))
    }
    if (tryGit(root, 'rev-parse', '--verify', '--quiet', `${base}^{commit}`) === null) {
      throw new Error(`the base ${base} does not exist and could not be fetched: fetch it (git fetch origin main) or pass --base <ref>`)
    }
  }
  const mb = tryGit(root, 'merge-base', 'HEAD', base)
  if (!mb) throw new Error(`no common history between HEAD and ${base}: this looks like a shallow clone; fetch the full history (actions/checkout needs fetch-depth: 0)`)
  return mb
}

const json = text => JSON.parse(text)
const readTree = (root, file) => (existsSync(path.join(root, file)) ? json(readFileSync(path.join(root, file), 'utf8')) : null)
const readBase = (root, commit, file) => { const t = tryGit(root, 'show', `${commit}:${file}`); return t === null ? null : json(t) }

/** { rule: n } summed over every file of a guard baseline. */
const ruleTotals = baseline => {
  const out = {}
  for (const rules of Object.values(baseline?.files ?? {})) for (const [rule, n] of Object.entries(rules)) out[rule] = (out[rule] || 0) + n
  return out
}

const raised = (label, now, was, isNew = () => false) => Object.keys(now).filter(k => (now[k] || 0) > (was[k] || 0) && !isNew(k)).map(k => `${label}: ${k} ${was[k] || 0} -> ${now[k]}`)

/** Pure comparison of one baseline file: -> { problems, notes } (base === null: the file is new, accepted). */
// `guardSource`: the guard's source at the base commit; a rule whose name is not in it is a NEW rule (seeded from reality, noted),
// not a regression. Without the source (null) every rise fails.
export const compareFile = (file, tree, base, { allowEntryGrowth = false, guardSource = null } = {}) => {
  const problems = []
  const notes = []
  // a new exceptions file is accepted too, but each of its entries is checked for its reason
  if (base === null && file !== EXCEPTIONS) { if (tree !== null) notes.push(`${file}: not in the base, accepted as new`); return { problems, notes } }
  if (tree === null) return { problems: base === null ? [] : [`${file}: exists in the base and is gone from the tree (a baseline is lowered, never deleted)`], notes }
  base ??= {}

  if (file === ENTRY) {
    for (const key of ['entry_gzip_bytes', 'entry_css_gzip_bytes']) {
      if (!Object.hasOwn(base, key)) continue
      if (!Number.isSafeInteger(tree[key]) || tree[key] < 0) {
        problems.push(`${file}: invalid or missing ${key}`)
      } else if (tree[key] > base[key] && !allowEntryGrowth) {
        problems.push(`${file}: ${key} ${base[key]} -> ${tree[key]} (the entry may not grow past main; if it is on purpose, add --allow-entry-growth to the CI step in the same PR and say why)`)
      }
    }
  } else if (file === EXCEPTIONS) {
    for (const [guard, list] of Object.entries(tree)) {
      if (!Array.isArray(list)) continue
      const old = new Map((Array.isArray(base[guard]) ? base[guard] : []).map(e => [e.id, e]))
      for (const e of list) {
        const reason = typeof e.reason === 'string' ? e.reason.trim() : ''
        if (!reason) problems.push(`${file}: exception ${guard}/${e.id} has no reason`)
        else if (!old.has(e.id)) notes.push(`${file}: NEW exception ${guard}/${e.id} (${e.file}, ${e.value}): needs Sergio's approval in the PR`)
        else if ((e.count ?? 1) > (old.get(e.id).count ?? 1)) notes.push(`${file}: exception ${guard}/${e.id} exempts ${e.count} occurrences, it had ${old.get(e.id).count ?? 1}: needs Sergio's approval in the PR`)
      }
    }
  } else {
    const now = ruleTotals(tree)
    const was = ruleTotals(base)
    const isNew = rule => guardSource !== null && !(rule in was) && !new RegExp(`(?<![\\w-])${rule}(?![\\w-])`).test(guardSource)
    problems.push(...raised(`${file} total`, now, was, isNew))
    for (const rule of Object.keys(now).filter(isNew)) notes.push(`${file}: NEW rule ${rule} seeded with ${now[rule]} findings (the base guard has no such rule): needs a look in the PR`)
  }
  return { problems, notes }
}

/** The baseline files to compare: the known ones plus every json under the baselines folder, in the tree or the base. */
const filesOf = (root, commit) => {
  const listed = tryGit(root, 'ls-tree', '-r', '--name-only', commit, `${BASELINES}/`)?.split('\n').filter(Boolean) ?? []
  const dir = path.join(root, BASELINES)
  const inTree = existsSync(dir) ? readTreeNames(root) : []
  return [...new Set([...listed, ...inTree, EXCEPTIONS, ENTRY])].filter(f => f.endsWith('.json') && f !== COHERENCE).sort()
}
const readTreeNames = root => tryGit(root, 'ls-files', '--cached', '--others', '--exclude-standard', `${BASELINES}/`)?.split('\n').filter(Boolean) ?? []

export const ratchet = ({ root = ROOT, base = DEFAULT_BASE, allowEntryGrowth = false } = {}) => {
  const commit = mergeBase(root, base)
  const problems = []
  const notes = []
  for (const file of filesOf(root, commit)) {
    const guard = file.match(new RegExp(`^${BASELINES}/([\\w-]+)\\.json$`))?.[1]
    const guardSource = guard ? tryGit(root, 'show', `${commit}:scripts/design/guards/${guard}.mjs`) : null
    const r = compareFile(file, readTree(root, file), readBase(root, commit, file), { allowEntryGrowth, guardSource })
    problems.push(...r.problems)
    notes.push(...r.notes)
  }
  return { ok: !problems.length, problems, notes, base, commit }
}

const main = () => {
  const args = process.argv.slice(2)
  const at = args.indexOf('--base')
  let r
  try { r = ratchet({ base: at >= 0 ? args[at + 1] : DEFAULT_BASE, allowEntryGrowth: args.includes('--allow-entry-growth') }) } catch (e) {
    console.error(`FAIL design ratchet: ${e.message}`)
    process.exit(2)
  }
  r.notes.forEach(n => console.log(`note ${n}`))
  r.problems.forEach(p => console.error(`FAIL ${p}`))
  console.log(r.ok ? `design-ratchet: OK (no baseline went up since ${r.base}, ${r.commit.slice(0, 8)})` : `design-ratchet: FAILED (${r.problems.length} baselines went up or lost their reason since ${r.base}, ${r.commit.slice(0, 8)})`)
  process.exit(r.ok ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
