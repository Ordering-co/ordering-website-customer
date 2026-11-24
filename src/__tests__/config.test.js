import { afterEach, describe, expect, it, vi } from 'vitest'
import baseSettings from '../config.json'

describe('config merge', () => {
  afterEach(() => {
    delete window.__CONFIG__
    vi.unstubAllEnvs()
  })

  it('exports merged api and socket settings from config.json', async () => {
    const { default: settings } = await import('~/config')
    expect(settings.api).toBeTruthy()
    expect(settings.socket).toBeTruthy()
    expect(settings.project).toBeTruthy()
  })

  it('converts slug sentinel values to null', async () => {
    window.__CONFIG__ = { franchiseSlug: '0', businessSlug: 'null' }
    vi.resetModules()
    const { default: settings } = await import('~/config')
    expect(settings.franchiseSlug).toBeNull()
    expect(settings.businessSlug).toBeNull()
  })

  it('uses VITE_PROJECT/VITE_APP_ID when set in dev', async () => {
    vi.stubEnv('VITE_PROJECT', 'my-project')
    vi.stubEnv('VITE_APP_ID', 'my-site-code')
    vi.resetModules()
    const { default: settings } = await import('~/config')
    expect(settings.project).toBe('my-project')
    expect(settings.app_id).toBe('my-site-code')
  })

  it('falls back to config.json when the env vars are unset or empty', async () => {
    vi.stubEnv('VITE_PROJECT', '')
    vi.stubEnv('VITE_APP_ID', '')
    vi.resetModules()
    const { default: settings } = await import('~/config')
    expect(settings.project).toBe(baseSettings.project)
    expect(settings.app_id).toBe(baseSettings.app_id)
  })

  it('lets window.__CONFIG__ win over the env vars', async () => {
    vi.stubEnv('VITE_PROJECT', 'my-project')
    vi.stubEnv('VITE_APP_ID', 'my-site-code')
    window.__CONFIG__ = { project: 'runtime-project', app_id: 'runtime-site-code' }
    vi.resetModules()
    const { default: settings } = await import('~/config')
    expect(settings.project).toBe('runtime-project')
    expect(settings.app_id).toBe('runtime-site-code')
  })

  it('ignores the env vars when DEV is false', async () => {
    vi.stubEnv('VITE_PROJECT', 'my-project')
    vi.stubEnv('VITE_APP_ID', 'my-site-code')
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const { default: settings } = await import('~/config')
    expect(settings.project).toBe(baseSettings.project)
    expect(settings.app_id).toBe(baseSettings.app_id)
  })
})
