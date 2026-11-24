#!/usr/bin/env node
/**
 * Deploys the worker for an environment, in this order:
 *   1. publishes the theme schema (`pnpm theme:publish:<env>`, required), so
 *      new code never goes out without its schema;
 *   2. `wrangler deploy`;
 *   3. smoke-tests the site;
 *   4. when the smoke test fails, rolls the worker back to the version that
 *      was live before and fails. The schema stays published: api-core cuts a
 *      theme down to the version the old code asks for.
 *
 * Usage: node scripts/cf-deploy.mjs <production|development>
 *   SMOKE_URL           the site the smoke test opens (required)
 *   THEME_PUBLISH_SKIP  1 deploys without publishing the theme schema
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const WRANGLER_ENV = {
  production: ['--env', 'production'],
  development: ['--env=']
}

const SMOKE_ATTEMPTS = 8
const SMOKE_DELAY_MS = 5000

/** The version of a `wrangler deployments status --json` answer serving 100%. */
export const activeVersionId = (status) => {
  const deployment = Array.isArray(status)
    ? status[0]
    : status?.deployments?.[0] ?? status
  const versions = Array.isArray(deployment?.versions) ? deployment.versions : []
  const active = versions.find((version) => Number(version?.percentage) === 100)
  return active?.version_id ? String(active.version_id) : null
}

/** The src of the page's module entry script (`/assets/index-<hash>.js`). */
export const entryScript = (html) => {
  const tag = String(html || '').match(/<script\b[^>]*\btype=["']module["'][^>]*>/i)?.[0]
  return tag?.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? null
}

/** What is wrong with the served page; empty when it is the new build, booted by the worker. */
export const smokeProblems = (status, html, expectedEntry) => {
  if (status !== 200) return [`HTTP ${status}`]
  const problems = []
  if (!/id=["']root["']/.test(html)) problems.push('no #root')
  if (!html.includes('window.__CONFIG__')) problems.push('the worker injected no __CONFIG__')
  if (!html.includes('window.__FIRST_LOAD__')) problems.push('the worker injected no __FIRST_LOAD__')
  const served = entryScript(html)
  if (served !== expectedEntry) problems.push(`entry ${served} is not the new build's ${expectedEntry}`)
  return problems
}

/** `wrangler deploy` args that bake the commit and build time into the worker for `/version`; the commit is left out unless it is 40 hex. */
export const versionVars = (commit, builtAt) => [
  ...(/^[0-9a-f]{40}$/i.test(commit) ? ['--var', `WORKER_COMMIT:${commit}`] : []),
  '--var', `WORKER_BUILT_AT:${builtAt}`
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const run = (command, args, options = {}) => {
  console.log(`$ ${command} ${args.join(' ')}`)
  return spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options })
}

const fail = (message) => {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

export const smokeTest = async (url, expectedEntry) => {
  let problems = []
  for (let attempt = 1; attempt <= SMOKE_ATTEMPTS; attempt++) {
    try {
      const pageUrl = new URL(url)
      pageUrl.searchParams.set('smoke', String(Date.now()))
      const page = await fetch(pageUrl, { headers: { accept: 'text/html' }, cache: 'no-store' })
      problems = smokeProblems(page.status, await page.text(), expectedEntry)
      if (!problems.length) {
        const script = await fetch(new URL(expectedEntry, url), { cache: 'no-store' })
        if (script.status !== 200) problems = [`entry script HTTP ${script.status}`]
      }
    } catch (error) {
      problems = [error.message]
    }
    if (!problems.length) {
      console.log(`smoke test OK (${url})`)
      return true
    }
    console.log(`smoke test ${attempt}/${SMOKE_ATTEMPTS}: ${problems.join('; ')}`)
    if (attempt < SMOKE_ATTEMPTS) await sleep(SMOKE_DELAY_MS)
  }
  return false
}

const main = async () => {
  const envName = process.argv[2]
  const wranglerEnv = WRANGLER_ENV[envName]
  if (!wranglerEnv) fail(`usage: node scripts/cf-deploy.mjs <${Object.keys(WRANGLER_ENV).join('|')}>`)

  const smokeUrl = String(process.env.SMOKE_URL || '').trim()
  try {
    new URL(smokeUrl) // eslint-disable-line no-new
  } catch {
    fail('SMOKE_URL must be the URL of the site the smoke test opens')
  }

  const indexHtml = path.join(root, 'dist', 'index.html')
  if (!existsSync(indexHtml)) fail('dist/index.html is missing: build first (pnpm cf:build:<env>)')
  const expectedEntry = entryScript(readFileSync(indexHtml, 'utf8'))
  if (!expectedEntry) fail('dist/index.html has no module entry script')

  if (/^(1|true)$/i.test(String(process.env.THEME_PUBLISH_SKIP || '').trim())) {
    console.warn('WARN: THEME_PUBLISH_SKIP is set: deploying without publishing the theme schema')
  } else if (run('pnpm', [`theme:publish:${envName}`]).status !== 0) {
    fail('the theme schema was not published; nothing was deployed')
  }

  const status = run('pnpm', ['exec', 'wrangler', 'deployments', 'status', '--json', ...wranglerEnv], { stdio: ['ignore', 'pipe', 'inherit'] })
  let previousVersion = null
  try {
    previousVersion = activeVersionId(JSON.parse(String(status.stdout)))
  } catch {}
  console.log(previousVersion ? `live version before the deploy: ${previousVersion}` : 'WARN: no live version found; a failed smoke test cannot roll back')

  // WORKERS_CI_COMMIT_SHA is a build-time variable only: the runtime never sees it, so it is injected here.
  const commit = String(process.env.WORKERS_CI_COMMIT_SHA || '').trim() ||
    String(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout || '').trim()
  if (run('pnpm', ['exec', 'wrangler', 'deploy', ...wranglerEnv, ...versionVars(commit, new Date().toISOString())]).status !== 0) fail('wrangler deploy failed')

  if (await smokeTest(smokeUrl, expectedEntry)) return

  if (!previousVersion) fail('the smoke test failed and there is no version to roll back to')
  const rollback = run('pnpm', ['exec', 'wrangler', 'rollback', previousVersion, ...wranglerEnv, '--yes', '--message', 'cf-deploy: smoke test failed'])
  fail(rollback.status === 0
    ? `the smoke test failed; rolled back to ${previousVersion}`
    : `the smoke test failed and the rollback to ${previousVersion} failed too`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => fail(error.message))
}
