# SEO metadata contract

How this web emits its description metadata: who owns each tag, where a description comes from, and the regression tests that hold it. Read it before changing metadata in `worker/` or `src/components/HelmetTags`. In another product, carry over the principles explicitly and check that product's implementation instead of assuming it shares this architecture.

## Sources of a description

- The site's description is the theme's `site.description` (`siteDescription(theme)` in `src/utils/siteSettings.js`; `getThemeSiteDescription` in `worker/seo.js`), else the API site's `description` (first_load `site` in the Worker, `SiteContext` in the SPA).
- Every candidate goes through `resolveSeoDescription` (`src/utils/seoDescription.js`, shared by the Worker and the SPA, dependency-free): the first trimmed, non-blank value that is not a known template. The templates are exact old shell and route placeholders, compared trimmed and case-insensitively; they are never customer copy and must not mask a valid candidate. Text that only mentions the provider is customer copy and is kept.
- There is no last-resort description. When no source has a valid one, neither the Worker nor the SPA emits `description` or `og:description`, and `index.html` ships none. Do not add vendor text as a fallback and do not append provider suffixes to descriptions.

## Ownership and precedence

- The Worker owns the initial HTML. It removes the shell's description, `og:*` and `twitter:*` tags and injects the merged metas; `description` and `og:description` carry `data-react-helmet="true"` so React adopts them instead of appending duplicates. It also injects `window.__SEO__` (`title`, `description`, `ogDescription`, `pathname`) on every route that has a page-specific title or a description, `/seo/general` included.
- In the Worker merge, general routes (`/seo/general`) prefer the site's description and keep valid SEO API data when the site has none; page-specific routes prefer valid SEO API metadata and use the site's description to fill gaps. After both sources, a missing `description` takes the valid `og:description` and a missing `og:description` takes the valid `description`; nothing else fills them.
- Explicit page instances of `HelmetTags` own the client descriptions. The global instance without `page` emits no `description` or `og:description`, so it cannot compete even when its lazy chunk mounts last.
- An explicit page renders its descriptions as soon as it mounts, before the site has a name; the title waits for the site's name. Injected metadata is reused only on its matching pathname.
- React description precedence: page props (`helmetMetaTags.description`), matching injected description, the site's description, matching injected OG, then the route's `helmetdata.json` description. Route descriptions are real copy (`tracking_home`), never placeholders.
- OG precedence: page `helmetMetaTags.ogDescription`, matching injected OG, then the effective description. A later normal-only update (`onChangeMetaTag` loads a title and a description, never an OG) must not erase distinct OG copy.
- Every route must have an owning page instance. `/pages` (PagesList, `page='pages'`) and PageNotFound (`page='page_not_found'`) own `HelmetTags`; without an owner, the global commit deletes the Worker-managed descriptions and they never come back.
- The 404 route uses the `page_not_found` metadata plus `robots='noindex, nofollow'`. On customer hosts `robots` is page-owned (the global instance emits none), so a late global commit cannot reset a page's `noindex`. On provider hosts every instance emits `noindex, nofollow`, and so does the Worker.
- Scope limitation: route owners fix persistently missing descriptions on their routes. They do not guarantee metadata during the brief gap between the global commit and the mount of a lazy page chunk.

## Canonical tags

- Normalize equivalent API representations before filtering, deduplication and HTML injection: `og:*` uses `property`; `twitter:*` and `description` use `name`. The opposite attribute is removed from a normalized copy; the source data is never mutated.
- Filter blank and template descriptions whether `description`, `og:description` or `twitter:description` arrives in `name` or `property`. Keep valid, distinct customer OG and Twitter copy.
- Apply source precedence to canonical identities, not to raw attribute spelling. An invalid early candidate must not block a later valid one. Do not create a Twitter description to fill a missing one.
- Normalization and filtering run on every request over the API answers; they do not change what the Worker's Cache API stores.

## Full Website home (`/`)

- Only on `/` of a site with `site.experience = full_website` (not tracking-only), the Worker adds the page's JSON-LD to the head (`worker/structuredData.js`, `landingJsonLd`): `Restaurant` for One store (name, address, geo, phone, opening hours, `aggregateRating` only with reviews, `hasMenu` → `/order`), an `Organization` plus one `Restaurant` per store for Franchise (`GET franchises/{id}/businesses`), `WebSite` plus `Organization` for Marketplace. It never carries individual reviews or reviewer data, and the script content escapes `<`, `>`, `&`, U+2028 and U+2029. Like the rest of the home's store data (the hero as og:image, the server markup), it is emitted only when a live first_load of that request (not the cached one) answers OK with `store_private !== true`, and not on a kiosk or with the Spoonity login in the query (docs/FULL_WEBSITE.md, "Privacy and kiosk"). The hero is the main store's header; a franchise whose main store cannot be confirmed (a list cut at the Worker's page cap that does not hold `site.main_store`) has no hero, so og:image falls to the site's images and never to another branch's header.
- `og:image` there is the hero's photo (`heroImage` of `resolveShareImage`: the store's `header`, the main store's for Franchise, the theme's `images.home_hero` for Marketplace), the fallback of the owner's explicit choices (`site.social_share`, then the general SEO API image: they win), before the backups. An empty, legacy-placeholder or bundled generic API image is not a choice and does not cover it. Still one `og:image`/`twitter:image`, same rules as every route.
- Any other route, and Online Ordering Only, keep the head exactly as before. The page's server render is in `docs/FULL_WEBSITE.md`.

## Regression evidence

Keep regression cases in `src/utils/__tests__/seoDescription.test.js`, `src/components/HelmetTags/__tests__/HelmetTags.test.jsx`, `src/__tests__/worker/seoDescriptions.test.js` (merge) and `src/__tests__/worker/seoInjection.test.js` (initial HTML). The Full Website home's JSON-LD, hero image and unchanged head elsewhere live in `src/__tests__/worker/structuredData.test.js`, `landingData.test.js` and `landingInjection.test.js`. Route ownership lives in the page suites `src/pages/PagesList/__tests__/PagesList.test.jsx` and `src/pages/PageNotFound/__tests__/PageNotFound.test.jsx`. Cover both mount orders, including a late global instance at an earlier JSX position; asynchronous page metadata updates; navigation with stale injection; pages before the site has a name; real route descriptions; empty, template and custom inputs; the absence of any description when nothing is configured; name/property aliases in both orders; uniqueness; and safe attribute and script escaping.

Use Node 24 and pnpm. Validate the affected tests and the Worker's initial HTML as well as the resulting React head. Use fixtures or an authorized test project; do not modify production settings to force a scenario. A passing CI run is not proof that untested representations or lifecycle orders work, and a local source check is not proof of a production deployment or of search-engine indexing.
