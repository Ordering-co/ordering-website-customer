/**
 * The number the header's cart shows: the units (the sum of `quantity`) of every
 * cart it receives, valid or not: CartContent lists a cart with products
 * even when it cannot be paid yet (Delivery without an address, out of zone),
 * so the count must not hide it. A reservation cart without products counts 1.
 */
export const cartItemsCount = (carts) => (carts || []).reduce((total, cart) => {
  const products = cart?.products || []
  if (!products.length) return total + (cart?.reservation ? 1 : 0)
  return total + products.reduce((units, product) => units + (Number(product?.quantity) > 0 ? Number(product.quantity) : 1), 0)
}, 0)
