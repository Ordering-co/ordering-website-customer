# Order flows end to end

A flow is finished when the customer got what they came for (an order placed and confirmed, an account created, a previous order back in the cart) without hitting a dead end and without losing the cart or the draft. This file is the contract. Visuals and values come from the theme ([theming.md](theming.md)).

Routes are in `src/App.js`; screens in `src/pages/*` compose wired `~ui` components. Do not trust this list over the code: walk it.

## 1. Flows to cover

| Flow | Route and pieces (verify in code) |
| --- | --- |
| Find a store | `/` and `/home` (`pages/Home`, `HomeHero`, `BusinessesListing`), `/business_search`, `/search`, `/promotions`; single-store sites open the store directly (`src/utils/singleStore.js`) |
| Order | `/store/:business_slug` (`BusinessProductsList`), product at `/store/:business_slug/:category_slug/:product_slug` (`ProductForm` modal), cart (`CartPopover`, `CartSidebar`, `/multi-cart`) |
| Pay | `/checkout/:cartUuid?`, `/multi-checkout/:cartUuid?` (`pages/Checkout`, `Checkout`, `PaymentOptions`, `CouponControl`, `DriverTips`, `AddressList`, `BusinessPreorder`) |
| Confirm and follow | `OrderSuccessModal`, `/orders/:orderId`, `/multi-orders/:orderId` (`OrderDetails`, `OrderProgress`, `TrackingHome`) |
| Sign in and sign up | modals from the header and the checkout guest step (`LoginForm`, `SignUpForm`, `ForgotPasswordForm`, `VerifyCodeForm`), `/password/reset`, `/verify`, `CompleteProfile` (rendered from `src/App.js`, not a route) |
| Reorder | `/profile/orders` (`MyOrders`), `OrderItAgain`, `LastOrders`, `OrdersOption/PreviousProductsOrdered` |
| Account | `/profile`, `/profile/addresses`, `/profile/cards`, `/wallets`, `/favorite`, `/messages`, `/help` |

Site modes change the flows: single store, marketplace, kiosk (`use_kiosk`), tracking-only (`site.tracking_only`, `docs/TRACKING_ONLY_MODE.md`), guest checkout (`src/utils/guestCheckout.js`). A redesign must work in each mode that reaches the screen.

## 2. Declare what the flow needs

Before designing, list every dependency a step reads from somewhere else and fill the table from **code**, not guesses (look for the branch that renders when the list is empty, loading, failed or not allowed).

| Dependency | Required? | Who can fix it, where | What the screen shows today when missing, loading, failed |
| --- | --- | --- | --- |
| Delivery address / order type | delivery only | the customer, an address form or sheet in the step | ... |
| Open store / schedule | an open store, or a future slot the store allows | the customer: pick another time or store | ... |
| Account or guest allowance | per site settings | the customer: sign in, sign up or continue as guest | ... |
| Payment method | only when the balance is above zero: a cart with a zero balance counts as paid and needs none | the customer: another method; the store's config otherwise | ... |
| Cart not empty, products available | yes | the customer | ... |

## 3. Never a sentence with no action

For each missing dependency, in order of preference:

1. **Fix it in place:** an address, a time, a login in a sheet or dialog on top of the step; on success the customer is back on the **same step with the draft intact** and the new value selected.
2. **Offer the way forward:** another store that is open, "Schedule for later", "Continue as guest" (when `isGuestCheckoutAllowed`), a different payment method, "Browse the menu".
3. **Say why and who:** when the customer cannot fix it ("This store doesn't deliver to your address", "Online payment is unavailable; pay in cash or choose another store"), name the cause and the next best step.

A disabled primary button with no visible reason is the same dead end.

**Derive the success condition from the store's configuration and the cart**, not from a fixed list of steps. With a zero balance, keep the path that asks for no payment method (checkout treats the step as complete and only lists a missing method when the balance is positive: read `Checkout/index.js`). With the store closed and a future slot available, the path is to schedule and confirm for that slot (`BusinessPreorder`). If the store admits no order at all, keep the cart, explain the closing and offer only destinations that are available. A valid exit may also be going back to the menu: a closed store is a legitimate end state, not a failure to get around.

## 4. Flow rules

- **Cart safety.** Never lose the cart or a typed draft by navigating, logging in, changing a time or order type, or a failed request. Login in the middle of checkout returns to checkout.
- **Order type and address first.** Show early what delivery, pickup and the chosen time mean for this store, before the customer fills the cart. Not after "Place order" fails.
- **Guest is first class** when the site allows it: the guest path is as short as the signed-in one and says what an account would add.
- **One primary action per screen**, verb + object ("Place order", "Add to cart"), in thumb reach on a phone; secondary actions visibly secondary. Totals visible before paying.
- **Validation** in the field, on blur or submit, saying how to fix it; never only in a toast. Typed values survive a failed submit.
- **Payment** never double-submits: the button shows progress and blocks repeats; failure says what failed and offers retry or another method; a redirect payment (`StripeRedirectForm`) returns to the order, not to home.
- **Confirmation** says what happens next (order number, store, time, how to follow it) and links to the detail page; the detail page is reachable by URL after reload.
- **Reorder** puts the previous products in the cart with unavailable ones listed by name, not dropped silently; the customer ends in the cart or checkout.
- **Respect the theme's switches:** a step or element a store hides with `themeVisible` / `themePages` stays hidden; the flow must still complete without it.

## 5. States to cover on every screen and field

| State | What to design |
| --- | --- |
| Loading | Skeleton in the final layout (loading placeholders are themed globally; a component does not color its skeletons), no layout jump. |
| Empty | First use, with the action that fills it: empty cart, no orders yet, no saved addresses or cards, no favorites, no search results (clear filters, widen the area). |
| Error | What failed and Retry in place; offline (`NotNetworkConnectivity`, `connection_status`); not found (`PageNotFound`, `NotFoundSource`). |
| Store closed or out of hours | Say when it opens; offer "Schedule for later" or other stores; the menu can be browsed read-only when the store allows it; add-to-cart explains why it is unavailable. |
| Read-only / tracking-only / past order | Detail is viewable, actions that cannot apply are absent or explained, not disabled in silence. |
| Guest | What is available without an account and what asks for one, at the moment it is needed. |
| No permission / not allowed | Why, and the next best step. |
| Unavailable product or option | Marked at the item, with the way forward (remove, replace); the cart total stays correct. |

## 6. Tests that prove the path

- The empty or missing state renders its action, not just text.
- The in-place fix completes and the original step keeps its draft and shows the new value.
- Variants of checkout reach the outcome their configuration allows, with the network mocked (no real orders, no real payments): guest and signed-in reach the confirmation; a zero balance with no card reaches it; a closed store with a future slot confirms for that slot; a closed store with no slot and no alternative explains how to leave and sends no request to create an order.
- Keyboard path works (Tab order, Enter, `Esc` closes only the top layer); focus returns to the opener.
- Render the real controller and providers of the screen and mock only the network: a mock of the controller proves nothing about the flow.
