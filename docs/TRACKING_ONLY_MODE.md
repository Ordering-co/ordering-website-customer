# Tracking-only mode

Turns a site of this marketplace into an order-tracking page only. Customers open the link they receive (WhatsApp, SMS, email) and follow their order; there is no menu, cart, login, store pages or footer.

## How it is activated

The switch is the site setting `site.tracking_only` (a boolean, `false` by default), saved per site with the rest of the site settings.

- In `product.schema.json` it is the toggle of the group `tracking` ("Tracking-only mode") of the editor section `site` ("Website settings").
- The app reads it with `isTrackingOnly(theme)` (`src/utils/siteSettings.js`) on the app theme (`src/App.js`, `src/pages/OrderDetails`).

Every site has its own settings, so other sites of the same project keep it off and behave as a normal marketplace. A client that wants a full website **and** a tracking URL needs two sites.

## What changes in the app

| Area | Tracking-only behaviour |
|------|-------------------------|
| Routes (`src/components/TrackingOnlyRoutes`) | `/` and `/home` render the landing; `/orders/:orderId` renders the order when there is a session or a `?hash=`, else redirects to `/`; everything else redirects to `/`. |
| Header (`src/ui/src/components/Header`) | The logo only (visibility `header.logo`), sized by the header's logo box (`components.header` `logo_height` / `logo_width`), loaded at once, linking home. No sidebar, order context, search, login, signup, cart or language selector. |
| Shell (`src/App.js`) | The footer never shows (`isFooterPage`), nor the bottom navigation, the smart app banner, the PWA prompt or the profile-completion gate. |
| Landing (`src/pages/TrackingHome`, `src/ui/src/components/TrackingHome`) | "Follow your order" and "open the link we sent you"; the site logo is in the header. |
| Order page (`src/ui/src/components/OrderDetails/layouts/Tracking`) | See below. |

## The order page

`OrderDetails` renders the layout `layouts/Tracking` when `isTrackingOnly` is set.

- **Status** (an h1): the stage of a delivery order (preparing, on the way, arrived, delivered) or the status text of any other order; "Order canceled" for a rejected one.
- **Progress**: the bar (`components.progress`, md) with four stage icons over it (store → on the way → home → delivered), filled by thirds. Hidden by visibility `confirmation.order.progress`.
- **Delivery time** (delivery orders): "Estimated delivery HH:mm – HH:mm" from `delivery_datetime_utc` plus `eta_time`, a window of 10 minutes, shown in the user's time. Without `delivery_datetime_utc` there is no estimate. Hidden by visibility `confirmation.order.eta`. Once completed it says "Delivered at" instead.
- **Delivery PIN**: the code the customer gives the driver (`OrderDetails/DeliveryPin.js`), under the delivery time while the order is not completed and the API asks for it (`delivery_pin` with `delivery_pin_status` `requested`). The active order details show it under the order number.
- **Static map**: the business on a static map before the driver's live map applies (not in a driver status, not completed or rejected), with a Google Maps key and the section `map` of `pages.order_details` visible.
- **The tracking group** of `pages.order_details` (their order and visibility):
  - `live_map`: the driver's live map, full width, with a button to expand it to the whole screen. It needs the key, the driver's location and a driver status.
  - `tabs`: two tabs while a delivery is in flight. Delivery: address, customer name and phone, the driver (photo, name, vehicle and plate) with a call button. Your order: the totals, the products and the payment method.
  - `customer_card` and `driver_card`: the customer's and the driver's cards of an order that is not a delivery.
- **Survey**, once delivered (hidden by visibility `orders.review_order_button`): intro → stars for the order and the delivery's rating (two thumbs or a scale of five points, as `components.rating_scale.base.mode` says) with reason chips and an optional comment → thanks. Once `order.review` exists only the thank-you text shows.
  - It posts the order review to `POST /business/{business_id}/reviews` (stars, `quality_tags`, comment) and the driver review to `POST /users/{driver_id}/user_reviews` (the delivery's points: good 5, bad 1, or the scale's; `tags`, comment) with the guest hash header (`surveyRequests.js`).

### What the theme decides

- **Visibility**:
  - the order: `confirmation.order.progress`, `confirmation.order.eta`;
  - the driver: `confirmation.driver.name`, `.photo`, `.phone`, `.plate`;
  - the customer: `confirmation.customer.photo`, `.email`, `.phone`, `.address`;
  - the survey: `orders.review_order_button`;
  - the products: `confirmation.products.image`; a product without a photo shows `images.placeholder.product` unless `product.dummy_image` is hidden.
- **Page sections**: `pages.order_details`, the section `map` (the static map) and the group `tracking` (`live_map`, `tabs`, `customer_card`, `driver_card`).
- **Images**: the map markers `images.map.driver`, `images.map.store` (the business logo before the bundled marker) and `images.map.customer`; the survey's image `images.tracking.survey` (the business logo without it).
- **`components.order_tracking`**:
  - `base`: the stages (`step_size`, `step_icon_size`, `step_active`, `step_inactive`), the status (`status_text`, with its `platforms.mobile_web` value, `status_color`), the delivery time (`eta_text`, `eta_color`), `map_height`, `photo_size` (the people's cards), `survey_rating_size` (the order's stars) and `driver_avatar_size` (the driver in the Delivery tab);
  - `slots`: `map_toggle`, `map_toggle_expanded`, `tabs`, `survey_start`, `survey_chip`, `survey_submit`.
- The cards are `components.card`; the delivery's thumbs are options of `components.choice`, its scale `components.rating_scale`.

## Courier projects

Some clients use the tracking page for deliveries they run on behalf of another brand. In those orders the delivery fee is what the courier pays the driver, the products carry price 0 and the real order detail lives in the comments, so the costs make no sense to the end customer.

Projects listed in `COURIER_TRACKING_PROJECTS` (`src/utils/trackingOnlyMode.js`, matched with `includes` against `ordering.project`) change the "Your order" tab:

- Shows the order number (`#order.id`) at the top.
- Hides the whole cost breakdown and the payment method.
- Lists every product, including price 0 ones, without prices; each product keeps its comment.
- Shows the order comment (`order.comment`) under the products.

To enable it for another client, add its project name to the list.

## Checklist when activating a client

- `site.tracking_only` on, in the tracking site only.
- Branding (logo, favicon, colors, fonts) in the site's theme.
- `google_maps_api_key` set for the project, with HTTP referrer restrictions that include the tracking domain.
- The `?hash=` link opens the order while the API accepts it; after that the page shows "Sorry, the order has expired."

## Tests

- Unit: `src/utils/__tests__/siteSettings.test.js` (`isTrackingOnly`), `src/utils/__tests__/trackingOnlyMode.test.js`, `src/components/TrackingOnlyRoutes/__tests__`, `src/pages/TrackingHome/__tests__`, `src/ui/src/components/TrackingHome/__tests__`, `src/ui/src/components/OrderDetails/layouts/Tracking/__tests__`, the tracking-only case of `src/ui/src/components/Header/__tests__/Header.test.jsx`.
- Browser: `e2e/docs/specs/tracking-only.spec.js` (`npx playwright test -c playwright.docs.config.js e2e/docs/specs/tracking-only.spec.js`).
