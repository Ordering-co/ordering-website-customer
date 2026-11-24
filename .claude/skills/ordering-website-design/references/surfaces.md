# Choosing the surface

Pick the smallest surface that lets a customer on a phone finish the task without losing their place. This is a consumer, mobile-first site (390 px first, 1440 px second), not a back-office: a surface that works on a desktop but traps the thumb is wrong. Sizes, radii, shadows, motion and backgrounds come from the theme (see [theming.md](theming.md)); this file decides *which* surface.

Paths are relative to `src/ui/src/components/` unless noted.

## Decision table

| Surface | Use when | Avoid when | In this repo |
| --- | --- | --- | --- |
| **Page** (route) | The task is long or has steps, people reload, share or come back to it, or it needs its own URL. | The customer must keep seeing what is behind (the menu while choosing options). | `src/pages/*`, routes in `src/App.js`: `/checkout/:cartUuid?`, `/orders/:orderId`, `/profile`, `/profile/orders`, `/profile/addresses`, `/profile/cards`, `/search` |
| **Modal / dialog** | A short focused decision or form that interrupts on purpose: sign in or sign up, choose an address, confirm, product details with options. | Long content that scrolls a lot on a phone (use a page or a sheet); a plain edit that could be inline. | base `Dialog` through `DialogOverlay` (`components/Overlay/overlays.js`; `LazyDialog` of `Overlay/lazyOverlay.js` in the entry chunk), the title a content hands with `ModalHeading`; `LoginForm`, `SignUpForm`, `ProductForm` (inside `ComponentScope group='product_modal'`), `OrderSuccessModal` |
| **Bottom sheet** | Phone-first choice or short form that should feel attached to the thumb: date/time, categories, filters, quick pickers. Dismiss by its close button, Esc or the backdrop; the base `Sheet` has no drag (a pending capability: declare it if the chosen design needs it). | A task with a destructive or irreversible step that needs a deliberate button; anything wider than one column on desktop. | base `Sheet` through `SheetOverlay` / `LazySheet` (`components/Overlay/`), used by `Select`, `DatePicker`, `CategoriesPopover` and the cart drawer (`side='right'`) |
| **Popover** (non-modal) | Peek or narrow without leaving the view, mostly on desktop: cart peek, address list, user menu. Closes on outside click. | A form with validation or anything lost on an outside click; on a phone, unless it becomes a sheet or page (check, don't assume). | `CartPopover`, `AddressesPopover`, `CategoriesPopover`, `UserPopover` |
| **Sticky / fixed bar** | One persistent primary action or context while scrolling: add to cart in the product modal, "View cart" / "Checkout", free-delivery progress, bottom navigation. | More than one primary action; anything that covers content or the keyboard; hidden by a store's theme. | `FloatingButton`, `NavigationBar` (schema `bottom_nav`), `BusinessStickyHeader`, `FreeDeliveryProgress` |
| **Inline** | One value that saves on its own and is safe to change: quantity, favorite, a switch. Shows failure in place and rolls back. | It affects money, other records or needs confirmation. | `Stepper` (`design-system/components/Stepper.jsx`), `FavoriteButton` |

## Questions that decide it

1. **How long is the task?** One value, inline. A choice or 1-5 fields, sheet on phone and modal or popover on desktop. A flow with steps or money (checkout), a page.
2. **Must the customer keep seeing what is behind?** Yes, modal/sheet/popover. No, page.
3. **Is it a detour from another task** (log in during checkout, add an address while paying)? A dialog or sheet on top that **returns to the same step with the draft intact**. Never navigate away and lose the cart or the form.
4. **Does it need a URL?** If people reload, share or the back button must work (an order, a store, a product), it is a route (`/store/:business_slug/:category_slug/:product_slug`), not only state.
5. **Destructive or money?** A confirmation with verb + object, never inline.
6. **Phone (390 px):** one level of overlay at a time, content reachable with the keyboard open, primary action in thumb reach, no horizontal scroll, close button, backdrop and `Esc` (and the back button) close the top layer only. A choice that opens from inside another surface (the pickup time of a product modal) is a step inside the active surface or replaces it for a moment: coming back keeps the product, its options and the focus. For a base `Sheet` verify button, Esc and backdrop; if the chosen design needs a drag, declare it a pending capability. Check it, do not assume it.
7. **Kiosk (`use_kiosk`):** no hover dependence and the 44 px touch floor (a kiosk is a coarse pointer); kiosk changes flows, not styles.

## Portals and `scope`

- `Dialog` and `Sheet` render in a portal, outside the DOM of their opener. Values written as variables on a wrapper do not reach them; the **React theme context does**. A piece inside a portal reads theme values through the helpers (`useTheme()`), not through inherited CSS variables.
- A `scope` group (`auth_form`, `header`, `category_tabs`, `product_modal`, `product_option`) changes components only inside `ComponentScope` (`src/ui/src/styles/ComponentScope`). Wrap the group's own controls only: a modal or popover opened from inside would take the group's look too. If the opener sits in a group and the overlay should not, open it outside the scope.
- `layerBackground(theme)` (`src/ui/src/styles/Layer`) paints bars inside a layer; floating surfaces are `surface` (THEMING.md §5).
- Focus: when an overlay closes, focus returns to what opened it (the pieces do this; any new overlay must too). Verify with `document.activeElement`.
- New overlays (dialog, sheet) are built from the base `Dialog` / `Sheet` pieces in `src/ui/src/design-system/components/` (Base UI), which render in a portal and read the theme (and a `scope` group) from the React context; read their source for props. The legacy `Modal` and `BottomSheet` are retired: a screen opens a layer with `DialogOverlay` / `SheetOverlay` (`components/Overlay/`); do not build another overlay and do not restyle a piece with `styled(...)`. A popover has no base piece yet: reuse the existing ones and flag it as a migration gap. Never import `@base-ui/react` directly from a screen. Details: [design-system.md](design-system.md).

## Anti-patterns

- A modal as the first idea for every edit; a sheet and a modal for the same task on the same breakpoint with different behavior.
- A second overlay stacked on an overlay on a phone (use a step inside the first, or return to it).
- A toast as the only explanation of why an action did nothing; say it in place, next to the action.
- A fixed bar that covers the product's last option, the keyboard, or a store's own footer or cookie banner.
- A page the customer must leave to fix a prerequisite and then restart from scratch.
- Restyling an overlay by class instead of through the theme, so one store's `product_modal` scope no longer applies.
