# Theming rules

How UI code in this repo gets its look from the theme: stay inside the theme's
tokens, reuse what exists, and know when (and where) to add something new.
Read this before touching any `styles.js`, any primitive in `src/ui/src/styles/`
or `product.schema.json`.

The schema format itself (nodes, types, aliases, `follows`, `derive`,
`inherits`, editor metadata) and its versioning rules are documented by the theme engine
(`@orderingco/ordering-theme-engine`, the version pinned in `package.json`):

- in the installed package, `node_modules/@orderingco/ordering-theme-engine/docs/`, when that version ships its docs;
- otherwise in the engine's repository, [`docs/`](https://github.com/Finitless-com/ordering-theme-engine/tree/master/docs) (`schema-format.md`, `creating-a-schema.md`), at the tag of that version (`v<version>`).

This page is about how the web uses it.

## 1. The theme decides

- Every visual value comes from the theme: colors, spacing, radii, borders,
  shadows, typography, icon and control sizes, opacity, motion, images and
  what is shown. Nothing is hard-coded in a component: no hex, `rgba()`, `px`,
  `ms` or font name written in a `styles.js`.
- The theme always arrives complete and valid: `theme.values` is the site's
  theme completed by the engine's runtime (`complete` of
  `@orderingco/ordering-theme-engine/runtime`, in `src/utils/appTheme.js`) with
  `src/theme.compiled.json`, the schema compiled by `pnpm theme:compile` (its
  defaults with the rule of each value), checked by api-core's own rules:
  - every key of the schema is there; one the theme leaves out is the default;
  - a value the web does not understand is the default, never empty: another
    kind than the default's, an option the schema does not list, an invalid
    color (a color is a hex, `rgb()` / `rgba()` or `transparent`; an alias
    such as `{color.primary}` is not one), or null where the default is not
    null (borders and shadows may be null: none);
  - a number is clamped to the editor's `min` / `max` of its node (on a level
    control, widened to its scale's levels), else to the format's range;
  - a text style, a border and a shadow are checked field by field: an invalid
    or missing field is the default's (a text style without a `family` keeps
    none);
  - a key the schema lacks is dropped. The open blocks are checked by what
    they hold: a platform's overrides (`platforms.mobile_web`) by the rules of
    the component, visibility key or page they change; a group's `scope` by
    the rules of each component it may change, completed from the theme's own
    (already checked) component; a page's `sections` keep the theme's order
    with only that page's sections; a slot's axes are only those its schema
    declares, each a part of its component; an image is an `http(s)` URL of up
    to 2048 bytes or `''` (none: the web then uses the bundle's image); `site`
    settings by their options, `max_length` (in code points) and `pattern`;
    `modes.dark` keeps only colors that name a schema color (the web does not
    read `modes`).

  Readers rely on it: do not re-check options or ranges, and do not write
  fallbacks that duplicate a default.
- The theme also arrives as CSS: `theme.css` is its view (`toCss` of
  `@orderingco/ordering-theme-engine/css`, built by `src/utils/appTheme.js`
  once per theme, each component the first time it is read), every value
  converted by its type in the schema (a length `'12px'`, a border
  `'1px solid #…'` or `'none'`, a shadow with its sides and drop shadow, a
  text style's declarations, the tokens with Identity applied, each
  component's motion). Paint from the view; read `theme.values` only to
  compute (sums, comparisons, nulls, options).
- Never build a theme by spreading values (`{ ...theme, values: … }`): its
  view keeps the old CSS. Build it with `buildAppTheme` (tests:
  `themeWithValues`, `rebuildTheme`), or read what you need directly. The helpers take no fallback argument
  and read the theme as it is; only what the schema lets be null (a border,
  a shadow, an empty image, a slot's axis, a `platforms.mobile_web`
  override) needs handling.
- What the theme sets is not overridden in the front. If something looks wrong
  with the defaults, fix the default in the schema, not the CSS.
- If no token or component property fits a spot, do not invent a value: say so
  (an exception, with its effect) and ask. A value off the scale is a design
  decision, not a coding one.

## 2. Where values live

| Layer | What it is | Example |
|---|---|---|
| `tokens.<group>.<name>` | The shared vocabulary: literal values, same names in every product | `color.surface`, `space.md`, `radius.lg`, `typography.h3` |
| Identity (`tokens.shadow_style`, `border_style`) | Theme-wide choices that move every property that `follows` them | one radius level for every box |
| `tokens.motion_style` | The theme's easing, and whether anything moves | `motion_style.enabled` |
| `components.<c>.base` | The properties of a component; defaults alias tokens | `business_card.base.background = {color.surface}` |
| `variants` / `appearances` / `sizes` / `shapes` / `colors` | Axes of a component; states (`hover`, `pressed`, `disabled`…) only in `variants` and `appearances` | `button` sizes, `tabs` variants |
| `slots` | Another component a component contains, with its axes | `business_card.slots.cta` → `button` |
| `scope` | What changes in other components inside a group | `category_tabs.scope.tabs` |
| `inherits` | A component that takes what the theme sets on its parent | `business_card` inherits `card` |
| `visibility`, `images`, `pages`, `site` | What is shown, the theme's images, page sections, site settings | visibility key `header.cart` |

Token groups and levels (the engine's catalog; the schema sets the defaults):

| Group | Levels |
|---|---|
| `color` | brand (`primary`, `secondary` with `on_*`, `*_subtle`, `*_pressed`, `primary_text`), surfaces (`background`, `surface`, `surface_alt`, `overlay`, `on_overlay`, `inverse_surface`, `on_inverse`), text and lines (`text`, `text_muted`, `text_disabled`, `border`, `border_strong`), states (`success`, `warning`, `danger`, `info` with `on_*`, `*_subtle`, and `*_text` but for `info`), `disabled`, `rating`, `favorite` |
| `font` | `heading`, `body`: the families of the two roles |
| `typography` | `display`, `h1`–`h4` (heading font); `body_lg`, `body`, `label`, `caption`, `button` (body font) |
| `space` | `none`, `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl` |
| `radius` | `none`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `full` |
| `size` (control height) | `sm`, `md`, `lg`, `xl` |
| `icon` | `sm`, `md`, `lg` |
| `border` | `thin`, `thick` |
| `shadow` | `none`, `sm`, `md`, `lg`, `xl` |
| `opacity` | `disabled`, `pressed` |
| `motion` | `fast`, `base`, `slow` |
| `layout`, `focus_ring`, `scrollbar` | page gutter and the listing's layout mode, focus ring, scrollbar |

Their values are the schema's defaults (`src/theme.compiled.json`) and a theme
can change them: code refers to the level, never to its number.

## 3. Reading the theme in code

Always through the helpers. Never read `product.schema.json` from app code
(use `src/utils/themeSchema.js`), and never copy a default value into the code.
The helpers read the theme's CSS view and return CSS (`themeSpace` is
`'12px'`); the ones that give a number to compute with say so.

| Need | Helper |
|---|---|
| A component as CSS | `getThemeCss(theme, c)` (its view, the group's inside a `scope`); its phone overrides `getThemeMobileCss(theme, c)`; its values to compute with `getThemeComponent(theme, c)` (`src/utils/themeCss.js`) |
| A color | `themeColor(theme, 'surface')`; translucency `withAlpha`, `isTransparent` (`src/utils/themeColors.js`) |
| Spacing | `themeSpace(theme, 'md')`; page sides `pageGutter(theme)` (a number) |
| The business listing's layout | `themeLayoutMode(theme)` (`original`, `appointments`) |
| Radius, shadow, border | `themeRadius(theme, level, component?)`, `themeShadow(theme, level, options?)`, `themeDropShadow(theme, level, options?)` (a whole `filter` value), `themeBorderWidth(theme, level, options?)`, `themeBorderStyle(theme)`: they apply Identity (the theme-wide rounding, shadow size and border width and style); `options` is a component name or `{ component, fixed }` (`fixed` keeps the level). A shadow's sides and reach `themeShadowParts(theme, level, options?)`. Bars spanning the width `themeShadowDown` / `themeShadowUp` / `themeShadowToward` |
| Text | `themeText(theme, 'body', options?)`: `options` is a component name or `{ component, props, important, weight }` (`props` limits it to the properties the block declares; `weight` is the weight a block keeps, painted when `props` has `weight`); `headingText(theme, level)`; a component's text `themePartText(theme, c, path, { weight }?)`; `themeFontFamily(theme, role)`; React style objects `themeTextStyle`; one declaration at a time `themeTextParts`; the Google Fonts stylesheets `themeFonts(theme)` (`src/utils/appTheme.js`) |
| Icon, control and other sizes | `themeIconSize(theme, 'md')`, `themeControlHeight(theme, component, size)`, `themeSize(theme, 'xl')` (`tokens.size`) |
| Image, logo, portrait, map or banner box | `themeMedia(theme, 'md')` (`components.media.base`: `3xs` 70 … `5xl` 300; table in `docs/design-system/px-map.md`) |
| Opacity, scrim | `themeOpacity`, `themeScrim` |
| A component's properties | `themePart(theme, 'card', { background: 'base.background', … })` for CSS; `themeValue(theme, c, path)` for a raw value in JS (null where the schema allows it) |
| A value the code composes itself | `cssBorder`, `cssShadow`, `cssText` (the engine's conversions, `src/utils/themeCss.js`) |
| Motion | `themeMotion`, `motionCss`, `stateMotionCss`, `scrollBehavior` (`src/utils/themeMotion.js`; they respect reduced motion); a class's duration and easing `motionTiming(theme, c)` |
| Groups and slots | `scopedTheme(theme, group)`, `themeSlot`, `slotButtonOptions`, `slotButtonProps` (`src/utils/themeGroups.js`) |
| Shown or hidden | `themeVisible(theme, key)` (`src/utils/themeVisibility.js`); page sections `src/utils/themePages.js` |
| Images | `themeImage(theme, key)`; bundled non-theme images `src/utils/bundledImages.js` |
| Site settings | `src/utils/siteSettings.js` |
| Background of the current layer | `layerBackground(theme)` (`src/ui/src/styles/Layer`) |
| Focus ring | `focusRingCss` and friends (`src/ui/src/styles/Focus`) |
| Room a scrolling layer leaves | A modal or sheet body publishes `--layer-protected-zone` (the band its close and handle own, at the top), `--layer-pad-bottom` (its bottom padding, without the keyboard's) and `--layer-end-gap` (`0px`: after the content comes that padding alone). A sticky bar in it reads them with a fallback of 0 or of its usual space (`bottom: calc(-1 * var(--layer-pad-bottom, 0px))`), so it reaches the edge in a layer and is unchanged outside one (`design-system/components/Dialog.jsx`) |

If a helper is missing for a token group, add it next to its siblings in
`src/utils/themeTokens.js` rather than reading `theme.values` inline.

### Design-system pieces (Tailwind)

A base Button keeps its text shape when its children contain a visible label.
A saved slot can request the square icon shape when the action supplies an icon
and an accessible name.

The pieces in `src/ui/src/design-system/components/` are styled with Tailwind
classes, prefixed `ui:`, from the one sheet `src/ui/src/design-system/styles.css`
(a piece imports it; the app's entry never does). They take the theme in two ways:

- **Tokens, by name.** Tailwind's own scales are cleared: the only names are the
  theme's (`ui:p-md`, `ui:rounded-lg`, `ui:h-size-md`, `ui:text-button`,
  `ui:bg-surface-alt`, `ui:text-on-primary`) and shadcn's (`ui:bg-background`,
  `ui:bg-secondary`, `ui:text-primary-foreground`, `ui:border-input`; the focus ring is the app's global one, never a `ring-*`).
  Each reads the `--ot-*` variable of the theme (written on `:root` by
  `ThemeProvider`, so they hold inside portals and when the theme changes).
  `background` and `secondary` are shadcn's (the controls' surface, the neutral
  fill); the web's own are `ui:bg-canvas` and `ui:bg-brand-secondary` with
  `ui:text-on-brand-secondary`. The theme's phone cut is `ui:max-mobile:`.
  The names are generated from the schema (`pnpm theme:css-catalog`).
- **A component's own values, by variable.** What `components.<c>` sets (a size's
  height, its padding, the radius, the colors of an appearance and its states,
  the motion) is not a token: the piece writes it on its own element with
  `componentVars(useTheme(), 'button', { size, color, appearance })`
  (`design-system/lib/componentVars.js`) and its classes read
  `ui:h-(--ui-button-height)`. Read the theme from `useTheme()`, not from the
  app's global one: inside `ComponentScope` it is the group's, and the context
  crosses portals. A state the theme leaves null declares nothing (it is the
  resting look). A class's duration is `ui:duration-(--ui-button-motion-duration)`
  with `ui:motion-safe:`.
- `cn` (`design-system/lib/cn.js`) merges a piece's classes with a caller's;
  `Icon` (`design-system/components/Icon.jsx`) draws the registry's icons at a
  level of `tokens.icon`.

The base `Input` can read `components.search_bar` over `components.input`.
It resolves the base and search values on desktop, then overlays the mobile
values of both components in the same order.
The search field keeps its theme height. On touch screens its associated label
extends the text area's target, and the clear Button has a separate suffix
column. The accessibility floor applies to the targets.

## 4. Reuse or create: the order to follow

Go down this list and stop at the first step that fits.

1. **The component already has the property.** The spot belongs to a
   component of the schema and that component has a property for it: read it
   (`themePart`, `themeValue`). Example: a store card's name color is
   `business_card.base.name_color`, not `themeColor(theme, 'text')`.
2. **A shared primitive already does it.** One purpose, one theme element:
   - selectable lists → `choice` (`src/ui/src/styles/Choice`);
   - containers → `card` (`src/ui/src/styles/Card`);
   - separators → `divider` (`src/ui/src/styles/Divider`: `item`, `section`, `band`, `vertical`);
   - text actions → `link` (`src/ui/src/styles/Link`);
   - the box of a control (background, color, border, shadow, radius, height, text) → `boxCss` (`src/ui/src/styles/Box`);
   - quantities → `stepper`;
   - tab bars → `tabs` (a container that draws a border around a bar sets `--tabs-bar-inset` to its width, and the bar and its tabs shrink by it);
   - account page box and title → `src/ui/src/styles/Page`;
   - chevrons → `ChevronIcon` (`src/ui/src/styles/Chevron`), always decorative: `disclose` (accordions: `accordion` look and motion, down closed, turned open), `list` (a field that opens a list: `input` icon size and gap, turned while open with the `menu` motion), `navigate` (enter or back rows: its container's size, mirrored right to left); `listChevronMaskCss` draws the same glyph on a library's element;
   - buttons, inputs, dialogs and sheets, icons → their base piece in `src/ui/src/design-system/components/` (section 3);
   - selects, switch, badge, chip, alert, toast, tooltip… and every other control with no base piece → their primitive in `src/ui/src/styles/`.

   Do not build a second version of one of these with its own CSS. A control that has a base piece uses the piece; the legacy primitive is only for controls without one, and one visual group never mixes both versions of the same control type.
3. **A token used directly.** Layout glue that should always move with the
   global scale and that nobody needs to change on its own: the gap between
   blocks of a page, the rhythm between form fields (`space.md`), the title to
   content gap (`space.xl`, the same as between sections), the color of a
   plain heading (`color.text`).
4. **A new property on an existing component.** The spot is a distinct visual
   part of a component and a theme author could reasonably want it different
   from the token (a card's cover color, a badge's padding). Add the property
   to that component in the schema, with a default that aliases a token
   (`{space.sm}`, `{color.surface}`), never a literal unless the value is truly
   its own (a range like `business_card.base.header_height` with `min`/`max`).
5. **A new component.** A reusable UI piece with its own look that no
   component covers. A card-like component `inherits` `card`; the components it
   contains go in `slots`; a group that changes its children uses `scope`.

Never create a new **token**. Token names are a fixed catalog shared by every
product and api-core rejects names outside it. A missing level (another space
step, another icon size) is a change to the engine and the editor: raise it
and ask, do not work around it.

### Reuse across components

- Prefer a slot to restyling a contained component: a button inside a card is
  `slots.<name>` pointing to `button` with its size, appearance and color, not
  a custom button.
- Prefer `inherits` to copying a parent's properties: the child declares only
  what it uses, and what the theme sets on the parent applies to it.
- Prefer `scope` to per-place overrides: a group that wants its tabs or
  buttons different says so in its `scope`, and `ComponentScope` /
  `scopedTheme` apply it.
- Two components that should look alike alias the same token in their
  defaults; they do not read each other's properties.

## 5. Picking the right token

Use the token that names the purpose, not the one with the right value today.

**Surfaces**
- `background` is only the page canvas (body, home, listings).
- Cards and anything that floats (modals, popovers, menus, side panels, sheets, dropdowns) are `surface`.
- A bar inside a layer paints `layerBackground(theme)`.
- Bands and quiet fills are `surface_alt`.

**Text and lines**
- Plain text is `text`; secondary text and placeholders are `text_muted`.
- `text_disabled` is for disabled text and for decorative icons; `disabled` is the fill or line of a disabled control (a solid button's background, an outline button's border).
- Separators and card borders are `border`.
- `border_strong` is for form-control borders (input, select, checkbox, radio, switch off) and non-line fills (scrollbar thumb, spinner). The input's default contour reads `border.thin` and `color.border_strong` independently of the overall border width. The saved `components.input.base.border` still decides the contour when present, including an explicit null.
- Loading placeholders (skeletons) are `border` with a `surface_alt` sheen, set once globally (`src/ui/contexts/ThemeContext`); a component does not color its skeletons.

**Color on color**
- `on_*` is text on that color's fill (button, badge, toast).
- `*_text` is that color used as text on the page (errors, amounts, states); it is the legible one. `primary_text` is derived legible over `primary_subtle`, so it reads AA on that fill (the active or selected state of tabs, date_strip, steps, order_card, choice, menu) and on `background` and `surface`; it is not guaranteed on `surface_alt` (a very pale primary can fall short there), so do not paint it on `surface_alt`.
- `on_overlay` is text and icons over photos.
- `overlay` is the scrim behind modals.
- Icons, borders and fills keep the plain color.

**Translucency:** a color is opaque unless its node says `alpha: true` in its editor metadata. Only then can its default be translucent.

**Typography**
- Headings use the heading roles (`headingText`); body copy uses the body roles.
- A real `h2` can carry an `h4` style: the tag follows the document outline, the style follows the theme.
- `line` is a ratio of the size, not px.

**Sizes**
- Icons use `icon` levels.
- Control heights use `size` levels (`themeControlHeight`).
- Radii and shadows use their levels; Identity may replace the level, which the helpers handle.
  - A state (hover, focus, pressed) passes `fixed` to keep its own shadow level.
  - `none` and `full` radii never change.

**Interaction**
- Only what can be clicked or tapped has hover and a pointer cursor, and only with a look that comes from a theme state: button states, link underline, `choice.base.hover`, `menu.base.item_hover`, card hover.
- Everything else stays still (`blockStill`, `buttonStill`): no lift, no shadow change.

**Motion:** durations and easing come from `motion` / `motion_style` and the component's `animated` / `speed`, through the motion helpers.

## 6. Adding to the schema

When step 4 or 5 applies, in the same pull request:

1. Add the node to `product.schema.json` with its `$type` and its default:
   - the default aliases a token (`{color.x}`, `{space.x}`, `{radius.x}`, `{shadow.x}`, `{typography.x}`, `{icon.x}`);
   - a dimension says its `scale`;
   - a shadow, radius or border that should follow Identity says `follows`;
   - a translucent color says `alpha: true`.
2. Add its editor metadata (`$extensions["co.ordering.editor"]`): label key and default text, group, `order`, control, and `min` / `max` / `step` / `unit` for numbers. The editor's rules are checked by `pnpm theme:validate`.
   - The dashboard translates the editor from its own catalog. A new label key (`BUILDER_THEME_PROP_…`) shows its default English text until the dashboard adds it in every language: send the dashboard each new key with its default text.
3. If the node has a version 1 equivalent, add it to `docs/theme-v2/mapa-v1-para-api-core.json` (version 2 path → version 1 path, in the section of its kind). api-core migrates a site's version 1 theme with that map; a node missing from it takes its default on migration. Several version 2 keys of the same kind may share one version 1 path.
4. Bump `version` once the current one is published to production: a published version is immutable (api-core answers 409 `schema.version_exists`). Which number to bump, and how saved themes follow, is in the engine's docs (see the top of this page): `creating-a-schema.md` section 6 and `schema-format.md` sections 13–15.
5. Run `pnpm theme:compile` (it writes `src/theme.compiled.json`: the defaults, the rules the web completes the theme with, `product_type` and `version`), then `pnpm theme:validate` and `pnpm theme:verify`.
6. Read it through a helper (section 3), and cover it in a test.
7. Update this page if the change touches anything it describes (section 8).

### Store list

The Store list reads `components.business_listing_page.base.closed_stores`:
`last` puts closed results after open results in Grid and groups them in Showcase.
`mixed` keeps the search order. `base.filters` presents existing shortcuts inline
or in a Sheet. `base.showcase_featured_badge` controls featured store cards in
Showcase results, including the hero. Other store cards use
`visibility.business_card.featured`. A category layout of `auto` uses tiles in
Showcase and pills elsewhere. Each explicit `business_types.base.layout`
choice takes precedence.

### Store page

Screen designs uses `components.store_page.base.template` to choose between four designs:

- `menu_index` (Direct menu, the default): a short cover, the name and one line about the store, and a bar that sticks under the
  header with the search and the categories as `line` tabs. The dishes are rows (photo at the end, a "+" in its
  corner); the featured ones a row of tiles. From 1000 px the categories are a list beside the menu, the menu has two
  columns of rows and the store's own cart is beside it (the phone's cart bar is not shown there).
- `menu_index_no_cart` (Direct menu, no cart column): the direct menu without the cart column. From 1000 px the
  categories list stays and the menu takes the freed width; the cart is the header's drawer (its icon opens it) and a
  product add does not open it: the icon's count swells for a moment (not with reduced motion). On a phone it is the
  direct menu, cart bar included. A theme that hides the header's cart (`visibility.header.cart`) keeps the column,
  since the drawer would have no icon.
- `showcase` (Visual showcase): a large cover with the name over a gradient of the theme's scrim, sticky chips with
  the search first (a chip that opens into the field) and a grid of large photos (two columns on a phone, four from
  1000 px; the featured ones a row on a phone, three columns from 1000 px).
- `classic` (Cover and tabs): a low full-width cover (the veil of `business_header.base.overlay` as a soft gradient,
  when the store is closed or `overlay_when` is `always`), the name with the favorite and one line (status, address
  and an "Info" link), and a bar that sticks under the header with the search and the categories as `line` tabs
  (the search above the tabs on a phone, at the start of the same row from 1000 px). The dishes are cards of
  `components.product_card` in the columns of `components.product_section` (text at the start, photo at the end with
  the "+", a small favorite beside the price); the featured ones are the first section. No Sort By and no cart beside the menu.

A missing or unrecognized value is `menu_index`. The kiosk keeps its own layout whatever the template says. A store
with `front_layout=groceries` (with `use_parent_category` on or off) is painted as a `food` store: the template above,
without the Groceries side list of parent categories or its grid. The field is not rewritten in the API; it is just not
read to choose the layout.

The four designs share what the page adds: the closed-store notice (a `components.alert` warning with the
next opening and a button that opens the preorder picker; once a moment is chosen, a success alert with it and
"Change"), the product search (`SearchBar` over the store's own `handleChangeSearch`, which narrows the menu), the
"+" (the product goes straight to the cart when it has no options, the store's one-click setting aside; otherwise it
opens its window) and the cart bar on a phone. Their cover heights are levels of `components.media`.

### Product window

`components.product_modal.base.layout` selects the product window in Screen designs. The default, `card`,
puts the gallery above one column of choices and shows group tabs from four visible option groups.
`showcase` puts the full-height gallery beside the independently scrolling choices on wide screens.
Both use the gallery ratio and height cap when the gallery is a band. `sheet` keeps its gallery beside
the options on wide screens, and `steps` keeps its side panel and accordion. Explicit saved layouts
are used as configured. The editor shows `header_background` for `sheet` and `steps` and shows the tabs
scope for `card` and `showcase`. The latter use the navigation slot's size and draw the tabs as the
`line` layout of `Tabs`: a scrolling row of text edge to edge with a hairline under it, the underline
variant's colors, an indicator that slides to the current section (the slot's variant does not change
it), no arrow (the row fades out at its end), and the count of choices made in each group beside its name.

All four layouts read `actions_sticky`, `comment_height`, `slots.add` and `visibility.product.add_price`.
The comment starts collapsed. Pending required choices are listed above the cart action in both
`jump` and `guide`. `components.product_option.slots.required.variant` defaults to `neutral` and uses
the stored variant until validation fails for that group. The failure uses the theme's `badge.danger`.

## 7. Don'ts

- No hex, `rgb()`/`rgba()`, `px`, `rem`, `ms` or font names in component styles.
  A literal is only acceptable when it is not a design value (`0`, `100%`,
  layout percentages), is covered by the general 44×44 px touch-area floor or is a recorded, approved exception.
- No colors computed from other colors in a component (`darken`, `lighten`,
  `mix`): derived colors are declared in the schema (`derive`) and served
  ready. A color that does not come from the theme (a business's ribbon)
  goes through the engine's color functions
  (`@orderingco/ordering-theme-engine/colors`: `isLight`, `onColor`,
  `legible`, `shade`, `mix`, `rgbOf`), the same the theme is derived with.
- No reading `theme.values.tokens…` or `theme.values.components…` inline when a
  helper exists.
- No converting a theme value to CSS in a component (`${value}px`, a shadow or
  text built from its values): the view has it.
- No second implementation of a primitive (section 4.2).
- No per-component copy of a token's value "to be safe".
- No hover, lift or cursor on something that cannot be clicked or tapped.
- No new token names; no schema key without its default, editor metadata and
  the rest of section 6.

Some existing code still breaks these rules (literal colors, shadows and
durations in a few `styles.js`). Do not copy it; when you
touch that code, move it to the theme, or report it as an exception if no token
fits.

## 8. Keeping this page true

This page describes the rules and the theme **as they are now**. It must match
`product.schema.json` and the helpers at all times.

- **Same pull request:** a change that touches what this page describes updates it in that pull request. That covers:
  - the schema: token groups or levels, a component's parts, `follows`, `inherits`, `slots`, `scope`;
  - a helper, or a shared primitive in `src/ui/src/styles/`;
  - a rule about which token fits which purpose.
- **Rewrite in place:**
  - edit the sentence that changed, so the page reads as if it had always said the new thing;
  - delete what no longer exists.
- **Not a changelog:**
  - no dates, versions or "was / now / previously / new" notes;
  - no lists of past changes or decisions.

  History lives in git and in the commits.
- **Specific rules only:** add a rule only if it applies across the codebase. A decision about one screen goes in that screen's code or in the docs of `docs/theme-v2/`, not here.
- **Point, don't copy:** prefer pointing to the source over copying values:
  - level names, not their numbers;
  - the helper's file, not its body.

  What is not copied cannot go stale.
