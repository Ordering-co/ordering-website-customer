# Ordering Website configuration

## Website settings

Choose the site in Ordering.co Dashboard → Builder → Website settings. These settings belong to the website and save independently of the theme.

| Builder choice | Site setting | What customers can do |
| --- | --- | --- |
| Marketplace | `site.mode = marketplace` (default) | Browse and order from the stores of the marketplace. |
| Franchise | `site.mode = franchise` | Browse the locations of the selected brand or franchise. |
| One store | `site.mode = single_store` | Browse and order from the selected restaurant. |
| Order tracking | `site.tracking_only = true` | Open the tracking page and view an existing order. Tracking takes precedence over the site type and experience. |

The website experience controls the entry point. **Online Ordering Only** (`ordering_only`, default) opens ordering at `/`. Depending on the site type, that is the marketplace home, franchise store selector, or single restaurant menu. **Full Website + Online Ordering** (`full_website`) opens a home page at `/` and ordering at `/order`. A franchise can pick a main store to supply content for its home page. See [full website routing](FULL_WEBSITE.md) and [tracking-only mode](TRACKING_ONLY_MODE.md) for exceptions and direct links.

For a local checkout that uses generic settings, follow [Getting started](../README.md#getting-started). A connected site needs a project and site you are authorized to use. For routing code, start with [siteSettings.js](../src/utils/siteSettings.js) and [MenuHomeRoutes](../src/components/MenuHomeRoutes).

## Themes

Open **Theme** for the site to see which saved theme is active. Edit its visual rules under **Theme → Edit**. Save a draft to keep edits in the editor, then publish to make them available in the storefront. Activating another saved theme switches which theme the site uses. Verify the storefront itself after publishing or activating. The Builder's site status, the active theme, and a theme's unpublished draft describe different states.

[Theming rules](THEMING.md) describe how the schema completes older themes with defaults, which values can vary on mobile, and how components read the completed theme. Keep token-based styling and screen settings in the schema so each site retains its own theme.

## Screen designs

In the theme editor, open **Screen designs**. The first option listed in each row is the schema default. A saved theme can choose another option.

| Setting | Theme key | Options and behavior |
| --- | --- | --- |
| Product window design | `components.product_modal.base.layout` | **Product card** (`card`), a photo above the details. **Product showcase** (`showcase`), photo beside the choices on desktop and above them on a phone. **Sheet and two columns** (`sheet`), two columns on desktop and a bottom sheet on a phone. **Side panel, step by step** (`steps`), one group of choices at a time. |
| Add button with required choices missing | `components.product_modal.base.missing_choices` | **Add to cart, then show what’s missing** (`jump`), scroll to the missing choice. **Name the next choice** (`guide`), prompt for the missing choice in the action label. |
| Header while scrolling | `components.header.base.scroll_behavior` | **Stays on top** (`fixed`). **Moves away and comes back** (`reveal`), hides while scrolling down and returns on scroll up. |
| Account invitation | `components.account_invite.base.flow` | **Invite and open sign-up** (`signup_form`), opens the form with order details filled in. **Create it in the window** (`in_window`), asks for a password when enough information is already available. Extra required fields take the guest to the sign-up form. |
| Store list design | `components.business_listing_page.base.layout` | **Grid** (`grid`). **Showcase** (`showcase`), groups stores by availability and can feature a store above the results. |
| Closed stores | `components.business_listing_page.base.closed_stores` | **At the end** (`last`), lists closed stores after open stores. **Mixed with open stores** (`mixed`), keeps search order where the list uses a single group. |
| Filter shortcuts | `components.business_listing_page.base.filters` | **Inline** (`inline`), next to search. **In a sheet** (`sheet`), opens from a Filters button. |
| Store page layout | `components.store_page.base.template` | **Direct menu** (`menu_index`), rows and desktop cart column. **Cover and tabs** (`classic`), a cover and category tabs. **Visual showcase** (`showcase`), large cover and photo grid. **Direct menu, no cart column** (`menu_index_no_cart`), uses the header cart drawer on desktop when available and the regular Direct menu layout on mobile. |

Store list options apply when the storefront shows the themed store list. Showcase can feature a store when the featured section is visible and the results are outside a franchise or business-type filter. The kiosk uses its own layout. The current storefront renders legacy grocery stores with the food-style menu even though the Builder help says grocery layouts are kept.

Start a screen change with the [schema](../product.schema.json) and the matching runtime:

- Product window · [ProductForm](../src/ui/src/components/ProductForm) and [product modal settings](../src/ui/src/components/ProductForm/productModalSettings.js)
- Header · [scroll behavior](../src/ui/src/components/Header/scrollBehavior.js)
- Account invitation · [AccountInvite](../src/ui/src/components/AccountInvite/AccountInvite.js)
- Store list · [listing layouts](../src/ui/src/components/BusinessesListing/layouts/OriginalBusinessesListing)
- Store page · [store page template](../src/ui/src/components/RenderProductsLayout/storePageTemplate.js)

For a store page layout comparison during local development, open the same test store in separate tabs with `?store_template=menu_index`, `classic`, `showcase` or `menu_index_no_cart`. Check the final choice with the theme configuration on a test site. Verify ordering routes and screen layouts in mobile and desktop viewports with a default and an alternate theme. Check the expected route, visible controls, and the next action a customer can take.
