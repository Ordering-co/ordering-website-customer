import { themeVisible } from '~/utils/themeVisibility'
import { showsCustomerAddress } from '~/utils/singleStore'

/**
 * Where the order context (order type, moment, address) is at each width:
 * the three go together. Below 1024px all of it is the bar docked under the
 * header (OrderContextUI isDocked); from 1024px all of it is in the header's
 * row and the bar is gone. They share one width so the type, the moment and
 * the address never split between the header and the bar.
 */
export const ORDER_CONTEXT_IN_HEADER = { type: 1024, moment: 1024, address: 1024 }

// From this width the bar is one row (the address the rest of it)
export const ORDER_CONTEXT_BAR_ONE_ROW = 576

// Which controls the header's row has at this width
export const orderContextInHeader = (width) => ({
  type: width >= ORDER_CONTEXT_IN_HEADER.type,
  moment: width >= ORDER_CONTEXT_IN_HEADER.moment,
  address: width >= ORDER_CONTEXT_IN_HEADER.address
})

// Which controls of the order context the theme shows, in the header's row
// and in the bar alike (visibility.order_context.*); the address also needs
// the order type to show it (implementation notes, showsCustomerAddress) — an
// undefined orderType keeps the theme's answer (the behaviour before that
// type existed).
export const orderContextVisible = (theme, orderType) => ({
  type: themeVisible(theme, 'order_context.order_type'),
  moment: themeVisible(theme, 'order_context.moment'),
  address: themeVisible(theme, 'order_context.address') && showsCustomerAddress(orderType)
})

// Which controls the bar docked under the header has at this width: the ones
// the theme shows that the header's row does not have
export const orderContextBarControls = (width, theme, orderType) => {
  const inHeader = orderContextInHeader(width)
  const visible = orderContextVisible(theme, orderType)
  return {
    type: visible.type && !inHeader.type,
    moment: visible.moment && !inHeader.moment,
    address: visible.address && !inHeader.address
  }
}

// Whether the page docks the bar under the header (it has a control left).
// With the theme, also whether the theme shows one of those controls (the bar
// itself renders nothing without one; the moment needs preorders on too)
export const dockOrderContextBar = (width, theme, orderType) => {
  if (width >= ORDER_CONTEXT_IN_HEADER.address) return false
  if (theme === undefined) return true
  return Object.values(orderContextBarControls(width, theme, orderType)).some(Boolean)
}
