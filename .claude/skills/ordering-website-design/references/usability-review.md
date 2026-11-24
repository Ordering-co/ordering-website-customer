# Usability review for ordering flows

Review by using the flow, not by reading the diff. Two walks, one checklist, one report. The method (inventory on main, parity, hands-on QA, defects with IDs, rounds) is the redesign method of `ordering-brand-system` (`references/redesign.md`); the identity, palette and tokens of that skill are not used here.

## Walks

1. **First-time guest, empty cart, nothing saved.** No account, no address, no cards, no favorites, no orders. From the entry a real customer uses (home, a shared store link, search, a promotion, a reorder link) to the end: the order is placed and visible at `/orders/:orderId`, or the account exists.
2. **Returning customer with data.** Saved addresses and cards, past orders, long names, a closed store, an unavailable product, a coupon, a long cart. Check reorder, the pickers and the selected value.

At each step ask: *can I continue from here without leaving or losing my cart?* If not, it is a dead end.

Run each walk in **at least two themes** besides the default, at 390 and 1440 px. A defect that appears in one theme is a defect. The two full walks are for a new flow or a change that alters one; a semantic token swap checks the widths it affects (the repo's own instructions may ask for both), and a read-only review reports its findings without writing files.

## Checklist (Nielsen's heuristics for a consumer ordering site)

Score 0-4 or `n/a` with a reason; 0-1 is a finding.

| # | Heuristic | What to check |
| --- | --- | --- |
| 1 | Visibility of system status | Loading in the final layout; the cart count and totals update visibly; the button shows progress when paying; order status is clear. |
| 2 | Match with the real world | Words customers use (delivery, pickup, schedule, tip), not API names; the same word for the same thing in every screen and language. |
| 3 | User control and freedom | Back, Esc and close always work and return to the same place; the cart and drafts survive login, closing a sheet and navigation. |
| 4 | Consistency and standards | The same primitive for the same job (`src/ui/src/styles/`); a hand-built twin is a finding; the same verb for the same action. |
| 5 | Error prevention | Order type, address, time and store hours are settled before "Place order"; impossible choices are explained, not only disabled. |
| 6 | Recognition rather than recall | Totals, address, time and payment visible on the pay step; the customer never has to remember to "go do X first". |
| 7 | Flexibility and efficiency | Guest path, saved address and card, reorder, keyboard path, autofill, search. |
| 8 | Aesthetic and minimalist design | One primary action; no repeated explanation; the store's own look is what the customer sees, not a generic one. |
| 9 | Recover from errors | What failed and how to fix it, in place, with retry; typed values survive; a failed payment never leaves an unclear order state. |
| 10 | Help and documentation | Help next to the field that needs it; empty states say what the thing is for and what to do next. |

Also check: 200 % zoom and 20 px root font size, a long name and long address in every language the project ships (`i18n/`), RTL, reduced motion, touch targets and no hover dependence (kiosk), focus visible and returning to the opener after every close or step change, contrast AA with each theme used.

## Theming checks (every review)

- Computed CSS of the key pieces equals what the helpers return for that theme (background, color, radius, border, shadow, font, height), including inside portals and `scope` groups.
- Nothing a store hides (`themeVisible`, `themePages`) is shown by the redesign; nothing a store configured is overridden.
- No literal in the diff (hex, `rgb()`, `px`, `ms`, font name); `src/utils/themeTokens.js` helpers used, no inline `theme.values...`.
- Contrast pairs that fail AA with a stored theme value are listed for Sergio (store, key, value, ratio); none is fixed in the diff.
- Any new schema setting is listed (see [theming.md](theming.md)).

## Defects

Give every defect an ID (`WEB-nn`) before fixing it, whatever its origin. One line:

```
route › step › missing dependency › what the user sees (file:line) › proposal › severity
```

Severity: **roto** loses the cart or a draft, blocks ordering or paying, or states something false; **mal** works but is inconsistent, misleading, inaccessible, moves the layout or breaks one theme; **pulido** polish. A defect is `fixed` with a test that failed before and a live check after; only the next review round marks it `verified`. Fix the class, not the instance: search every sibling use of the mechanism in the tree and fix them through one shared helper.

## Independent review

The builder is the worst reviewer of a flow's dead ends. For a redesign or a new flow, ask a second reviewer with fresh context to do the guest walk without reading the implementation, then compare findings; label a coordinator-launched review "fresh context", not "independent". Reviewers are read-only, use their own session, and make no real orders or payments: block writes and third-party calls, list blocked flows as not covered, and cover them with fakes or disposable test data Sergio authorized. Pay, redirect and confirmation count as covered only with the whole order and provider cycle simulated (see `DS_REVIEW` in [design-system.md](design-system.md#verifying-a-piece)).

## Parity with main

Compare the branch with `main` by code: every action, state and datum of the inventory still exists, in each theme and site mode (single store, marketplace, kiosk, tracking-only). Removing, hiding, moving or adding steps needs Sergio's explicit approval; report it as `unapproved change` and keep main's behavior until he decides. Hand-back lists what was and was not measured.
