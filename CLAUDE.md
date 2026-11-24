# CLAUDE.md

Guidance for agents working on **Ordering Website**, the customer storefront for marketplaces, brands and franchises, and single restaurants.

## Repositories

This is the customer ordering website for Ordering.co. Start with [README](README.md) and the public [setup guide](setup.md).

The shared Ordering components are a Git submodule at `src/@/components`. Use a recursive clone or run `git submodule update --init --recursive`.

**Stack:** React 18, Vite, styled-components, Tailwind CSS 4 and Base UI. Use Node 24 and pnpm 9.15.0.

## Website configuration

For site types, ordering routes, theme states and screen variants, read [the configuration guide](docs/website-configuration.md) and [`ordering-website-configuration`](.claude/skills/ordering-website-configuration/SKILL.md). Use the design skill as well when changing UI, styling or tokens. The two skills are available under `.claude/skills/`, `.agents/skills/` and `.cursor/skills/`.

## Design system and UI design

**Every new or changed UI (a screen, component, style or visual value) follows the `ordering-website-design` skill** (`.claude/skills/ordering-website-design/`; Codex reads it from `.agents/skills/`, Cursor from `.cursor/skills/`, symlinks to the same folder), together with `docs/THEMING.md`. There is no "small fix" exception to following it: the skill itself says when a fix stays legacy and when there is no design decision.

- Keep the design token values driven by the store theme and verify each affected layout with the design skill.
- New UI is built with the base pieces in `src/ui/src/design-system/components/` (shadcn on Base UI + Tailwind 4, `ui:` prefix, no Preflight) reading the store's theme through the generated `--ot-*` catalog. Rules (never literals, never `styled(Button)`, how pieces read `components.*` and `scope`, icons, verification): `references/design-system.md` of the skill. styled-components stays for legacy code.

## Commands

```bash
pnpm install              # installs deps + initializes submodule
pnpm start                # dev server :3000 (alias: pnpm dev)
pnpm build                # production build → dist/ (copies src/config.json)
pnpm preview              # serve dist/ on :3000
pnpm lint                 # eslint . --fix (pre-commit via husky)
pnpm lint:check           # eslint . (CI)
pnpm test                 # vitest --run (one fork, VITEST_MAX_WORKERS=n for more; 4096 MB heap)
pnpm test:coverage        # same + v8 coverage (Full CI Quality Gate)

```

## Architecture overview

```
src/
├── index.js, App.js, router.js     # boot, routes, shell
├── pages/                          # route screens (compose ~ui components)
├── components/                     # app-only (HelmetTags, Sentry, LazyRetry…)
├── contexts/                       # app-only (CookieConsentContext)
├── utils/                          # app-only helpers
├── theme.compiled.json             # compiled schema: defaults + rules + product_type/version (pnpm theme:compile)
├── config.json / config.js       # tenant + API settings
├── shims/network-boot.js           # worker boot XHR/geo shims (imported first)
├── ui/                             # PRESENTATION — edit here for UI/UX
│   ├── src/components/             # ~169 wired components (index.js + styles.js)
│   ├── src/styles/                 # Buttons, Inputs, Select, Tabs…
│   └── hooks/                      # useWindowSize, useOnlineStatus…
└── @/components/                   # SUBMODULE — logic only, do NOT edit from here
    └── src/                        # controllers, contexts, SDK (see submodule CLAUDE.md)
```

### Controller + UIComponent pattern (critical)

The app splits **logic** (submodule) from **presentation** (this repo):

1. **Controller** (`src/@/components/src/components/*`) — fetches data, manages state, renders `<UIComponent {...computedProps} />`. **No styled-components, no theme markup.**
2. **UI layer** (`src/ui/src/components/*`) — JSX + `styles.js`. Wires controller to local skin.

```js
// src/ui/src/components/Cart/index.js
import { Cart as CartController } from '~components/components/Cart'

const CartUI = (props) => { /* JSX using props from controller */ }

export const Cart = (props) => (
  <CartController {...props} UIComponent={CartUI} />
)
```

**Pages** (`src/pages/*`) compose wired `~ui` components into screens. They may use contexts directly but should not duplicate controller logic.

### Path aliases (vite.config.js + jsconfig.json)

| Alias | Resolves to |
|-------|-------------|
| `~components/*` | `src/@/components/src/*` |
| `~ui/*` | `src/ui/*` |
| `~ui-icon` | `src/ui/src/components/Icon` |
| `~/` | `src/` |

## Where to edit — decision guide

| Task | Edit here | Do NOT edit |
|------|-----------|-------------|
| Change how cart totals are calculated | Submodule controller or context | — |
| Change cart layout, colors, copy | `src/ui/src/components/Cart/` | Submodule |
| New marketplace page/route | `src/pages/` + route in `src/App.js` | Submodule |
| New reusable marketplace component | `src/ui/src/components/NewThing/` (+ wire to controller if needed) | Submodule barrel |
| Theme colors/fonts | `product.schema.json` (defaults) / the site's theme | Hardcoded hex in components |
| SEO / first-load / caching | `worker/seo.js`, `worker/index.js` | `public/.htaccess` on Cloudflare |
| Tracking-only site mode (site setting `site.tracking_only`) | `src/components/TrackingOnlyRoutes`, `src/ui/src/components/OrderDetails/layouts/Tracking`, `src/utils/trackingOnlyMode.js` — see `docs/TRACKING_ONLY_MODE.md` | Hardcoding client branding or map keys |
| Translation keys for UI strings | `src/ui` (use `t('KEY', 'Fallback')`) | Submodule (unless fixing shared typo — open PR in ordering-components) |
| API request shape / SDK | Submodule `sdk/` | App code duplicating SDK calls |

### EDIT BOUNDARY — critical

**Edit `src/ui`, `src/pages`, `src/components` — NOT `src/@/components`.**

The submodule is shared across many Ordering/Finitless apps. It is in `.eslintignore`. If behavior must change:

1. Prefer adapting the UI layer or passing props to the controller's `UIComponent`.
2. If the controller itself must change, open a PR in [ordering-components](https://github.com/Finitless-com/ordering-components), not in this repo's submodule checkout.

## Import rules — first-load performance

The entry chunk was once 3.3 MB from barrel imports. It is now ~240 kB gzip. **Do not regress.**

1. **NEVER** `import { X } from '~components'` or `'~ui'` in app code. Always deep-import:
   - `~components/contexts/OrderContext`
   - `~components/components/Cart`
   - `~ui/src/components/Overlay/lazyOverlay`
2. **Lazy-load heavy, interaction-gated UI.** Login/signup, cart popover, address forms, sidebar, moment pickers, review modals use `loadable(() => import('...').then(m => m.X))` in `Header`, `NavigationBar`, `App.js`. New modals/popovers with firebase/swiper/maps/datepickers must follow this pattern.
3. Vendor chunks pinned in `vite.config.js` `manualChunks` (react / styled / socket.io).
4. Trace eager graph from `src/index.js` — no firebase/@stripe/swiper/moment/maps/@segment/@sentry/datepicker in the entry chunk (socket.io-client is the known exception via WebsocketContext).

## Boot shims (`src/shims/network-boot.js`)

Imported **first** in `src/index.js`. The worker injects `window.__GEO__` and `window.__EDGE_XHR__`; shims answer the submodule's blocking boot requests instantly. **Fail-open:** without globals (plain dev), requests pass through. Worker logic: `worker/seo.js`.

Boot `SpinnerLoader` in `App.js` uses `delayMs={600}` — only shows if boot exceeds 600 ms.

## Theme & styling

**Read [`docs/THEMING.md`](docs/THEMING.md) before styling anything**: stay inside the theme's tokens, which token fits each purpose, and when to reuse a component, a primitive or a token versus adding a property or a component to the schema. When you add or change something it describes (the schema's tokens or components, a theme helper, a shared primitive, a token rule), update it in the same change so it always tells the truth. Rewrite it in place: it describes the current state and is never a changelog (no dates, versions or "was/now" notes).

- The theme is version 2 only. `product.schema.json` (repo root) is the schema of everything the web reads: the theme (tokens, components, visibility, images, pages; saved per theme) and `site` (site settings; saved per site). Adding a themable component, layout, visibility key, image or site setting means adding it there in the same PR, then `pnpm theme:compile`, which writes `src/theme.compiled.json` (`pnpm theme:verify` checks it is current).
  - It is in the theme engine's node format (`$value`, `$type`, `$extensions["co.ordering"]`), documented by the engine (`@orderingco/ordering-theme-engine`; where to read it: `docs/THEMING.md`). It is edited only here; api-core does not keep a copy: this repo publishes it (`pnpm theme:publish`). The editor's texts, groups and controls go in `$extensions["co.ordering.editor"]`.
  - Read it only through `src/utils/themeSchema.js` (`schemaEntry`, `schemaDefault`, `schemaOptions`, `schemaKeys`), which reads nodes and tuples alike. App code imports just the block it needs and passes it to `themeSchemaReader.js`; the build bundles it without the editor's metadata.
  - `pnpm theme:validate` checks it with api-core's engine (`@orderingco/ordering-theme-engine`, a pinned dev dependency; CLI `ordering-theme validate`): the meta-schema, api-core's checks and the editor's. CI runs it with `theme:verify`.
  - The web sends its schema's `product_type` and `version` (`theme_schema_version`) with every theme request (worker first_load and its cache key, the boot shim, `GET theme` in `src/utils/remoteTheme.js`), read from `src/theme.compiled.json` (`pnpm theme:compile`; `theme:verify` checks it). Never write the product type by hand. api-core cuts a theme of a newer schema down to that version.
  - This repo publishes it to api-core (`pnpm theme:publish`, `ordering-theme publish`; README "Publishing it"): every change needs a new `version`; which number to bump is in the engine's docs (`creating-a-schema.md` §6, `schema-format.md` §13–15). `pnpm cf:deploy:<env>` (`scripts/cf-deploy.mjs`) publishes it with `--required` before `wrangler deploy`, each only to its own environment's API (`THEME_PUBLISH_API_<ENV>` / `THEME_PUBLISH_KEY_<ENV>`); `THEME_PUBLISH_SKIP=1` deploys without publishing. A smoke test follows the deploy and rolls the worker back if it fails (README "Deploy to Cloudflare Workers").
- `src/utils/appTheme.js` builds the app theme: `{ values, css, themeMeta }`, where `theme.values` is the site's theme completed by the engine's runtime (`complete` of `@orderingco/ordering-theme-engine/runtime`, the version pinned in `package.json`) with `src/theme.compiled.json`, by api-core's own rules: every key of the schema, a value the web does not understand is the default, a number is clamped to its range, a key the schema lacks is dropped; an image without a URL is the bundle's. `THEME_DEFAULTS` (`complete(compiled, null)`) is the schema's defaults. Readers rely on that and do not re-check options or ranges. `theme.css` is the same theme as CSS (`toCss` of `@orderingco/ordering-theme-engine/css`, once per theme): components paint from it (`getThemeCss`) and read `theme.values` only to compute; never build a theme by spreading values (its CSS would be stale). It is built once per first_load envelope (`src/index.js` and `App.js` share it). Read it with the helpers: colors `themeColor`, text `themeText`, radius `themeRadius`, visibility `themeVisible`, images `themeImage`, component props `themePart` / `getThemeCss` (CSS) and `themeValue` (values) (`src/utils/themeTokens.js`, `themeCss.js`, `themeColors.js`, `themeVisibility.js`), site settings `src/utils/siteSettings.js`. Bundled non-theme images: `src/utils/bundledImages.js`. Bundled non-theme images: `src/utils/bundledImages.js`.
- `src/index.js` wraps the app in styled-components `ThemeProvider` with the defaults theme; `App.js` rebuilds it with the site's theme (`useSiteThemeFallback` in `src/utils/remoteTheme.js`).
- Component styles in sibling `styles.js`; read tokens via `useTheme()` or props.
- Shared primitives: `src/ui/src/styles/` (Button, Input, Select, Switch, Tabs…).

## i18n

- Use `const [, t] = useLanguage()` from `~components/contexts/LanguageContext`.
- Always pass a fallback: `t('ADD_TO_CART', 'Add to Cart')`.
- Keys used in `src/ui` are owned by this repo. Keys in submodule strings are owned by ordering-components.
- Full key export workflow: `i18n/README.md` — locales SSoT in `i18n/config.json`; catalog in `i18n/translations.json`. Run `pnpm i18n:generate` after string changes; `pnpm i18n:verify` checks key + locale completeness. Fill missing locales with the project skill `.cursor/skills/translate-keys` (`pnpm i18n:missing` → fill batch → `pnpm i18n:apply-batch … --strict`). i18n verify runs in **Lint & validations** and blocks **CI Quality Gate** when it fails. Catalog → API: `pnpm i18n:sync` (dry-run default); `pnpm i18n:sync:live` only in Phase 7 after api-core upsert is merged.

## Cloudflare Worker (`worker/`)

`worker/index.js` + `worker/seo.js` run before static assets (`run_worker_first` in `wrangler.toml`):

- Resolves project/tenant from host, merges runtime config.
- Fetches SEO + first-load data, injects into `index.html` (`window.__FIRST_LOAD__`, `window.__CONFIG__`).
- SPA fallback and caching. Tunables in `wrangler.toml` `[vars]`.
- Every per-host Cache API entry (`/current`, first_load, SEO, sitemap) carries `Cache-Tag: host-<hostname>` (`hostCacheTag`); api-core purges by those tags. i18n is per project, untagged. Never cache a non-2xx or `error: true` answer. Bump `CACHE_VERSION` when the entry format or tagging changes.

## Configuration

Follow [setup.md](setup.md) to connect a local checkout to an authorized Ordering project. Keep your local config and environment files out of source control.
