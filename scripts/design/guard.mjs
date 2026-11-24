// Design guards: automates THEMING.md §7 and the ordering-website-design skill.
//
//   node scripts/design/guard.mjs [literal|icon|pieces|ui-scope|all] [--check | --update-baseline | --report [--findings] [--out file]]
//
//   --check            (default) fail on a finding over the baseline, a stale or loose baseline entry, an unused exception
//   --update-baseline  regenerate scripts/design/baselines/<guard>.json; it only goes down (refuses to raise or add)
//   --seed-rule <rule> with --update-baseline: write a rule that is new in the guard as it is, once (see updateBaseline);
//                      repeat it for several new rules of the same change (they are seeded together)
//   --report           JSON per file with the counts by guard and rule (the input of the per-route coherence check)
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { check, format, report, ROOT, updateBaseline } from './engine.mjs'
import icon from './guards/icon.mjs'
import literal from './guards/literal.mjs'
import pieces from './guards/pieces.mjs'
import uiScope from './guards/ui-scope.mjs'

export const GUARDS = [literal, icon, pieces, uiScope]

const main = () => {
  const args = process.argv.slice(2)
  const outAt = args.indexOf('--out')
  const seedAt = args.flatMap((a, i) => (a === '--seed-rule' ? [i + 1] : []))
  const seed = seedAt.map(i => args[i]).filter(Boolean)
  const names = args.filter((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1) && !seedAt.includes(i))
  const selected = names.length && !names.includes('all') ? GUARDS.filter(g => names.includes(g.name)) : GUARDS
  if (!selected.length) { console.error(`unknown guard: ${names.join(', ')} (literal, icon, pieces, ui-scope, all)`); process.exit(2) }

  if (args.includes('--report')) {
    const json = `${JSON.stringify(report(selected, { withFindings: args.includes('--findings') }), null, 2)}\n`
    if (outAt >= 0 && args[outAt + 1]) writeFileSync(path.resolve(args[outAt + 1]), json)
    else process.stdout.write(json)
    return
  }

  let failed = false
  for (const guard of selected) {
    if (args.includes('--update-baseline')) {
      if (!guard.baseline) { console.log(`${guard.name}-guard: no baseline (tolerates nothing)`); continue }
      const r = updateBaseline(guard, { seed })
      if (!r.ok) { failed = true; console.error(`${guard.name}-guard: baseline not written`); r.problems.forEach(p => console.error(`  - ${p}`)); continue }
      const total = Object.values(r.files).reduce((n, rules) => n + Object.values(rules).reduce((a, b) => a + b, 0), 0)
      console.log(`${guard.name}-guard: wrote baseline, ${Object.keys(r.files).length} files, ${total} findings`)
    } else {
      const r = check(guard)
      console.log(format(guard, r))
      if (!r.ok) failed = true
    }
  }
  process.exit(failed ? 1 : 0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
export { ROOT }
