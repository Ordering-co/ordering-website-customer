import { afterEach, describe, expect, it, vi } from 'vitest'

const buildEnv = ({ robotsBody, robotsOk = true } = {}) => ({
  PROJECT: 'synthetic-project',
  ASSETS: {
    fetch: async (request) => {
      const url = new URL(request.url)
      if (url.pathname === '/robots.txt') {
        // Real binding with not_found_handling = single-page-application: a missing asset is index.html with 200.
        if (!robotsOk) return new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })
        return new Response(robotsBody, { headers: { 'content-type': 'text/plain; charset=UTF-8' } })
      }
      return new Response('not found', { status: 404 })
    }
  }
})

const callRobots = async (origin, env) => {
  vi.resetModules()
  const { default: worker } = await import('../../../worker/index.js')
  const request = new Request(`${origin}/robots.txt`, { headers: { accept: 'text/plain' } })
  const response = await worker.fetch(request, env, { waitUntil: vi.fn() })
  return response
}

describe('worker /robots.txt', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("appends the host's sitemap line to the asset's rules", async () => {
    const env = buildEnv({ robotsBody: 'User-agent: *\nDisallow:\n' })
    const response = await callRobots('https://shop.example.com', env)
    const body = await response.text()

    expect(body).toContain('User-agent: *')
    expect(body).toContain('Disallow:')
    expect(body).toContain('Sitemap: https://shop.example.com/sitemap.xml')
    expect(response.headers.get('content-type')).toBe('text/plain; charset=UTF-8')
  })

  it('does not duplicate an existing Sitemap line', async () => {
    const env = buildEnv({ robotsBody: 'User-agent: *\nDisallow:\n\nSitemap: https://shop.example.com/sitemap.xml\n' })
    const body = await (await callRobots('https://shop.example.com', env)).text()

    expect(body.match(/Sitemap:/gi)).toHaveLength(1)
  })

  it('falls back to a permissive default when the asset is unavailable', async () => {
    const env = buildEnv({ robotsOk: false })
    const body = await (await callRobots('https://shop.example.com', env)).text()

    expect(body).toBe('User-agent: *\nDisallow:\n\nSitemap: https://shop.example.com/sitemap.xml\n')
  })

  it('uses the requesting host, not a hardcoded one, in the sitemap line', async () => {
    const env = buildEnv({ robotsBody: 'User-agent: *\nDisallow:\n' })
    const body = await (await callRobots('https://other.example.com', env)).text()

    expect(body).toContain('Sitemap: https://other.example.com/sitemap.xml')
    expect(body).not.toContain('shop.example.com')
  })
})
