import {
  mapSeoEndpoint,
  fetchSeo,
  fetchSitemap,
  fetchFirstLoad,
  fetchBootI18n,
  fetchBusinessShareImages,
  getTitle,
  buildSiteSeoFallback,
  mergeSeoData,
  extractApiImage,
  resolveShareImage,
  escapeJsonForScript,
  deriveProjectFromHost,
  validateProjectViaCurrent,
  isOrderingHost,
  isConfiguredBrandAsset,
  resolveTenantFaviconUrl,
  getThemeFavicon,
  getThemeAppIcon,
  buildIconLinks,
  businessFaviconLinks,
  presentImage,
  getFaviconBusinessSlug,
  GENERIC_FAVICON_PATH,
  getFallbackFaviconPath,
  getThemeFranchiseId,
  getThemeSiteName,
  getThemeSite,
  pickNonEmptyString,
  safeDecodeURIComponent,
  ORDERING_TOUCH_ICON_LINKS
} from './seo.js'
import { fetchLandingData, isFullWebsiteTheme, landingHeroImage, landingTimeoutMs } from './landingData.js'
import { isLandingRequest } from '../src/pages/Landing/ssrSwap.js'
import { landingSsrInjection } from './landingSsr.js'
import { jsonLdScriptTag, landingJsonLd } from './structuredData.js'
import { fetchInactiveStorefront, inactivePageResponse, isLikelyBot, recordInactiveVisit } from './inactiveProject.js'

const ASSET_EXTENSIONS = /\.(js|css|map|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|eot|json|txt|xml|mp4|webm|avif)$/i

// A private store (first_load.store_private) is kept out of search engines and caches.
const PRIVATE_ROBOTS = 'noindex, nofollow'
const EMPTY_SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n'

const BUSINESS_SEO_PATH_RE = /^\/seo\/business\/([^/]+)/

/**
 * The business slug whose own images (fetchBusinessShareImages) the share
 * image ladder (resolveShareImage) may use: a store route's own slug, or,
 * on any other route of a single-store theme, its configured business.
 */
const resolveShareBusinessSlug = (seoPath, theme, site) => {
  const match = BUSINESS_SEO_PATH_RE.exec(seoPath)
  if (match) return safeDecodeURIComponent(match[1])
  const themeSite = getThemeSite(theme)
  if (themeSite?.mode !== 'single_store') return null
  return pickNonEmptyString(themeSite?.business_slug) || pickNonEmptyString(site?.business?.slug)
}

/** Prefix public assets with the persisted deployment base. */
const defaultAssetPath = (env, path) => {
  const raw = String(
    env?.ASSET_BASE_PATH ||
    env?.ASSET_BASE_URL ||
    env?.VITE_ASSET_BASE ||
    env?.VITE_ASSET_BASE_URL ||
    ''
  ).trim().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return raw ? `${raw}${p}` : p
}

let cachedBaseConfig = null

const resolveBoolEnv = (value, fallback) => {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return fallback
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return fallback
}

const loadBaseConfig = async (env, origin) => {
  if (cachedBaseConfig) return cachedBaseConfig

  let baseConfig = {}
  try {
    const request = new Request(new URL('/config.json', origin).toString())
    const response = await env.ASSETS.fetch(request)
    if (response.ok) {
      baseConfig = await response.json()
    }
  } catch (_) {}

  const merged = {
    ...baseConfig,
    app_id: env.APP_ID || baseConfig.app_id,
    api: {
      url: env.API_URL || baseConfig.api?.url,
      version: env.API_VERSION || baseConfig.api?.version,
      language: env.API_LANGUAGE || baseConfig.api?.language
    },
    use_project_subdomain: resolveBoolEnv(env.USE_PROJECT_SUBDOMAIN, baseConfig.use_project_subdomain),
    use_project_domain: resolveBoolEnv(env.USE_PROJECT_DOMAIN, baseConfig.use_project_domain)
  }

  if (!merged.api.url) return null

  cachedBaseConfig = merged
  return cachedBaseConfig
}

const isPreviewHost = (hostname) => {
  if (!hostname) return false
  return hostname.endsWith('.workers.dev') || hostname === 'localhost' || hostname.startsWith('127.0.0.1')
}

const resolveConfigForRequest = async (env, ctx, hostname, baseConfig, origin, requestUrl) => {
  if (isPreviewHost(hostname)) {
    const fallbackProject = env.PROJECT || baseConfig?.project
    if (!fallbackProject) return null
    return { ...baseConfig, project: fallbackProject }
  }

  let project = deriveProjectFromHost(hostname, baseConfig)
  if (env.PROJECT && !project) project = env.PROJECT

  let inactiveProject = null
  if (baseConfig?.use_project_domain) {
    project = await validateProjectViaCurrent(baseConfig, project, env, ctx, origin, requestUrl, (info) => { inactiveProject = info })
  }

  if (!project) project = env.PROJECT || baseConfig?.project
  if (!project) return null

  return { ...baseConfig, project, ...(inactiveProject && { inactiveProject }) }
}

// The page of a project the API blocked for its subscription, on any HTML
// route (503, never cached). A GET from a likely human also counts as a visit.
// A GET of a project that is not archived also asks for the store's look (short timeout, cached).
const serveInactiveProject = async (request, env, ctx, config, info) => {
  const api = config.api || {}
  const apiBase = `${String(api.url || '').replace(/\/$/, '')}/${api.version || 'v400'}/${api.language || 'en'}/${config.project}`
  const accountsUrl = String(env.ACCOUNTS_URL || 'https://accounts.ordering.co').replace(/\/$/, '')
  if (request.method === 'GET' && !isLikelyBot(request.headers.get('user-agent'))) {
    ctx?.waitUntil?.(recordInactiveVisit({ request, project: config.project, apiBase, visitsKey: env.INACTIVE_SITE_VISITS_KEY }))
  }
  const storefront = request.method === 'GET' && !info.archived ? await fetchInactiveStorefront({ request, apiBase, ctx }) : null
  return inactivePageResponse({ request, info, apiBase, accountsUrl, storefront })
}

const isHtmlRequest = (request, url) => {
  if (ASSET_EXTENSIONS.test(url.pathname)) return false
  const accept = request.headers.get('accept') || ''
  if (!accept.includes('text/html') && !accept.includes('*/*') && accept !== '') return false
  return true
}

// Replaced after mergeSeoData by the resolved share image (resolveShareImage):
// never trust the API/fallback's own og:image/twitter:image, which can be
// blank or point at the wrong asset (ORD: implementation notes).
const SHARE_IMAGE_META_KEYS = new Set([
  'og:image', 'og:image:url', 'og:image:secure_url', 'og:image:width', 'og:image:height', 'og:image:type',
  'twitter:image', 'twitter:card'
])

const removedMetasHandler = {
  element (element) {
    element.remove()
  }
}

const buildInjectionHandler = (seoData, firstLoad, runtimeConfig, injectedSeo, geo, bootI18n, shouldNoindex, jsonLd = '') => ({
  element (element) {
    if (shouldNoindex) {
      element.append('<meta name="robots" content="noindex, nofollow">', { html: true })
    }

    if (runtimeConfig) {
      const payload = escapeJsonForScript(runtimeConfig)
      element.append(`<script>window.__CONFIG__ = ${payload};</script>`, { html: true })
    }

    if (firstLoad) {
      const payload = escapeJsonForScript(firstLoad)
      element.append(`<script>window.__FIRST_LOAD__ = ${payload};</script>`, { html: true })
    }

    if (geo?.country_code) {
      const payload = escapeJsonForScript(geo)
      element.append(`<script>window.__GEO__ = ${payload};</script>`, { html: true })
    }

    if (bootI18n) {
      const payload = escapeJsonForScript(bootI18n)
      element.append(`<script>window.__EDGE_XHR__ = ${payload};</script>`, { html: true })
    }

    if (injectedSeo) {
      const payload = escapeJsonForScript(injectedSeo)
      element.append(`<script>window.__SEO__ = ${payload};</script>`, { html: true })
    }

    if (seoData?.metas && Array.isArray(seoData.metas)) {
      for (const meta of seoData.metas) {
        if (!meta || typeof meta.content === 'undefined' || meta.content === null) continue
        const content = String(meta.content)
        if (meta.name && meta.name !== 'title') {
          const managed = meta.name === 'description' ? ' data-react-helmet="true"' : ''
          element.append(`<meta name="${escapeAttr(meta.name)}" content="${escapeAttr(content)}"${managed}>`, { html: true })
        } else if (meta.property) {
          const managed = meta.property === 'og:description' ? ' data-react-helmet="true"' : ''
          element.append(`<meta property="${escapeAttr(meta.property)}" content="${escapeAttr(content)}"${managed}>`, { html: true })
        }
      }
    }

    if (seoData?.links && Array.isArray(seoData.links)) {
      let faviconIdAssigned = false
      for (const link of seoData.links) {
        if (!link || typeof link !== 'object' || !link.rel || !link.href) continue
        const linkWithId = (!faviconIdAssigned && link.rel === 'icon' && !link.id)
          ? { ...link, id: 'favicon' }
          : link
        if (linkWithId.id === 'favicon') faviconIdAssigned = true
        const attrs = Object.entries(linkWithId)
          .filter(([, v]) => v !== null && typeof v !== 'undefined' && typeof v !== 'object')
          .map(([k, v]) => `${escapeAttr(k)}="${escapeAttr(String(v))}"`)
          .join(' ')
        element.append(`<link ${attrs}>`, { html: true })
      }
    }

    if (jsonLd) element.append(jsonLd, { html: true })
  }
})

const escapeAttr = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const isSafeRel = (rel) => /^[a-zA-Z0-9_-]+$/.test(rel)

const titleHandler = (newTitle) => ({
  element (element) {
    element.setInnerContent(newTitle)
  }
})

export default {
  async fetch (request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/.well-known/')) {
      return env.ASSETS.fetch(request)
    }

    // Deploy-check contract; any host. Other methods fall through to the normal routing.
    if (url.pathname === '/version' && (request.method === 'GET' || request.method === 'HEAD')) {
      const commit = /^[0-9a-f]{40}$/i.test(env.WORKER_COMMIT) ? env.WORKER_COMMIT.toLowerCase() : null
      const builtAt = Number.isNaN(Date.parse(env.WORKER_BUILT_AT)) ? null : env.WORKER_BUILT_AT
      return Response.json({ commit, built_at: builtAt }, { headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' } })
    }

    if (url.pathname === '/robots.txt') {
      // GET even for HEAD, so the rules are read; a missing asset comes back as the SPA's index.html with 200, hence the content-type check.
      const assetResponse = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }))
      const sitemapLine = `Sitemap: ${url.origin}/sitemap.xml`
      let body
      if (assetResponse.ok && (assetResponse.headers.get('content-type') || '').startsWith('text/plain')) {
        const text = await assetResponse.text()
        body = /^Sitemap:/im.test(text) ? text : `${text.replace(/\n+$/, '')}\n\n${sitemapLine}\n`
      } else {
        body = `User-agent: *\nDisallow:\n\n${sitemapLine}\n`
      }
      return new Response(body, {
        headers: {
          'content-type': 'text/plain; charset=UTF-8',
          'cache-control': 'public, max-age=3600, s-maxage=3600'
        }
      })
    }

    if (url.pathname === '/sitemap.xml') {
      const sitemapBaseConfig = await loadBaseConfig(env, url.origin)
      const sitemapConfig = sitemapBaseConfig
        ? await resolveConfigForRequest(env, ctx, url.hostname, sitemapBaseConfig, url.origin, request.url)
        : null
      const sitemapFirstLoad = sitemapConfig && !sitemapConfig.inactiveProject
        ? await fetchFirstLoad(sitemapConfig, env, ctx, url.origin, request.url)
        : null
      // a project blocked for its subscription has no sitemap, even if an older one is still cached
      if (sitemapConfig?.inactiveProject || sitemapFirstLoad?.inactive_project) {
        return new Response('Sitemap unavailable', {
          status: 503,
          headers: {
            'content-type': 'text/plain; charset=UTF-8',
            'cache-control': 'no-store',
            'x-robots-tag': 'noindex'
          }
        })
      }
      // a private store lists nothing, even if an older sitemap is still cached
      if (sitemapFirstLoad?.store_private === true) {
        return new Response(EMPTY_SITEMAP, {
          headers: {
            'content-type': 'text/xml; charset=UTF-8',
            'cache-control': 'private, no-store',
            'x-robots-tag': PRIVATE_ROBOTS
          }
        })
      }
      const sitemap = sitemapConfig ? await fetchSitemap(sitemapConfig, env, ctx, url.origin, request.url) : null

      if (!sitemap) {
        return new Response('Sitemap temporarily unavailable', {
          status: 503,
          headers: {
            'content-type': 'text/plain; charset=UTF-8',
            'cache-control': 'no-store'
          }
        })
      }

      return new Response(sitemap.xml, {
        headers: {
          'content-type': 'text/xml; charset=UTF-8',
          'cache-control': `public, max-age=${sitemap.ttl}, s-maxage=${sitemap.ttl}`
        }
      })
    }

    if (!isHtmlRequest(request, url)) {
      return env.ASSETS.fetch(request)
    }

    const baseConfig = await loadBaseConfig(env, url.origin)
    if (!baseConfig) {
      return env.ASSETS.fetch(request)
    }

    const config = await resolveConfigForRequest(env, ctx, url.hostname, baseConfig, url.origin, request.url)
    if (!config) {
      return env.ASSETS.fetch(request)
    }

    // detected through /current (domain hosts): no seo/i18n/first_load work
    if (config.inactiveProject) return serveInactiveProject(request, env, ctx, config, config.inactiveProject)

    const seoPath = mapSeoEndpoint(url.pathname, url.searchParams)

    // Independent of first_load/seo — runs in parallel with them. On a preview
    // host a blocked project is only found by first_load, so this fail-open
    // fetch is wasted there; it is not worth serializing the normal path.
    const bootI18nPromise = fetchBootI18n(config, env, ctx, url.origin, request.url)

    const firstLoad = await fetchFirstLoad(config, env, ctx, url.origin, request.url)
    if (firstLoad?.inactive_project) return serveInactiveProject(request, env, ctx, config, firstLoad.inactive_project)

    const seoConfig = firstLoad?.site?.code
      ? { ...config, app_id: firstLoad.site.code }
      : config

    // the first_load the whole response is made from: the cached one, or (below) the live one of a store
    // that turned private
    let processedFirstLoad = firstLoad

    // the app icon (app_icon, else the isotype) of the theme, and the favicon the theme/site gives
    const faviconSources = (source) => {
      const appIcon = getThemeAppIcon(source?.theme)
      return { appIcon, favicon: resolveTenantFaviconUrl(getThemeFavicon(source?.theme), source?.site?.logo, url.hostname, appIcon) }
    }
    const officialOrderingHost = isOrderingHost(url.hostname)

    const shareBusinessSlug = resolveShareBusinessSlug(seoPath, processedFirstLoad?.theme, processedFirstLoad?.site)
    const shareImagesPromise = fetchBusinessShareImages(seoConfig, shareBusinessSlug, env, ctx, url.hostname)

    // The business the favicon ladder (b/c, implementation notes) may fall back to:
    // the theme's own business on a single-store site. When it is the same
    // business the share image already fetches (shareBusinessSlug), reuse
    // that one promise — never ask the API for the same business twice.
    // only needed when the site has no favicon of its own (level a)
    const faviconBusinessSlug = faviconSources(firstLoad).favicon ? null : getFaviconBusinessSlug(processedFirstLoad?.theme, processedFirstLoad?.site)
    const faviconImagesPromise = !faviconBusinessSlug
      ? null
      : faviconBusinessSlug === shareBusinessSlug
        ? shareImagesPromise
        : fetchBusinessShareImages(seoConfig, faviconBusinessSlug, env, ctx, url.hostname)

    // The `/` of a Full Website. Its store data (landing reads, JSON-LD, hero, SSR) never comes
    // from the cached first_load alone: a store turned private must not keep painting for the cache's TTL
    // (SWR reads included). So a LIVE first_load (no cache read, the landing's time limit) runs in parallel
    // with the reads, and the store's data goes out only when it answers OK with `store_private !== true`.
    const fullHome = url.pathname === '/' && isFullWebsiteTheme(firstLoad?.theme)
    const liveFirstLoadPromise = fullHome && firstLoad?.store_private !== true
      ? fetchFirstLoad(config, env, ctx, url.origin, request.url, { fresh: true, timeoutMs: landingTimeoutMs(env) })
      : null
    // Null without Full Website, for a private store, when the reads fail, and on a kiosk or a Spoonity login
    // (the app does not mount the landing there: the same criterion as the client's).
    const landingPromise = liveFirstLoadPromise && isLandingRequest({ kiosk: config.use_kiosk, search: url.search })
      ? fetchLandingData({ config: seoConfig, theme: processedFirstLoad?.theme, site: processedFirstLoad?.site, env, ctx, hostname: url.hostname })
      : null

    const seoData = await fetchSeo(seoConfig, seoPath, env, ctx, url.hostname)
    const bootI18n = await bootI18nPromise
    const liveFirstLoad = liveFirstLoadPromise ? await liveFirstLoadPromise : null
    // the live read can find the project inactive since the cached one: the inactive page wins, as above
    if (liveFirstLoad?.inactive_project) return serveInactiveProject(request, env, ctx, config, liveFirstLoad.inactive_project)
    // Anything else (a failed read, a timeout, an invalid payload) leaves the page without the store's data.
    const storeVisible = !fullHome || (!!liveFirstLoad && liveFirstLoad.store_private !== true)
    const businessShareImages = storeVisible ? await shareImagesPromise : null
    const faviconBusinessImages = !storeVisible || !faviconImagesPromise
      ? null
      : faviconImagesPromise === shareImagesPromise ? businessShareImages : await faviconImagesPromise

    const landingData = landingPromise && storeVisible ? await landingPromise : null
    // A store the live read found private: no landing (so no theme to mix), and the whole response (the injected
    // __FIRST_LOAD__, the site fallback, the icons...) comes from that live first_load, not the cached public one.
    if (liveFirstLoad?.store_private === true) processedFirstLoad = liveFirstLoad
    const { appIcon: themeAppIcon, favicon: resolvedFavicon } = faviconSources(processedFirstLoad)

    const response = await env.ASSETS.fetch(request)

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return response
    }

    const siteId = processedFirstLoad?.site?.id
    const themeFranchiseId = getThemeFranchiseId(processedFirstLoad?.theme)

    // The favicon ladder: (a) theme favicon → app icon →
    // site.logo → Ordering's on its own hosts (resolveTenantFaviconUrl,
    // unchanged order); without any of those ('', white label), (b) the
    // single-store business's own logo/header, else (d) the bundled generic
    // icon. Computed here (not where it is injected below) so the chosen
    // href can also go into runtimeConfig for the client to apply the same
    // one, with no flicker, when its own first render finds no site-level
    // favicon either.
    // white label with nothing resolved ('') stays '': defaultAssetPath
    // must never be called with an empty path (it would turn it into '/')
    const fallbackFaviconUrl = !resolvedFavicon || isConfiguredBrandAsset(resolvedFavicon)
      ? resolvedFavicon
      : defaultAssetPath(env, resolvedFavicon)
    const fallbackFaviconPath = getFallbackFaviconPath(url.hostname)
    const fallbackPng = fallbackFaviconPath ? defaultAssetPath(env, fallbackFaviconPath) : ''
    const businessFavicon = fallbackFaviconUrl
      ? null
      : businessFaviconLinks({ logo: presentImage(faviconBusinessImages?.logo), header: presentImage(faviconBusinessImages?.header) })
    const genericFaviconPath = defaultAssetPath(env, GENERIC_FAVICON_PATH)
    const fallbackIconLinks = fallbackFaviconUrl
      ? null
      : (businessFavicon || { icon: genericFaviconPath, touchIcon: genericFaviconPath })

    const runtimeConfig = {
      project: seoConfig.project,
      app_id: seoConfig.app_id,
      site_id: siteId,
      api: seoConfig.api,
      use_project_subdomain: seoConfig.use_project_subdomain,
      use_project_domain: seoConfig.use_project_domain,
      ...(themeFranchiseId !== null && { franchiseSlug: themeFranchiseId })
    }

    const seoTitle = getTitle(seoData)
    const siteName = getThemeSiteName(processedFirstLoad?.theme)
    const pageSpecificTitle = seoPath !== '/seo/general' && seoTitle && seoTitle !== siteName ? seoTitle : null

    const siteFallback = buildSiteSeoFallback(processedFirstLoad?.site, request.url, processedFirstLoad?.theme)
    const mergedSeo = mergeSeoData(seoData, siteFallback, {
      preferSite: seoPath === '/seo/general',
      site: processedFirstLoad?.site,
      theme: processedFirstLoad?.theme
    })
    const newTitle = mergedSeo.title
    const mergedDescription = mergedSeo.metas.find(meta => meta?.name === 'description')?.content ?? null
    const mergedOgDescription = mergedSeo.metas.find(meta => meta?.property === 'og:description')?.content ?? null
    const injectedSeo = pageSpecificTitle || mergedDescription || mergedOgDescription
      ? {
          title: pageSpecificTitle,
          description: mergedDescription,
          ogDescription: mergedOgDescription,
          pathname: url.pathname
        }
      : null

    // Always a real image: business/site/theme images by resolveShareImage's
    // ladder, else the bundled generic one — never an empty og:image.
    const apiShareImage = extractApiImage(seoData)
    const genericShareImage = new URL(defaultAssetPath(env, '/og-default.png'), url.origin).href
    const shareImage = resolveShareImage({
      seoPath,
      site: processedFirstLoad?.site,
      theme: processedFirstLoad?.theme,
      business: businessShareImages,
      apiImage: apiShareImage,
      heroImage: landingHeroImage(processedFirstLoad?.theme, landingData),
      origin: url.origin,
      genericImage: genericShareImage
    })
    const seoWithShareImage = {
      ...mergedSeo,
      metas: [
        ...mergedSeo.metas.filter(meta => !SHARE_IMAGE_META_KEYS.has(meta?.property || meta?.name)),
        { property: 'og:image', content: shareImage.url },
        ...(shareImage.width ? [{ property: 'og:image:width', content: String(shareImage.width) }] : []),
        ...(shareImage.height ? [{ property: 'og:image:height', content: String(shareImage.height) }] : []),
        { name: 'twitter:image', content: shareImage.url },
        { name: 'twitter:card', content: 'summary_large_image' }
      ]
    }

    // the favicon with its real type (an SVG one with the bundled PNG before
    // it), PNG apple-touch-icons, the v2 app icon over them (buildIconLinks);
    // without one at all, the business/generic fallback (fallbackIconLinks)
    const enrichedLinks = buildIconLinks({
      seoLinks: mergedSeo.links || [],
      faviconUrl: fallbackFaviconUrl,
      fallbackPng,
      appIcon: themeAppIcon,
      fallbackIconLinks
    })
    // Without a site-level favicon the app applies this href as it is
    // (applyFavicon's fallbackHref): the icon link the worker actually emits
    // (an SEO one, else the business/generic one), so it never swaps it.
    const emittedFavicon = enrichedLinks.find(link => String(link?.rel) === 'icon' && link.href)
    if (!fallbackFaviconUrl && emittedFavicon) runtimeConfig.favicon_fallback = emittedFavicon.href
    // Ordering's own hosts keep the touch icons index.html used to ship
    // statically (ORDERING_TOUCH_ICON_LINKS), each only when no injected link
    // has its rel: the shell's static ones of an injected rel were removed,
    // so the markup stays what it was. Nothing else gets them.
    const injectedRels = new Set(enrichedLinks.map(link => String(link?.rel)))
    const links = officialOrderingHost
      ? [
          ...enrichedLinks,
          ...ORDERING_TOUCH_ICON_LINKS
            .filter(link => !injectedRels.has(link.rel))
            .map(link => ({ ...link, href: defaultAssetPath(env, link.href) }))
        ]
      : enrichedLinks
    const enrichedSeoData = {
      ...seoWithShareImage,
      links
    }

    const linkRels = new Set(
      (enrichedSeoData?.links || [])
        .map(l => l?.rel)
        .filter(r => typeof r === 'string' && isSafeRel(r))
    )

    const storePrivate = processedFirstLoad?.store_private === true
    const shouldNoindex = isOrderingHost(url.hostname) || storePrivate

    const jsonLd = landingData
      ? jsonLdScriptTag(landingJsonLd({
        mode: landingData.mode,
        name: siteName || pickNonEmptyString(processedFirstLoad?.site?.name),
        description: mergedDescription,
        logo: processedFirstLoad?.site?.logo,
        origin: url.origin,
        business: landingData.business,
        franchiseBusinesses: landingData.franchiseBusinesses
      }))
      : ''

    // The per-rel link removals run before the head injection: only the
    // shell's own static links (favicon, apple/android/windows-touch-icon)
    // are ever removed, never what gets injected below.
    const rewriter = new HTMLRewriter()
      .on('meta[name="description"]', removedMetasHandler)
      .on('meta[name="author"]', removedMetasHandler)
      .on('meta[name="generator"]', removedMetasHandler)
      .on('meta[property^="og:"]', removedMetasHandler)
      .on('meta[name^="og:"]', removedMetasHandler)
      .on('meta[name^="twitter:"]', removedMetasHandler)

    if (shouldNoindex) {
      rewriter.on('meta[name="robots"]', removedMetasHandler)
    }

    for (const rel of linkRels) {
      rewriter.on(`link[rel="${rel}"]`, removedMetasHandler)
    }

    // The landing painted on the server: before `#root`, with the page's data and the guard
    // that drops it if the app does not take it over. Null (the page as ever) without data or on a failure.
    const landingSsr = await landingSsrInjection({
      landingData,
      theme: processedFirstLoad?.theme,
      site: processedFirstLoad?.site,
      config: seoConfig,
      firstLoad: processedFirstLoad,
      bootI18n,
      request
    })
    if (landingSsr) {
      rewriter
        // the shell's "enable JavaScript" notice would show above a page that works without it
        .on('body > noscript', removedMetasHandler)
        .on('#root', { element (element) { element.before(landingSsr, { html: true }) } })
    }

    rewriter
      .on('head', buildInjectionHandler(enrichedSeoData, processedFirstLoad, runtimeConfig, injectedSeo, { country_code: request.cf?.country || null }, bootI18n, shouldNoindex, jsonLd))
      .on('title', titleHandler(newTitle))

    const transformed = rewriter.transform(response)
    const finalResponse = new Response(transformed.body, transformed)
    finalResponse.headers.set('cache-control', 'private, no-store, no-cache, must-revalidate, max-age=0')
    finalResponse.headers.set('cdn-cache-control', 'no-store')
    if (storePrivate) {
      finalResponse.headers.set('cache-control', 'private, no-store')
      finalResponse.headers.set('x-robots-tag', PRIVATE_ROBOTS)
    }
    return finalResponse
  }
}
