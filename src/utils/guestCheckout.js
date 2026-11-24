const guestOrderTypes = {
  1: 'delivery',
  2: 'pickup',
  3: 'eatin',
  4: 'curbside',
  5: 'drivethru',
  6: 'seatdelivery',
  7: 'catering_delivery',
  8: 'catering_pickup'
}

export const isGuestCheckoutEnabled = (configs) => {
  const value = configs?.guest_checkout_enabled?.value
  return value === true || value === 1 || value === '1'
}

export const isGuestOrderTypeAllowed = (configs, orderType) => {
  const token = guestOrderTypes[orderType]
  const value = configs?.allowed_order_types_guest_checkout?.value
  const entries = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[|,]/) : []
  return !!token && entries.some(entry => typeof entry === 'string' && entry.trim() === token)
}

/**
 * Whether guest checkout is allowed: the site settings say so for this
 * order type, or `guestStore` (implementation notes, One store / entered directly on
 * a store) says to let a guest through regardless of those settings.
 */
export const isGuestCheckoutAllowed = (configs, orderType, { guestStore = false } = {}) => (
  guestStore || (isGuestCheckoutEnabled(configs) && isGuestOrderTypeAllowed(configs, orderType))
)
