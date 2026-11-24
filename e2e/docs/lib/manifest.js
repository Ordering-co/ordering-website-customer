import fs from 'node:fs/promises'
import { APP_ORIGIN } from './server.cjs'
import { resolveProductPath } from './paths.js'

const ARTICLE_ID = /^WEB-[A-Z]{3}-\d{3}$/
const PROJECTS = new Set(['desktop-chromium', 'mobile-chromium'])

const requireString = (value, label, errors) => {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} must be a non-empty string`)
}

const hasDotSegments = (pathname) => pathname.split('/').some((segment) => segment === '.' || segment === '..')

const validateRootRelativeRoute = (value, label, errors) => {
  requireString(value, label, errors)
  if (typeof value !== 'string' || value.trim() === '') return

  if (value !== value.trim() || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    errors.push(`${label} must be a safe root-relative route`)
    return
  }

  const rawPathname = value.split(/[?#]/, 1)[0]
  let decodedPathname = rawPathname
  try {
    while (true) {
      const next = decodeURIComponent(decodedPathname)
      if (next === decodedPathname) break
      decodedPathname = next
    }
  } catch {
    errors.push(`${label} must use valid URL encoding`)
    return
  }

  if (
    decodedPathname.startsWith('//') ||
    decodedPathname.includes('\\') ||
    hasDotSegments(rawPathname) ||
    hasDotSegments(decodedPathname)
  ) {
    errors.push(`${label} must not contain dot-segment traversal`)
    return
  }

  try {
    const parsed = new URL(value, APP_ORIGIN)
    if (parsed.origin !== APP_ORIGIN || !parsed.pathname.startsWith('/')) {
      errors.push(`${label} must stay on the documentation app origin`)
    }
  } catch {
    errors.push(`${label} must be a valid root-relative route`)
  }
}

export const validateManifest = (manifest, source = 'manifest') => {
  const errors = []
  if (manifest.schema_version !== 1) errors.push('schema_version must be 1')
  if (!ARTICLE_ID.test(manifest.article_id || '')) errors.push('article_id must match WEB-AAA-000')
  requireString(manifest.fixture, 'fixture', errors)
  validateRootRelativeRoute(manifest.route, 'route', errors)
  if (!Array.isArray(manifest.captures) || manifest.captures.length === 0) {
    errors.push('captures must contain at least one capture')
  }

  const ids = new Set()
  const files = new Set()
  for (const [index, capture] of (manifest.captures || []).entries()) {
    const label = `captures[${index}]`
    requireString(capture.id, `${label}.id`, errors)
    requireString(capture.selector, `${label}.selector`, errors)
    requireString(capture.file, `${label}.file`, errors)
    requireString(capture.alt, `${label}.alt`, errors)
    if (capture.route !== undefined) {
      validateRootRelativeRoute(capture.route, `${label}.route`, errors)
    }
    if (capture.id && ids.has(capture.id)) errors.push(`${label}.id is duplicated`)
    if (capture.file && files.has(capture.file)) errors.push(`${label}.file is duplicated`)
    ids.add(capture.id)
    files.add(capture.file)
    if (!PROJECTS.has(capture.project)) errors.push(`${label}.project is not configured`)
    if (capture.capture_mode !== undefined && !['section', 'viewport'].includes(capture.capture_mode)) {
      errors.push(`${label}.capture_mode must be section or viewport`)
    }
    if (!capture.selector?.includes('data-doc-')) errors.push(`${label}.selector must use a data-doc-* selector`)
    if (!capture.file?.startsWith('website-') || !capture.file?.endsWith('.png')) {
      errors.push(`${label}.file must be a website-*.png filename`)
    }
    if (capture.file && capture.file !== capture.file.split(/[\\/]/).pop()) errors.push(`${label}.file must be a basename without directories`)
  }

  if (errors.length > 0) throw new Error(`Invalid documentation capture ${source}:\n${errors.join('\n')}`)
  return manifest
}

export const loadManifest = async (manifestName) => {
  const manifestPath = resolveProductPath('e2e', 'docs', 'manifests', `${manifestName}.json`)
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  validateManifest(manifest, manifestPath)
  const fixturePath = resolveProductPath('e2e', 'docs', 'fixtures', manifest.fixture, 'fixture.json')
  await fs.access(fixturePath)
  return manifest
}
