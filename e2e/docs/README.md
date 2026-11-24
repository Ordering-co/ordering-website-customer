# Website documentation capture

The 38 Playwright specs in this directory exercise the Ordering Website with synthetic data. The manifests identify captures for public documentation. The specs also check behavior, including which synthetic API requests a flow makes and which operations it blocks.

## Run the suite

From the repository root, use Node 24 and pnpm. Initialize the repository dependencies and install Playwright Chromium if needed.

```sh
pnpm install
pnpm exec playwright install chromium
```

`playwright.docs.config.js` starts and stops its own Vite server at `http://127.0.0.1:3137`. Leave that port free before running. The configuration uses two Chromium projects, `desktop-chromium` and `mobile-chromium`. Each capture runs in the project listed in its manifest. Some behavioral checks are intentionally desktop-only.

```sh
# Validate fixtures, manifests, and privacy rules without opening a browser.
pnpm docs:website:contract

# Run the contract gate and all 38 specs.
pnpm docs:website:capture

# Run the gate and one article.
pnpm docs:website:browse-businesses:capture

# Run the assertion-only cancellation spec.
pnpm docs:website:cancel-order:assert

# Run a single spec on one project after validating the contract.
pnpm docs:website:contract
pnpm exec playwright test --config=playwright.docs.config.js \
  e2e/docs/specs/tracking-only.spec.js --project=mobile-chromium
```

For other article commands, check `package.json`. The same Playwright command accepts any file under `e2e/docs/specs/`; omit `--project` to run both projects.

Capture images go to `static/img/docs/website/` inside the documentation checkout. The default checkout is a sibling directory named `ordering-docs`. Set `ORDERING_DOCS_ROOT` to point to a different checkout or a private staging directory for a diagnostic run. Keep failure traces, test output, and diagnostic screenshots outside the product tree. A run can redirect Playwright results with `--output`; documented capture filenames and alt text live in the manifest.

## Specs and coverage

| Spec | Coverage |
| --- | --- |
| `addresses.spec.js` | Saved places, empty list, selection and default address, add and edit forms, delete confirmation, and synthetic edit/delete request boundaries. |
| `appointments-professionals.spec.js` | Appointment businesses, service availability, professional profile and schedule, and a busy time slot. |
| `browse-businesses.spec.js` | Marketplace listing on desktop and mobile, category search spacing, closed-business preorder entry, and empty results with and without an address. |
| `business-details.spec.js` | Store header, fulfillment details, information, weekly schedule, photos/lightbox, reviews, closed store, and professionals entry. |
| `business-driver-signup.spec.js` | CMS-configured business and driver application forms and disabled or mode-based route restrictions. |
| `business-menu.spec.js` | Store menu, categories and items, information, empty and closed states, and ASAP behavior for menu schedules and direct product links. |
| `cancel-order.spec.js` | Assertion-only check for the absence of customer cancellation controls and writes across order statuses. |
| `choose-location-order-type.spec.js` | Address entry and fulfillment type selection on desktop and mobile. |
| `complete-checkout.spec.js` | Single-business checkout, fulfillment and totals, required-payment blocking with popup-only methods, and synthetic cash submission. |
| `custom-orders.spec.js` | Custom-order entry, pickup and delivery, distance warning, product and payment form, and synthetic placement boundaries. |
| `customize-product.spec.js` | Product details, options, ingredients, special instructions, quantity, sold-out states, and synthetic cart interactions. |
| `favorites.spec.js` | Saved businesses, products, orders and professionals, empty state, and synthetic removal. |
| `find-products.spec.js` | Menu categories and subcategories, category picker, product search results and empty state, and lazy menu behavior. |
| `global-states.spec.js` | Loading, offline, page not found, cookie consent, and site out of service. |
| `help-content-pages.spec.js` | Help overview and topics, configured content list and details, missing page, and localized footer. |
| `integration-login.spec.js` | Integration sign-in loading and callback/navigation boundaries with synthetic tokens and intercepted requests. |
| `manage-cart.spec.js` | Cart list, item details, empty and invalid states, synthetic cart mutations, and checkout handoff. |
| `messages.spec.js` | Inbox, empty and ended conversations, and business and driver chats from order details. |
| `multi-cart.spec.js` | Grouped carts across businesses, refresh and grouping checks, and checkout handoff. |
| `multi-checkout.spec.js` | Grouped checkout overview, per-business details, review, and route and request boundaries. |
| `order-details-tracking.spec.js` | Active, terminal and unavailable order details, tracking, and grouped orders. |
| `order-history.spec.js` | Order history list, empty state, and status and order summaries. |
| `payment-methods.spec.js` | Checkout payment methods, automatic Cash selection for an unconfigured cart, manual Cash and card-on-delivery transitions, and provider isolation. |
| `profile.spec.js` | Account profile, synthetic identity and form fields, and profile update boundaries. |
| `promotions.spec.js` | Promotion list and details, search, empty states, and request errors. |
| `reorder-reviews.spec.js` | Terminal order actions, reorder confirmation with an existing cart, and business, item and driver review forms. |
| `reset-password.spec.js` | Password recovery request and reset form on desktop and mobile. |
| `saved-cards.spec.js` | Masked cards, unavailable and empty states, deletion confirmation, and synthetic delete success and failure. |
| `schedule-preorder.spec.js` | Preorder entry, fulfillment type, dates and time slots, closed days, selected schedule, and order-context boundaries. |
| `school-student-ordering.spec.js` | Student list and empty state, add and edit forms, school selector, and synthetic student and order-context boundaries. |
| `search-filter-businesses.spec.js` | Business and product search, price and category filters, map, and empty results. |
| `sessions.spec.js` | Active, inactive and empty session lists, plus current, other and all-session deletion controls and request boundaries. |
| `sign-in-create-account.spec.js` | Email, phone password, SMS before sending, registration, and mobile sidebar sign-in entry. |
| `tracking-only.spec.js` | Tracking-only landing and order routes, order tab, active and terminal orders, and missing-order state. |
| `verification-profile-completion.spec.js` | Profile completion and email and phone verification surfaces with synthetic identity and intercepted requests. |
| `wallets.spec.js` | Cash and points wallets, activity, and an empty activity state. |
| `website-modes.spec.js` | Marketplace, single-store, franchise and kiosk presentation and routing. |
| `website-overview.spec.js` | Public homepage hero and address/search entry on desktop and mobile. |

Explicit skips and source-only checks are declared in the specs. A public capture of a form can show a ready-to-submit state while the spec exercises any allowed synthetic write separately.

## Fixtures and inheritance

Each manifest references a fixture by directory name. The loader reads `fixtures/<name>/fixture.json`. Keep the default theme v2, site configs, and pages in the common fixture and have scenario fixtures inherit those defaults through `extends`. Menu, product search and business details share `business-catalog`. Account scenarios inherit the disabled verification and social login defaults from `account`. Keep per-scenario settings, catalog data and route responses in the fixture that uses them. Override only the keys a variant needs.

```json
{
  "extends": "common",
  "firstLoad": {
    "configs": { "order_types_allowed": { "value": "1|2|7|8" } }
  },
  "appendRoutes": [
    {
      "method": "GET",
      "pattern": "^/v400/en/docsmarket/synthetic-example$",
      "response": { "error": false, "result": [] }
    }
  ]
}
```

The fixture name in the example is an existing parent. The override inherits the config row and changes its value. The route illustrates the shape of a scenario-specific response.

- `extends` takes a fixture name. Parents can inherit recursively, and a cycle fails validation.
- Child objects merge recursively. Scalars and arrays replace the parent value. A child `routes` array replaces the inherited scenario routes. Use `appendRoutes` to add routes without replacing them.
- Routes match by API origin, uppercase method, and the regular expression against the pathname plus query string. The first matching route wins, so an appended duplicate cannot override an inherited route. Shared GET fallbacks in `fixtures/common/fixture.json` come last. They require the synthetic API origin, the declared query and a finite request budget. A scenario with an intentional second boot can raise the affected budget explicitly. The guard blocks unmatched and over-budget requests. Reapply the privacy and request checks to derived fixtures.
- Keep the injected `firstLoad` data and the synthetic GET responses for `theme`, `configs`, and `pages` in agreement. The app can request missing config rows and the page index during boot. A scenario can supply those responses explicitly when it needs their contents.
- Check the business listing regions whenever a fixture enables a discovery carousel or sponsored section. The primary list and those sections can render the same business even when the API fixture contains a single row. Assert one visible occurrence in scenarios that promise a single listing.

## Manifest, network and capture contract

- A manifest declares the article ID, local route, fixture, readiness and captures. Captures declare an ID, project, stable selector, file basename and alt text. A capture can override the route and set `capture_mode` to `section` or `viewport`. The contract gate rejects a reference to a missing fixture.
- Use the application’s `data-doc-section` and `data-doc-control` markers. For migrated overlays, use the dialog or sheet content marker and scope the built-in close button via `[data-slot='dialog-close-button']` inside that surface. Confirm the rendered control for custom close buttons.
- `lib/scenario.js` provides shared setup, network isolation, readiness, capture, and final assertions. Specs that need more control use the same helpers directly. Readiness waits for the document, configured selectors and visible images in the capture region. Optional missing images can be hidden with `readiness.allowBrokenImages`. Keep image and network waits bounded.
- Only the configured local app origin serves app assets. API calls are fulfilled by fixtures, optional third-party requests are neutralized or blocked, and unrecognized requests fail the scenario. The suite intercepts WebSockets and checks their isolation. Production orders, payments, cancellations, messages, account changes and applications are forbidden.
- A route’s `response` holds the app payload. Put status, content type, headers and any raw body override under `transport`. Use the route’s `assert` object to verify counts, limits or expected request bodies for synthetic writes.

```json
{
  "method": "POST",
  "pattern": "^/v400/en/docsmarket/orders$",
  "assert": { "count": 1, "bodyContains": { "delivery_type": 1 } },
  "transport": { "status": 201, "contentType": "application/json" },
  "response": { "error": false, "result": { "uuid": "synthetic-order" } }
}
```

- For pre-navigation state such as an ordering address, `localStorage` accepts string keys and values. Use the validated `authSession` fixture field for synthetic authenticated scenarios. Credential-like storage keys, real-looking credentials or payment data, and non-synthetic emails fail validation. A synthetic label buried in unrelated metadata cannot exempt a sensitive value.
- Use only synthetic records and assets. Keep real identities, payment data, credentials, machine-specific paths and session artifacts out of the repository.
