# Theming: the central rule

The source is [`docs/THEMING.md`](../../../../docs/THEMING.md); this file points to its sections and shows how to apply them while designing. It does not copy them: when they disagree, THEMING.md wins. The precedence of what a store configures is in [the section below](#what-a-store-configures-and-who-wins), the one place that lists it. How base pieces read it, and when a control uses a piece or its legacy primitive: [design-system.md](design-system.md).

## The rules, by section

| Rule | THEMING.md | In practice |
| --- | --- | --- |
| Every visual value comes from the theme; the theme arrives complete and valid | §1 | Do not re-check options or ranges and do not write fallbacks that duplicate a default. |
| What the theme sets is not overridden in the front | §1 | If it looks wrong with the defaults, the fix is the schema default, not CSS. |
| No token or property fits: do not invent a value | §1 | Follow the TOKEN-GAP list ([design-system.md](design-system.md#when-no-token-fits-token-gap)): a literal that is not a level goes through the px map (3b); otherwise closest token, `TOKEN-GAP(<issue>)`, listed in the hand-back. |
| Read through the helpers, never `product.schema.json` from app code | §3 | `src/utils/themeTokens.js`, `themeColors.js`, `themeCss.js`, `themeVisibility.js`, `themePages.js`, `siteSettings.js`. |
| Reuse order: component property, shared primitive, token, new property, new component | §4 | Stop at the first step that fits. A new token name is never an option. |
| Right token for the purpose, not for today's value | §5 | `surface` for anything that floats, `background` only for the page canvas; `*_text` for color as text, `on_*` for text on a fill. |
| Adding to the schema | §6 | Same PR as the code; flag it (below). |
| Don'ts | §7 | Literals, derived colors in a component, inline `theme.values...`, a second primitive, hover on non-clickable things. |

## Correct and incorrect

Paths are real; check a helper's signature in its file before using it.

| Need | Incorrect | Correct |
| --- | --- | --- |
| Card background | `background: #fff;` | `themePart(theme, 'card', { background: 'base.background' })` (`themeTokens.js`), or `themeColor(theme, 'surface')` when the spot has no component property |
| Gap between form fields | `gap: 12px;` | `themeSpace(theme, 'md')` |
| A store card's name color | `themeColor(theme, 'text')` | `business_card.base.name_color` through `themePart` (§4 step 1) |
| Radius of a control | `border-radius: 8px;` or `themeRadius(theme, 'md')` when the component has its own | `themeRadius(theme, 'md', 'button')`: applies Identity and the component's own value |
| Shadow on hover | `box-shadow: 0 2px 8px rgba(0,0,0,.2)` | `themeShadow(theme, 'md', { fixed: true })` for a state that keeps its level |
| Link color on the page | `themeColor(theme, 'primary')` (can fail AA on a pale background) | `primaryText(theme)` (`themeColors.js`): derived legible over `background`, `surface` and `primary_subtle`; not on `surface_alt` |
| Text on a primary button | `color: #fff;` | The base `Button`, which already paints it; `onPrimary(theme)` only where the spot is not a button |
| Translucent scrim | `rgba(0,0,0,.5)` | `themeScrim(theme)`; a color with alpha: `withAlpha(color, amount)` |
| Font | `font-family: Inter` | `themeFontFamily(theme, 'body')`, `themeText(theme, 'body')` |
| Icon size | `size={20}` | `themeIconSize(theme, 'md')` |
| Control height | `height: 44px` | `themeControlHeight(theme, 'button', 'md')` |
| Box of a logo, thumbnail, portrait, map or banner | `width: 75px; height: 75px;` | `themeMedia(theme, '3xs')`: the media scale of `px-map.md` («Medios»); a banner, map or photo is fluid, not a level |
| Transition | `transition: .2s ease` | `motionCss` / `stateMotionCss` (`themeMotion.js`, respects reduced motion) |
| A store's hidden element | Showing it because the new design has room | `themeVisible(theme, 'header.cart')` (`themeVisibility.js`); page sections via `themePages.js` |
| Image | A new bundled hero | `themeImage(theme, key)`; bundled fallback only through `src/utils/bundledImages.js` |
| Chevron | A new inline SVG | `ChevronIcon` (`src/ui/src/styles/Chevron`) |
| Dialog or box inside a group | Restyling it by class | `ComponentScope group='product_modal'` (`src/ui/src/styles/ComponentScope`) |
| A control that has a base piece | The legacy primitive of `src/ui/src/styles/` where a base piece exists | The base piece (the table [The pieces](design-system.md#the-pieces)); the legacy primitive only for a control with no piece, or a fix that leaves its look unchanged ([design-system.md](design-system.md#piece-or-legacy-primitive)) |
| Primary button on new UI | `className="ui:bg-[#E3141A]"`, `ui:bg-blue-500`, `styled(Button)` | The base `Button` piece and its variant. `ui:` classes are written only inside `design-system/components/`, never in a screen |
| Spacing and radius in a `ui:` class | `ui:p-[13px]`, `ui:p-4`, `ui:rounded-[8px]` | `ui:p-md`, `ui:rounded-lg` (names of the theme's scales) |
| A test theme | `{ ...theme, values: {...} }` | `buildAppTheme`, or `themeWithValues` / `rebuildTheme` in tests |
| A color that is not a theme color (a store's ribbon) | `darken(...)`, `mix(...)` in the component | The engine's `@orderingco/ordering-theme-engine/colors` (`isLight`, `onColor`, `legible`, `shade`, `mix`, `rgbOf`) (§7) |

## What a store configures, and who wins

From lowest to highest; a later level replaces the earlier ones for the same spot. Keep this order when a piece or a page reads a value.

1. Schema defaults (`complete(THEME_COMPILED, null)`, `src/utils/appTheme.js`).
2. The store's theme completed by the engine: an unreadable value becomes the default, a number is clamped, an unknown key is dropped.
3. Images: the theme's image; if empty, the bundled one (`src/utils/bundledImages.js`).
4. Inside a component: `base`, then variant, then size, then shape (`src/utils/themeCss.js`).
5. A component property over the loose token (`button.base.radius` beats `radius.md`).
6. Identity (`border_style`, `shadow_style`, `motion_style`) replaces the radius, shadow and border level, except `none`, `full` and `fixed`.
7. A group `scope` (`auth_form`, `header`, `category_tabs`, `product_modal`, `product_option`) replaces the global component inside its `ComponentScope`.
8. `platforms.mobile_web` below 576 px (visibility, pages and component CSS).
9. `site` settings (per site) are read apart with `src/utils/siteSettings.js`; the config is their fallback.

Besides: visibility (`themeVisible`) and pages (`themePages`) decide what exists; `modes.dark` is kept by the engine but the web does not read it. A base piece honours this order by reading through the helpers (which apply these levels; check a helper in its file before relying on one, e.g. whether it covers `mobile_web`) instead of the raw token, and by never writing a value of its own over it.

## Stored values: never rewritten

- A store's saved theme and `site` settings are data owned by the store. A redesign reads them; it does not normalize, clamp, "improve" or work around them in CSS or code. The engine already completes invalid values (§1); nothing else may change them.
- **Contrast fails on a stored value** (AA for text, 3:1 for the focus ring and a field's border): keep the value, report to Sergio: store/project, key (`tokens.color.primary`), value, pair of colors, ratio and where it shows. Offer the derived token that would fix the usage (`primary_text` instead of `primary`) as a design choice, only where the usage can change without touching the stored value.
- Check design contrast with the default theme **and** the fixture themes; certifying only the defaults is not enough to claim a screen is accessible.
- The editor's picker is not restricted by the redesign.

## New schema settings: flag them

A new component property, component, visibility key, image or `site` setting (§4 steps 4-5, §6) must be listed in the hand-back, because it obliges publishing the schema (`pnpm theme:publish`, a new `version` once the current one is in production, `pnpm theme:compile`, `pnpm theme:validate`, `pnpm theme:verify`) and sending the dashboard new label keys (`BUILDER_THEME_PROP_...`). One line each: node path, default (an alias to a token), editor label key and default text, version bump needed. Prefer step 1-3 of the reuse order so there is nothing to flag.

## Changing a theme default

When Sergio asks for something to be "on" or "off" "by default", the default is the node's `$value` in `product.schema.json`; nothing in the web, api-core or the dashboard decides it apart. Follow the procedure of implementation notes (`visibility.product.dummy_image` off by default, merge `f287d606`) without asking again:

1. Change the node's `$value` in `product.schema.json` and run `pnpm theme:compile`, so `src/theme.compiled.json` carries it. Edit only that line: do not re-serialize the schema file.
2. Bump `version` only if the branch has no unpublished version yet. A published version is immutable (THEMING.md §6.4). If the base branch already bumped one that is not published, the change goes into that version.
3. Write the failing test first, with the real helper (`themeVisible`, `themeMotion`…) and the compiled defaults. Then make the consumers that ignore the setting respect it, each with its test, and fix the tests that assumed the old default. A consumer in a folder another session owns is reported, not edited.
4. Run `pnpm theme:verify`, `pnpm theme:validate`, `pnpm theme:css-catalog --check`, the whole `pnpm test` and `pnpm test:design:browser`. Grep `preview/themes.js`, `tests/` and `e2e/` for the key: a fixture that leaned on the old default now says its value explicitly.
5. Publishing happens only through the merge to `main`, which needs Sergio's "yes". It is never published by hand. `scripts/cf-deploy.mjs` runs `pnpm theme:publish:<env>` before `wrangler deploy`, and fails the deploy if publishing fails; CI only runs `theme:publish:dry`. Until the merge, api-core keeps resolving with the published schema and the old default. In implementation notes the merge of PR #24 published 1.3.0 ("created on …/v400" in the build log). *Hypothesis, not confirmed in the repo:* that Cloudflare's build on `main` is what runs `deploy:production`, and that it is equivalent to `pnpm theme:publish:production` by hand.
6. The dashboard's Builder shows the published default. `Builder/ThemeSchemaEditor/SchemaGroup.js` (ordering-dashboard) falls back to `node.$value` when the store saved nothing. That is why the Builder changes only after publishing. *Hypothesis:* that the Builder loads the current published schema, as implementation notes saw in two stores after publishing.
7. Stores that saved a value keep it. api-core resolves a version 2 theme "over its schema's defaults" (`ThemeResolver::resolve()`, `app/Themes/ThemeResolver.php`), so only stores without a saved value move. Version 1 themes save explicit values and do not move either. Changing the stores that saved a value is a data migration in api-core, which needs Sergio's "yes"; in implementation notes it was decided not to migrate. Report the change in the hand-back as a schema change that moves every store without a saved value, as with any new setting.

For a default that only applies to a screen template, put the setting on
that screen and pass it to its shared pieces. Showcase uses
`components.business_listing_page.base.showcase_featured_badge` for its results
and hero. Other store cards still use `visibility.business_card.featured`.

The storefront receives resolved values for saved v2 themes from both
`frontends/first_load` and `GET theme`. api-core's `ThemeResolver::envelope`
returns `values` after resolution, without a map of explicit overrides. For
`visibility.business_card.featured`, an explicit `false` and an unset key with
the default `false` look identical in that response. Showcase therefore uses
its own default of `true` and honors an explicit `false` on its own key. A
transition based on the old saved preference needs the API to provide its
origin, or an authorized migration of saved data.

## Portals and groups

Context crosses React portals; a CSS variable on a wrapper does not. A dialog, sheet or popover inside a `scope` group (`auth_form`, `header`, `category_tabs`, `product_modal`, `product_option`) must read its group's values with the helpers, and a `ComponentScope` must wrap only the group's own controls, because a modal opened from inside takes the group's look too (comment in `ComponentScope/index.js`). Verify these with computed CSS inside the portal. In the app, a theme change still needs a reload (nothing calls a refresh and there is no editor preview), but the base pieces and the `--ot-*` variables are built to follow a change without one, and the preview page tests exactly that ([design-system.md](design-system.md#verifying-a-piece)). `modes.dark` is not read by the web.
