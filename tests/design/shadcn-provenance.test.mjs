import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const componentPath = 'src/ui/src/design-system/components/'
const root = new URL('../../', import.meta.url)

const creditsShadcn = source => {
  const header = source.match(/^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))+/)?.[0] ?? ''
  const attribution = header.replace(/\bnot adapted from\s+shadcn\/ui\b/gi, '')
  return /\bshadcn\/ui\b/i.test(attribution)
}

test('the provenance check recognizes differently worded attribution and excludes explicit negation', () => {
  assert.equal(creditsShadcn("// Based on shadcn/ui's Base UI button.\nexport const Button = null\n"), true)
  assert.equal(creditsShadcn('/* Source: shadcn/ui */\nexport const Button = null\n'), true)
  assert.equal(creditsShadcn('// Not adapted from shadcn/ui.\nexport const Chip = null\n'), false)
})

test('every base piece that credits shadcn has a pinned provenance entry', () => {
  const manifest = JSON.parse(readFileSync(new URL('docs/third-party/shadcn-ui/provenance.json', root), 'utf8'))
  const adapted = new Map(manifest.sourceFiles.filter(source => source.adaptedAs).map(source => [source.adaptedAs, source]))
  for (const file of readdirSync(new URL(componentPath, root))) {
    if (!file.endsWith('.jsx')) continue
    const component = componentPath + file
    if (!creditsShadcn(readFileSync(new URL(component, root), 'utf8'))) continue
    const source = adapted.get(component)
    assert.ok(source, `${component} credits shadcn/ui and needs an adaptedAs entry`)
    assert.ok(source.url.includes(`/${manifest.shadcnCommit}/`), `${component} must pin its source URL`)
    assert.match(source.sha256, /^[a-f0-9]{64}$/)
  }
})
