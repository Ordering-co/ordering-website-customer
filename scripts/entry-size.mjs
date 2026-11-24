#!/usr/bin/env node
// The gzip sizes of the app's entry chunk and local stylesheets linked in index.html,
// compared independently against a baseline kept in the repo,
// so a change that drags a big module into the entry (implementation notesthe whole icon
// registry through one `Icon` import) fails the check instead of landing quietly.
//
//   pnpm build && node scripts/entry-size.mjs            compare (default: fail above +1 kB)
//   node scripts/entry-size.mjs --update                 write the baseline from the current build
//   node scripts/entry-size.mjs --max-increase 2048      another threshold, in bytes
//   node scripts/entry-size.mjs --dist <dir>             another build directory (default: dist)
//   node scripts/entry-size.mjs --measure-only --dist <dir>  print JS and CSS sizes for any build
//
// This script measures the build in `<dist>` against scripts/entry-size.baseline.json,
// that is, against the build of the branch that last ran `--update`, NOT against
// main: the +1 kB limit protects from growing past the branch's own number. What
// keeps the baseline from rising past main is `pnpm design:ratchet`
// (scripts/design/baseline-ratchet.mjs, in CI). Update the baseline, in the PR
// that grows the entry on purpose, with `--update`, and say why in the PR. The
// difference between main and the first branch with the design system, and what
// explains it, is in docs/design-system/guards.md. Its gzip is zlib's default
// level, as Vite prints it.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const BASELINE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry-size.baseline.json')
const DEFAULT_MAX_INCREASE = 1024
const MAP_ARTWORK = 'src/ui/src/components/Header/address-map-illustration.svg'

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

/** The entry chunk of a build: the file of the `<script type="module" src>` of its index.html. */
export const entryOf = (distDir) => {
  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8')
  const tag = html.match(/<script\b[^>]*\btype="module"[^>]*>/)?.[0]
  const src = tag?.match(/\bsrc="([^"]+)"/)?.[1]
  if (!src) throw new Error(`no module script in ${path.join(distDir, 'index.html')}: is it a build?`)
  return path.join(distDir, src.replace(/^\//, ''))
}

export const entryGzipBytes = (distDir) => gzipSync(readFileSync(entryOf(distDir))).length

/** Sum the individually compressed local stylesheets loaded by index.html. */
export const entryCssGzipBytes = (distDir) => {
  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const sheets = new Set()
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(
      Array.from(tag.matchAll(/\s([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
        ([, name, doubleQuoted, singleQuoted, unquoted]) => [name.toLowerCase(), doubleQuoted ?? singleQuoted ?? unquoted])
    )
    if (!attributes.rel?.toLowerCase().split(/\s+/).includes('stylesheet') || !attributes.href) continue
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(attributes.href)) continue
    const asset = attributes.href.split(/[?#]/, 1)[0].replace(/^\//, '')
    sheets.add(path.join(distDir, asset))
  }
  return [...sheets].reduce((total, sheet) => total + gzipSync(readFileSync(sheet)).length, 0)
}

// Weight alone can miss a regression when other parts of the entry get smaller.
const assertMapArtworkDeferred = (distDir) => {
  const read = (file) => readFileSync(path.join(distDir, file), 'utf8')
  const manifest = JSON.parse(read('.vite/manifest.json'))
  const asset = manifest[MAP_ARTWORK]?.file
  if (!asset?.endsWith('.svg')) throw new Error('map artwork must be emitted as a separate SVG')
  const precache = read('sw.js').match(/\bprecacheAndRoute\((\[[^\]]*\])/)?.[1]
  if (!precache) throw new Error('Workbox precache is missing from the service worker')
  if (precache.includes(asset)) throw new Error(`map artwork is precached in sw.js (${asset})`)

  const svg = read(asset)
  const drawing = svg.match(/<path\s+d="([^"]+)"/)?.[1]?.slice(0, 60)
  if (!drawing) throw new Error('map artwork SVG is missing its drawing')
  const fingerprints = [drawing, encodeURIComponent(drawing), Buffer.from(svg).toString('base64')]
  const entryModule = entryOf(distDir)
  const entry = Object.keys(manifest).find(key => manifest[key].isEntry && path.join(distDir, manifest[key].file) === entryModule)
  if (!entry) throw new Error('entry module is missing from the Vite manifest')

  const pending = [entry]
  const visited = new Set()
  while (pending.length) {
    const key = pending.pop()
    if (visited.has(key)) continue
    visited.add(key)
    const chunk = manifest[key]
    const code = read(chunk.file)
    if (fingerprints.some(fingerprint => code.includes(fingerprint))) {
      throw new Error(`map artwork is embedded in ${chunk.file}`)
    }
    pending.push(...(chunk.imports || []))
  }
}

const kB = (bytes) => `${(bytes / 1024).toFixed(2)} kB`

const main = () => {
  const distDir = path.resolve(argument('--dist') || 'dist')
  const maxIncrease = Number(argument('--max-increase') ?? DEFAULT_MAX_INCREASE)
  const measureOnly = process.argv.includes('--measure-only')
  const update = process.argv.includes('--update')
  try {
    if (measureOnly && update) throw new Error('--measure-only cannot be combined with --update')
    if (!measureOnly) assertMapArtworkDeferred(distDir)
  } catch (error) {
    console.error(`entry-size: ${error.message}`)
    process.exit(1)
  }
  const current = {
    entry_gzip_bytes: entryGzipBytes(distDir),
    entry_css_gzip_bytes: entryCssGzipBytes(distDir)
  }

  if (measureOnly) {
    const entry = path.basename(entryOf(distDir))
    for (const [label, bytes] of [[entry, current.entry_gzip_bytes], ['stylesheets linked in index.html', current.entry_css_gzip_bytes]]) {
      console.log(`entry-size: ${label} ${kB(bytes)} gzip (${bytes} bytes)`)
    }
    return
  }

  if (update) {
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`)
    console.log(`entry-size: baseline written, JS ${kB(current.entry_gzip_bytes)}, CSS ${kB(current.entry_css_gzip_bytes)} gzip`)
    return
  }

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
  let overBudget = false
  for (const [key, label] of [
    ['entry_gzip_bytes', path.basename(entryOf(distDir))],
    ['entry_css_gzip_bytes', 'stylesheets linked in index.html']
  ]) {
    if (!Number.isSafeInteger(baseline[key]) || baseline[key] < 0) {
      throw new Error(`invalid or missing ${key} in ${BASELINE}`)
    }
    const delta = current[key] - baseline[key]
    console.log(`entry-size: ${label} ${kB(current[key])} gzip, baseline ${kB(baseline[key])}, ${delta >= 0 ? '+' : ''}${delta} bytes (limit +${maxIncrease})`)
    if (delta > maxIncrease) overBudget = true
  }
  if (overBudget) {
    console.error('FAIL: an entry asset budget grew more than the limit. For approved growth, run `node scripts/entry-size.mjs --update` and explain it in the PR.')
    process.exitCode = 1
  } else {
    console.log('OK')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
