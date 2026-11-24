---
name: ordering-website-design
description: Design, redesign or review the usability of a screen of the white-label ordering website (this repo, website-marketplace-theming) so every customer task, above all ordering, paying, signing up and reordering, can be finished start to end, and so every value still comes from each store's theme. Use it for any UI change, such as new or changed screens, controls, styles, icons, tokens, visibility or surfaces (page, modal, bottom sheet, popover, sticky bar), small visual tweaks, usability reviews or "walk the flow", and dead ends ("can't continue", "stuck", "empty cart", "closed store", "guest can't pay"), even if nobody says "design". Also when a change tempts you to write a hex, px or font name, to change a value a store configured, or when UI work touches the base pieces (Button, Input, Dialog, Sheet, Icon), their legacy primitives, `ui:` classes or a token that does not exist. Not for the dashboard, backend, worker, SDK/submodule, build, CI, test-only, translation-only or copy-only work with no UI decision.
---

# Ordering website design

The website is a white-label ordering site: every store (tenant) configures its own look, and a customer on a phone must be able to order, pay and come back without hitting a dead end. A redesign is good only if (1) the person finishes the task in the flow they started and (2) **every value still comes from the store's theme**, in every theme, not just the default. A screen that looks great with the default theme and breaks a store's theme is a regression.

It is adapted from `ordering-dashboard-design`. It does not use Ordering.co's own brand: no palette, tokens or identity of Ordering.co. The brand-system skill (`ordering-brand-system`) contributes only the redesign **method** (capability inventory on main, parity, live QA, defects with IDs, states, layers, accessibility), see its `references/redesign.md`.

Read first: [`CLAUDE.md`](../../../CLAUDE.md) (edit boundary, controller + UI pattern), [`docs/THEMING.md`](../../../docs/THEMING.md) (whole), then [references/theming.md](references/theming.md) (precedence) and [references/design-system.md](references/design-system.md) (base pieces). An executor who only needs the rules to edit code can start from [references/executor-card.md](references/executor-card.md). The measurements behind the stack decision are in [`docs/design-system/fase-0.md`](../../../docs/design-system/fase-0.md); the rules below do not depend on it.

## The central rule: the theme decides

Full rules and examples in [references/theming.md](references/theming.md). In short:

- Every visual value (color, space, radius, border, shadow, type, icon and control size, opacity, motion, images, what is shown) comes from the store's theme, read through the helpers of THEMING.md §3. No hex, `rgb()`, `px`, `ms` or font name in a component (§7). If no token or component property fits, do not invent a value: follow the TOKEN-GAP tree ([design-system.md](references/design-system.md#when-no-token-fits-token-gap)).
- **Keep what each store configured.** The precedence is listed once, in [references/theming.md](references/theming.md#what-a-store-configures-and-who-wins). Respect `themeVisible` and `themePages`: what a store hides stays hidden. Never rewrite a stored theme or setting, and never "fix" one in CSS (§1: what the theme sets is not overridden in the front).
- **Contrast** (rule of this skill, set by Sergio in implementation notes; it follows from THEMING.md §1). A stored value that fails AA (text) or 3:1 (non-text: focus ring, field border) is **reported to Sergio** (store, key, value, pair, ratio), not changed, clamped or worked around. Use the schema's derived tokens for legibility (`*_text`, `on_*`, `primary_text`, §5), never an ad hoc color.
- **New schema settings are flagged.** A new property, component, visibility key, image or site setting (THEMING.md §4 steps 4-5, §6) obliges publishing the schema: list each one in the hand-back with its default, editor label key and version bump. Changing the **default of an existing** token or property ("make the brand red the default") is a schema change too: it moves every store that did not set it, and it obliges publishing. Follow the procedure in [Changing a theme default](references/theming.md#changing-a-theme-default) without asking again. A brand color for one store is a value of that store's theme, not code.
- Reuse order is THEMING.md §4: the component's own property, then a shared primitive in `src/ui/src/styles/`, then a token, then a new property, then a new component. Never a new token name.

## Decided, do not reopen

The share menu keeps AddToAny's buttons and glyphs (implementation notes, option B). Icons are Lucide. The stack is shadcn on Base UI with Tailwind 4 next to styled-components, with token bridge B (decided in implementation notes). Present an alternative to any of these only if Sergio asks for it.

- **Product window.** The Screen designs default is `card`. Stored `sheet`, `steps`, `card`
  and `showcase` stay selectable. All four use the shared action bar and folded comment. Required badges
  start with the configured variant (`neutral` by default) and use `danger` for pending groups after an add
  attempt. A default belongs to the schema and its compiled output. Coordinate the Screen designs drawings
  before the new schema is published through the deployment flow.

## Base pieces and token bridge

Full rules, vocabulary and verification: [references/design-system.md](references/design-system.md). Read a piece's source for its props; do not invent them.

- **Piece or legacy primitive.** A control that has a base piece (the table "The pieces" of design-system.md) uses the piece; the legacy primitive of `src/ui/src/styles/` is only for controls without one (flag it as a migration gap). Migrate a control when the issue changes its look or its container; never mix legacy and base versions of the same control type in one visual group. [Rule, coexistence and legacy props](references/design-system.md#piece-or-legacy-primitive).
- **Tokens by name, never by value, and `ui:` only inside `design-system/components/`.** A screen never writes `ui:`; it composes with styled-components and `var(--ot-*)` or the helpers. No hex, px, ms, bracketed literal or Tailwind default (`ui:p-4` does nothing). Two names mean something else here (`ui:bg-background`, `ui:bg-secondary`). [Reading a token in a class](references/design-system.md#reading-a-token-in-a-class).
- **Never restyle a base piece** with `styled(...)` or a container's CSS: its utilities live in `@layer` and any unlayered rule wins, detaching it from the theme. Component values and `scope` come from the piece, which declares the `--ui-*` variables; pages never write them. [Using and extending pieces](references/design-system.md#using-and-extending-pieces).
- **Icons**: the base `Icon`, or `createIcon` with its own glyphs in the entry chunk; a size only from the theme; never mix legacy and base icons in one control. [Icons](references/design-system.md#icons). Surfaces (overlays): [references/surfaces.md](references/surfaces.md).

## Accessibility floor

Every new or changed control meets it; the pieces provide most of it, so do not undo it.

- Every icon-only control has an accessible name; a decorative icon is hidden from assistive technology.
- Focus is visible (the app's global ring; never a second one) and returns to the opener when a layer closes.
- Esc closes the topmost layer, only that one.
- Every interactive control reserves a touch area of at least **44×44 px**. When the theme paints it smaller, expand the hit area around the control and preserve the painted size. This general accessibility rule requires no per-control exception.
- Text in fields is at least 16 px on a phone (iOS zooms below it).
- Reduced motion is honored: motion goes through the theme's helpers or `ui:motion-safe:`.
- Non-text contrast of the focus ring and of a field's border is 3:1: reported when a store's value fails, never changed. Exception: the `ownFocus` variant of `design-system/components/Input.jsx` removes the ring when the theme gives the field its own focus border; that border is then the indicator, and it is the one to check.
- **A piece's floor is not the screen's verdict.** For the integrated control check the accessible name (an icon-only `Button` takes it from the caller), the focus and the area that really responds. `Button` reaches 44 px with a pseudo-element: check that no container clips it and no neighbor intercepts it. `Input` guarantees 16 px of *text* on phones and the screen must reserve its touch area: measure the field and its secondary action (a suffix button) separately. Keep the visual size the store configured.
- An action inside a field (show the password, clear, attach) is a base `Button shape='icon' size='xs' appearance='ghost' color='neutral'` in the Input's `suffix`, with its name and, for a toggle, `aria-pressed` (implementation notes, D3 B): its box is the theme's and its touch target the Button's 44 px. In the sign-up forms, first name, last name and email take the full width (implementation notes, D4 A).
- Known gap: the share menu (`ProductShare`) does not close with Esc.
- **A defect that was already there.** While you migrate a control, a prior defect of that control under this floor (no name, not reachable by keyboard, focus not returned) is fixed in the same change and listed as `fixed (prior)`. One in a neighbor you do not migrate is listed as a finding, not fixed.

## Workflow

Each step leaves a short written output (PR, plan or answer) so a reviewer can check it.

1. **Inventory on main.** A capability that already exists is reused, not rebuilt: a request for a share control, a login button or a sheet starts from the component that already does it. List every action, control, condition, state, datum, reachable overlay and embedded use of the component, with file:line, plus what the store's theme controls on it (component keys, `scope` group, `visibility`, `pages` sections, `site` settings, mobile override). For each action you migrate to a base `Button`, note the slot that configures it, its state condition and any alternate mobile slot ([a button the store configures by slot](references/design-system.md#a-button-the-store-configures-by-slot)). It is the parity baseline and is taken at `git merge-base HEAD origin/main`, not at a moving tip. Present it as a table, **capability | main file:line | branch file:line | state** (same, changed, added, removed), in the issue or the PR, not only in a scratchpad. Removing, hiding, moving or adding steps to a capability needs Sergio's explicit approval. When a shared primitive changes, list the other consumers you reviewed.
Whenever you report or diagnose a dead end, in any step and not only in the usability review, write it as `route › step › missing dependency › what the user sees › proposal`.
The table is finished after implementing, not before: fill `branch file:line` and `state` at your last commit, in the same file as the inventory, and list the consumers you re-checked. A table whose state column is all `same` on a migrated surface is an inventory, not a parity table.

2. **Name the task and its dependencies.** One line (who does what; what must exist first: address, order type, schedule, payment method, login) and what the screen shows when each is missing, loading, failed or not allowed. Contract in [references/order-flows.md](references/order-flows.md).
3. **Choose the surface** with [references/surfaces.md](references/surfaces.md), mobile first. Even when you present options, each option names its surface and the row of `surfaces.md` that justifies it. A plan with a `Sheet` or a `Dialog` lists its closing checks: its close button, Esc, the backdrop, and focus back on the opener.
4. **Is there a design decision?** There is one when the customer could see more than one reasonable result: a layout, a surface, a hierarchy, a new state, an icon or a copy. Restoring main's documented look, swapping a literal for the token of the same value, or mapping a legacy literal that is not a level through the approved px map ([step 3b](references/design-system.md#when-no-token-fits-token-gap)), is not one: write `No design decision: <reason>` in the plan and go on (and say it in the hand-back). A request that only names a value of the theme (a brand color, a radius) changes no code: answer with the theme key, or the schema default if it must apply to every store, and write `No design decision: theme value`. Its check is that the value reaches the control (the computed style of that control in that store's theme, or `pnpm theme:verify` and the default theme for a schema default), not a browser matrix: no component changed.
   When a migrated control computes differently from main only because the legacy code overrode the theme with a literal (a fixed `font-weight`, a height that came from a `<p>` margin, a `rows` that made a textarea taller, a literal gap), the piece's value stands: it is the store's theme (Sergio, implementation notes, D1-D4 A). Write `No design decision: piece value` and list each difference (property, main, branch). It is a design decision only when the difference breaks the layout, hides content or drops a touch target under the floor.
   If there is one, present **2 or more options that differ in what Sergio has to choose**: for a surface, different structures; for an icon, different glyphs in the same control; for a message, different texts in the same state. Keep the dimensions already approved, name the trade-offs, and show mockups at 390 and 1440 px with at least two themes. Only Sergio chooses; the choice is written in the issue. A visual change is not implemented before the choice, also when the request says "just do it".
   Use `impeccable` and `frontend-design` in all visual work (anything the customer sees, including restoring a documented look): for the options and for the polish of the result. The level does not exempt a change from N1 up, because a token swap can still change what is seen; only N0 (nothing visible) and an answer that changes no code skip them. Neither skill replaces the theming rule.
   Mockups live in the dev-only preview (`design-system-preview.html`, one section per decision under `src/ui/src/design-system/preview/sections/`), never in the production build. When Sergio chooses, the chosen option becomes the real UI and the section of the other one is deleted, unless he parked it as a later improvement: then it stays as a labelled mockup that names the issue.
5. **Cover every state:** loading (skeleton in the final layout), empty with an action, error with retry in place, closed or read-only store, guest, offline, no permission.
6. **Implement** in the UI layer only (`src/ui`, `src/pages`, `src/components`; never the submodule). Build with the base pieces and the `ui:` vocabulary above; icons per [design-system.md](references/design-system.md#icons). Deep imports only (CLAUDE.md, implementation notes).
7. **Review usability** from an empty cart and a first-time guest, then with data, with [references/usability-review.md](references/usability-review.md). Report dead ends as `route › step › missing dependency › what the user sees › proposal`.
8. **Verify** (below).

## Verification

Run `pnpm test:design:browser` exclusively across checkouts on the same machine. Some specs start Vite on fixed ports. Use the shared lock wrapper if your review provides one.

Details and commands in [references/design-system.md](references/design-system.md#verifying-a-piece). Where: the dev page `design-system-preview.html` (`?theme=`) for a piece, and the app with `DS_REVIEW=1 pnpm dev` (`?ds_theme=`, API writes blocked) for a screen; how: Playwright computed-style assertions.

**The scope of the task decides the evidence.** A consultation or a read-only review puts the table and the findings in the report, cites the tests that already exist and writes nothing (no mockups, no files, no baseline). An implementation applies the level below together with the repo's own instructions: if they ask for 390 and 1440 px, both stay even for a token swap. Both full walks of [usability-review.md](references/usability-review.md) are for changes that alter a flow.

| Level | When | Tests and guards | Browser | Parity |
| --- | --- | --- | --- | --- |
| **N0** | No visible change: test, guard, script, doc | tests and lint of what you touched; the guard concerned, shown red by a mutation | none | none |
| **N1** | A literal to a token with the same computed value, or mapped by the approved px map ([step 3b](references/design-system.md#when-no-token-fits-token-gap)) | N0, and the baseline goes down | computed style of the element in 2 themes (`defaults` and another) at 390 and 1440 px (the repo's `AGENTS.md` asks both); 0 or 1 screenshot | none |
| **N2** | A behavior or layout fix on something that exists | N1, and a reproduction that fails before and passes after | DOM assertions at 390 and 1440 px in 2 themes; the neighbors of the fix (0 to 1 and n to n+1 items, with a layer open); at most 1 screenshot read per route and width | short list of the component's capabilities, none lost; the consumers reviewed if it is shared |
| **N3** | A new or migrated surface, or a new base piece | N2, and the piece's tests (classes, `--ui-*`, attributes) and the e2e spec that mounts it | 3 themes (`defaults`, `grill`, `cafe`) at 390 and 1440 px (768 if the layout changes in between); portal, `scope` and hot theme change; states (loading, empty, error, closed store, guest, offline); keyboard (focus, Esc, return of focus); 44 px with a coarse pointer; reduced motion; no horizontal overflow; clean console; one RTL pass | full table against `git merge-base HEAD origin/main` |

The level follows what changes for the customer, not the size of the diff. An N1 that changes a computed value beyond the approved px map is no longer N1. `impeccable` and `frontend-design` apply from N1 up (step 4). Raising the level is anyone's call; lowering it is the coordinator's, in writing.

- **Design guards.** `pnpm design:check` runs the guards (`literal`, `icon`, `pieces`, `ui-scope`) against a baseline per file and rule ([`docs/design-system/guards.md`](../../../docs/design-system/guards.md)). A file that is not in the baseline may have zero findings; a baselined file may only go down. Besides the literals, the guards fail a named color, an `@base-ui/react` import outside the pieces (`base-ui-direct`) CSS that targets a piece from outside the design system (`piece-selector`: `[data-slot` or `--ui-`) and a container that rewrites the look of a piece it renders (`piece-override`: `button { … }`, `> button:focus-visible`, `input { width }`, `[role=tab]` with color, background, border, radius, padding, type, size or ring; placing the piece with margin or flex is not counted). `pnpm design:coherence --check` compares the total with the sum of those baselines; there is no separate coherence baseline. When your change removes findings, lower the baseline with `pnpm design:baseline` in a separate last commit; never edit a baseline by hand, never raise one, and never rewrite a literal so the guard cannot see it (`${12}px`). Before handing back run `pnpm design:check` and `pnpm design:ratchet --base <the branch you started from>`.
- **Keep verification cheap.** Prove with DOM assertions (`getComputedStyle`, attributes, `getBoundingClientRect`) and read at most one screenshot per route and width. A screenshot does not replace an assertion, and a green test proves neither appearance nor a store's real theme.
- Add an approved exception and its reason to `scripts/design/exceptions.json`, then run `pnpm design:baseline` to regenerate the [Recorded exceptions list](references/design-system.md#recorded-exceptions-themingmd-7).
- **Prove the gate.** A check that never failed proves nothing. When you add or rely on a gate (a test, a lint rule, a CI check, an assertion), show it red with its negative fixture or one isolated, authorized mutation of what it guards (a literal, a removed class, a `ui:` in a screen), revert, and say so in the hand-back.
- Unit tests assert classes, `--ui-*` variables and attributes (jsdom does not compile Tailwind); a rule about the cascade or computed CSS goes in the versioned browser spec, not only in a manual session. `pnpm lint:check`, `pnpm test`, `pnpm i18n:verify` on touched files, `pnpm theme:verify` if the schema changed.
- `DS_REVIEW` inspects a screen with a theme; it does not show that a payment finished. To call payment, redirect or confirmation covered, simulate the whole order and provider cycle, frames and return included, and record the simulated order id, the number of submissions and the final route ([design-system.md](references/design-system.md#verifying-a-piece)).
- State what was not measured.

## Limits

- No merge, push to `main` or deploy without Sergio's authorization. `main` deploys itself: a merged schema change publishes to api-core.
- `product.schema.json` changes only per THEMING.md §6, flagged in the hand-back, never silently.
- `src/@/components` is a submodule: not edited here (open a PR in `ordering-components`).
- No real orders or real payments while testing: use test projects, mocked network or disposable data Sergio authorized.
- Kiosk mode (`use_kiosk`) only changes flows, not styles: pieces must not depend on hover, and the 44 px touch floor applies (a kiosk is a coarse pointer).

## What to hand back

1. Task line, dependencies and the parity table (or its link).
2. The design decision: the options shown and the one chosen, with the surface and the criterion of [references/surfaces.md](references/surfaces.md) that decides it; or `No design decision: <reason>` (`theme value`, `px-map`, the same value...).
3. Theming: helpers/properties used; any value that did not fit (exception); each `TOKEN-GAP(<issue>)` with the token used instead; **new schema settings** (each flagged); **stored values failing AA or 3:1** (reported, unchanged); migration gaps (controls kept legacy because they have no piece).
4. States covered and usability findings (dead ends in the format above).
5. Evidence: level of verification, themes and widths checked, where (`design-system-preview.html`, the app with `DS_REVIEW=1`) and with what (computed-style assertions, tests), the result of `pnpm design:check` and `pnpm design:ratchet`, the gate you showed red; what was not measured.
