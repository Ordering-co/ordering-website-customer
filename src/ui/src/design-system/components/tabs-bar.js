// What the entry needs of the tabs (the header's order-type capsule) without the Base UI tabs
// piece: `components/Tabs.jsx` re-exports both for everything else.
import { themeSlot } from '~/utils/themeGroups'

/**
 * The options of a tabs slot (`components.<group>.slots.<slot>`: the header's
 * `order_type`, the product option's `halves`), with the public names of the
 * piece: spread them on `Tabs` with the slot's `group`. What the slot chose,
 * else `defaults` (the look the piece has without a slot); a slot with no
 * variant leaves the theme's default style (`components.tabs.base.variant`).
 */
export const slotTabsOptions = (theme, group, slot, defaults = {}) => {
  const value = themeSlot(theme, group, slot)
  return { ...defaults, ...(value?.size && { size: value.size }), ...(value?.variant && { variant: value.variant }) }
}

// Every value is `components.tabs`, written on the root by `componentVars`; a class
// only says which property reads which variable. The keyboard focus ring is the
// app's global one (src/ui/src/styles/Focus): it is not repeated here, only drawn
// inside the tab where the bar scrolls (outside, the bar's overflow would cut it).
// shortcut: the bar scrolls with the browser's own scrollbar and does not scroll
// the selected tab into view on mount (a focused tab does); upgrade if a store has
// more tabs than fit a phone.
export const scrollingTabsBarClass = /* touch-target */ 'ui:overflow-x-auto ui:overscroll-x-contain ui:max-mobile:min-h-[calc(44px+var(--ui-tabs-rim))] ui:pointer-coarse:min-h-[calc(44px+var(--ui-tabs-rim))]'
