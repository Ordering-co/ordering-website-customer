---
name: ordering-website-configuration
description: Configure or change Ordering Website site types, ordering routes, theme states, and screen layouts. Use when working on Marketplace, Franchise, One store, Order tracking, Website experience, or Builder Screen designs.
---

# Ordering Website configuration

1. Identify the website type, its ordering experience, and the screen affected. Use the [configuration guide](../../../docs/website-configuration.md) to match the Builder label to its key and default.
2. Read [the product schema](../../../product.schema.json) and the runtime consumer listed in the guide. Use the existing site settings helpers for routing and the theme helpers for screen values. Check the default behavior of older themes and sites before changing either.
3. For UI and visual changes, apply the [design skill](../ordering-website-design/SKILL.md) and [theming rules](../../../docs/THEMING.md). Change the schema and compile it when a configurable value changes. Follow the repository's schema versioning and validation steps.
4. Verify the affected setup in a fresh session on mobile and desktop. Include the default and the changed variant, and verify draft versus published behavior on a test site if the change touches the Builder's save or publish flow. Use `pnpm theme:verify` and the existing runtime and browser tests for the surface.

Keep examples generic. Record which site types, theme variants, viewport sizes and user steps were actually tested.
