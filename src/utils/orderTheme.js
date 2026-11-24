import { slotButtonProps, themeSlot } from './themeGroups'

/**
 * The order's pages: `components.order_details` (the order's page, active
 * and finished) and `components.order_tracking` (the tracking-only page).
 * Their `base` props tune the pieces of the page; their `slots` name the
 * size and look of the controls drawn with other components.
 */
export const ORDER_DETAILS = 'order_details'
export const ORDER_TRACKING = 'order_tracking'

/** The props of a button slot for a `Button` / `IconButton`. */
export const orderButtonProps = (theme, component, slot) => slotButtonProps(theme, component, slot)

/** The props of a chip slot for a `Chip` (its size). Empty otherwise. */
export const orderChipProps = (theme, component, slot) => {
  const size = themeSlot(theme, component, slot)?.size
  return size ? { $size: size } : {}
}
