import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { entryCssGzipBytes } from '../../scripts/entry-size.mjs'

const script = fileURLToPath(new URL('../../scripts/entry-size.mjs', import.meta.url))
const artwork = 'src/ui/src/components/Header/address-map-illustration.svg'
const drawing = 'M250.142 79.13C249.874 64.6206 242.482 50.618 231.225 39.8046'

const inspectBuild = (t, { inline = false, external = true, precache = false, manifest = true, args = [] } = {}) => {
  const dist = mkdtempSync(path.join(tmpdir(), 'entry-size-'))
  t.after(() => rmSync(dist, { recursive: true, force: true }))
  mkdirSync(path.join(dist, '.vite'))
  mkdirSync(path.join(dist, 'assets'))
  const put = (file, contents) => writeFileSync(path.join(dist, file), contents)
  put('index.html', '<script type="module" src="/assets/entry.js"></script>')
  put('assets/entry.js', 'import "./shared.js"')
  put('assets/shared.js', inline ? `const path = "${drawing}"` : 'export const url = "/assets/map.svg"')
  if (external) put('assets/map.svg', `<svg><path d="${drawing}" /></svg>`)
  put('sw.js', precache ? 'precacheAndRoute([{url:"assets/map.svg",revision:null}])' : 'precacheAndRoute([])')
  if (manifest) put('.vite/manifest.json', JSON.stringify({
    'index.html': { file: 'assets/entry.js', isEntry: true, imports: ['_shared.js'] },
    '_shared.js': { file: 'assets/shared.js', assets: external ? ['assets/map.svg'] : [] },
    ...(external && { [artwork]: { file: 'assets/map.svg', src: artwork } })
  }))
  return spawnSync(process.execPath, [script, '--dist', dist, ...args], { encoding: 'utf8' })
}

test('entry-size accepts the map artwork as a separate asset', (t) => {
  assert.equal(inspectBuild(t).status, 0)
})

test('entry-size rejects the illustration in a transitive static chunk below the size limit', (t) => {
  const result = inspectBuild(t, { inline: true })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /map artwork is embedded in assets\/shared\.js/)
})

test('entry-size requires the external map artwork in the manifest', (t) => {
  const result = inspectBuild(t, { external: false })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /map artwork must be emitted as a separate SVG/)
})

test('entry-size rejects the map artwork in the install-time precache', (t) => {
  const result = inspectBuild(t, { precache: true })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /map artwork is precached/)
})

for (const manifest of [false, true]) {
  test(`entry-size measures a historical build (manifest: ${manifest}) on request`, (t) => {
    const result = inspectBuild(t, { manifest, external: false, args: ['--measure-only'] })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /entry\.js .* kB gzip \(\d+ bytes\)/)
    assert.match(result.stdout, /stylesheets linked in index\.html .* kB gzip \(\d+ bytes\)/)
  })
}

test('entry CSS sums the distinct local stylesheets linked from index.html', t => {
  const dist = mkdtempSync(path.join(tmpdir(), 'entry-size-'))
  t.after(() => rmSync(dist, { recursive: true, force: true }))
  const firstSheet = '.one { display: block; }'
  const secondSheet = '.two { display: grid; }'
  writeFileSync(path.join(dist, 'one.css'), firstSheet)
  writeFileSync(path.join(dist, 'two.css'), secondSheet)
  writeFileSync(path.join(dist, 'index.html'), `
    <!--
      <link rel="stylesheet" href="/retired.css">
    -->
    <link rel="preload" as="style" href="/unloaded.css">
    <link rel="stylesheet" href="//example.org/external.css">
    <link rel="stylesheet" href="https://example.org/external.css">
    <link rel="stylesheet" href="/one.css">
    <link href='./one.css' rel='stylesheet'>
    <LINK HREF=two.css?v=2 REL=stylesheet>
  `)
  assert.equal(entryCssGzipBytes(dist), gzipSync(firstSheet).length + gzipSync(secondSheet).length)
})
