# Full Website + Online Ordering

Turns a site of this marketplace into a restaurant website: a marketing home page built from the store's own info, with online ordering one click away. The other experience, **Online Ordering Only**, keeps opening on the menu as before.

## How it is activated

The switch is the site setting `site.experience`, saved per site with the rest of the site settings.

- `ordering_only` (the default): the site opens on the menu. A site that never saved the key reads this.
- `full_website`: the site opens on its marketing home page. api-core saves it when it creates a new site (planned, api-core issue).
- `site.tracking_only` wins over both: a tracking-only site never counts as a full website.

In `product.schema.json` both settings are in the group `type` ("Website type") of the editor section `site` ("Website settings"). The app reads the experience with `isFullWebsite(theme)` (`src/utils/siteSettings.js`).

`site.main_store` is the id of the store whose story, dishes, photos and reviews the home page shows (`null` by default). It only applies to a Franchise site with `full_website`. The schema shows it with `full_website` (`visible_if` on `site.experience`, which takes one condition only); the dashboard hides it outside franchise sites. api-core validates it (`main_store.required`, `.exists` and `.franchise`; planned, api-core issue). Other site types use their single store.

The dashboard (Website settings, planned) puts the "Recommended" label on the `full_website` option and the main store selector (shown only for franchise sites) by each key's path, because the theme engine supports neither `badge` nor a `main_store` control.

## The home page

`pages.landing` ("Home page (Full Website)", in the editor group Shopping) lists the sections of the marketing home page. Like any page, the theme can reorder and hide them.

| Section | Notes |
|---------|-------|
| `hero` | First, fixed: it cannot be hidden or moved. |
| `featured`, `locations`, `about`, `services`, `gallery`, `reviews`, `visit` | The store's dishes, story, services, locations, photos, reviews and how to visit. |
| `categories`, `popular_stores`, `how_it_works`, `app`, `partner` | Store categories, popular stores, the ordering steps, the app download and the partner sign-up. |

That is the default order. All of them are visible and hideable (but the hero), in the group `main` ("Under the hero"). Each section will also hide itself when it does not apply to the site or the main store has no data for it (planned, with the page's components).

## Routes

`menuPath(theme, settings)` (`src/utils/siteSettings.js`) is the path of the menu: `/order` with a full website, `/` otherwise. Every internal "back to the menu" fallback of `src/App.js` uses it.

| Route | Online Ordering Only | Full Website |
|-------|----------------------|--------------|
| `/` | The menu home: the store (single store), the franchise's store selector or the marketplace's home. With the Spoonity login in the query, the login. | The marketing home page (`src/pages/Landing`, the sections of `pages.landing`). Public: it does not ask to verify. The kiosk (`use_kiosk`) and a Spoonity login in the query take its place (`isLandingRequest`, `ssrSwap.js`): the kiosk's menu or the login, and the client takes the server's paint out as they mount. |
| `/order` | Not a route: it falls to `/:business_slug`. | The menu home, as `/` is in Online Ordering Only, plus the Spoonity login and the custom order. |
| `/home` | The menu home (with the custom order). | Redirects to `/order`, keeping the query. |

The menu home decides in this order: verify (`/verify`, unless guest checkout), kiosk (the menu), Spoonity login (full website: it goes on to `/order` when it ends), custom order (`custom_order_enabled`: the menu even with a single store or an address; `/home` in Online Ordering Only, `/order` in Full Website), the redirect to the order's location, the single store, the menu home.

A store whose address would be the menu's (slug `order`, or `home`, with the template `/:business_slug`) goes to `/store/<slug>` on a full website (`singleStorePath(site, slug, { fullWebsite })`, `shortStorePath`, `singleBusinessHomePath` in `src/utils/singleStore.js`); in Online Ordering Only nothing changes. Redirects (`singleBusinessHome`, the order's location) and the cards of Our locations use it.

The routes of the home live in `src/components/MenuHomeRoutes` (`menuHomeRoutes`), which `App.js` places before `/:business_slug`. `pageForPath(pathname, { fullWebsite })` (`src/utils/themePages.js`) maps `/` to the page `landing` and `/order` to `home` with a full website, so a page's footer follows the right page. The Landing page paints one empty slot per visible section, in the theme's order; each section fills its slot in its own issue.

## First paint on the server (render-and-swap)

On `/` the Worker answers the page already built, so the first paint is the real page, not an empty shell:

- `pnpm build` also runs `vite build -c vite.ssr.config.js`, which bundles `src/pages/Landing/ssr/render.jsx` into `worker/generated/landing-ssr.mjs` (not versioned; `wrangler.toml` uploads it as a module of its own).
- `worker/landingSsr.js` (`landingSsrInjection`) calls `renderLanding` with the store data the Worker already read (`worker/landingData.js`; for a Franchise, the list of stores and the main store's reads), the site's theme, configs and translations, and puts before `#root`: the theme's font `<link>`s (`<role>-font-styles`, as App.js adds them, so the first paint already has the fonts; the guard script gives them the `name` App.js compares and the body family, so App.js keeps them), `#landing-ssr-style` (hides `#root`, plus the server's CSS), `#landing-ssr` (the markup), `window.__LANDING__` (the store's public data) and a small guard script. Any failure leaves the page as it was.
- Nothing hydrates. The app renders its own copy: `LandingPage` seeds the hooks' cache (`seedLanding`: `useStoreLanding`'s and, for a Franchise, `useFranchiseStores`') with `window.__LANDING__` before its first render (stale, so the hook refreshes it quietly on mount) and, in a layout effect, removes the server's node and style (`src/pages/Landing/ssrSwap.js`). The guard drops them if the app leaves `/` before mounting the landing (kiosk, login in the query) or, after 10 s, when `#root` already holds the app's own page; an empty `#root` keeps the markup (never a blank page). The server render uses the request's host (siteBranding), the visitor's time zone (`request.cf.timezone`; the store's own when Cloudflare gives none or an unknown one) and the translated AM/PM, so the hours, and the zone label that appears when the store's zone differs from the visitor's, read the same after the swap.
- `window.__LANDING__` (One store and Franchise) is `{ business, featured, services, reviews, franchiseStores? }`, each in the shape `useStoreLanding` documents for its `data` (or null when that read failed): the same public reads (`src/pages/Landing/landingReads.js`, shared by the hook and the Worker), reviewers reduced to name and last-name initial, and `business.reviews` reduced to `{ total, reviews_count }` (never the list of reviews). `franchiseStores` (Franchise only) is the list of `franchises/{id}/businesses` (objects only, each id once) picked to the fields `useFranchiseStores` reads; the client refreshes it quietly on mount. The Worker pages the list as the client does (100 per page, the API's maximum) up to `FRANCHISE_MAX_PAGES` (3 pages, 300 stores): when the cap is reached with pages left, `franchiseTruncated` is true and the franchise gets no server paint rather than cards that change after the swap. The main store's reads (`business`...) are those of the store `site.main_store` names in that list, else the first (the client's `resolveMainStore`); in a cut list that does not hold the named store the Worker cannot confirm which one the client will pick, so it reads none (and the share image does not use a branch's header). They seed the cache only when `business` is the store the client resolves as main. The Worker reads all of it with the Cache API (`LANDING_TTL`, 120 s; the reads past the limit still finish and write it) within `LANDING_TIMEOUT_MS` (1500 ms); past it, or when the store (One store) or the list of stores (Franchise, which may be empty) cannot be read, there is no server paint. The cache keys are versioned (`v=2`) and carry the host (and its purge tag), the API root (base URL, version, language, project) and the site identity (`app_id`, the `X-App-X`), so a change of any of them does not read another site's entries.
- Privacy and kiosk. The Worker never emits the store's data (server markup, `window.__LANDING__`, JSON-LD, the hero as og:image, the business images of the favicon and share-image ladders) from the cached first_load alone. On `/` of a Full Website it runs a LIVE first_load (`fetchFirstLoad(..., { fresh: true })`: it does not read the cache, it rewrites it with what it got) in parallel with the landing reads, within `LANDING_TIMEOUT_MS`, and emits the store's data only when it answers OK with `store_private !== true`. A non-OK answer, an invalid payload, an exception or a timeout leaves the shell without the store's data (the page itself still ships); a live `store_private: true` also adds the private noindex and headers. The extra read adds no step to the critical path while it is no slower than the landing reads and the SEO read it runs beside; a cold landing cache hides it, a warm one makes it the slowest read of `/` (one round trip to first_load). The Worker also skips the landing when the app would not mount it: a kiosk (`use_kiosk` of the served `config.json`, the same file the client bundles as `settings.use_kiosk`) or the Spoonity login in the query (`isLandingRequest`, `src/pages/Landing/ssrSwap.js`, shared with the client).
- Only `/` with `full_website`; every other route, and Online Ordering Only, ship the HTML as before. The bundle is loaded with a dynamic import, so other routes do not evaluate it on a cold start.
- The same `/` also carries the page's JSON-LD and the hero's `og:image`: see `docs/SEO_METADATA.md`.
- What depends on the visitor is not asked on the server: the marketplace's sections paint their skeletons; a phone (`Sec-CH-UA-Mobile` or user agent) renders with a phone's width for the theme's platform values.
