import { useEffect, useRef, useState } from 'react'
import { useEvent } from '~components/contexts/EventContext'
import { storeCartInPage, touchedCartLineCode } from '~/utils/storeCartInPage'

// TOKEN-GAP(implementation notes): how long a touched cart line stays highlighted. It is a hold time, not a motion: no token.
export const CART_LINE_HIGHLIGHT_MS = 2500

/**
 * The code of the cart line a product add or update just touched, for the few seconds it stays highlighted
 * (implementation notesthe cart beside the menu shows what changed instead of opening the drawer), else null.
 */
export const useCartLineHighlight = (cart) => {
  const [events] = useEvent()
  const [code, setCode] = useState(null)
  const timer = useRef(null)
  // the codes the cart had when the event arrives (it fires before the cart renders again)
  const previousCodes = useRef([])
  previousCodes.current = (cart?.products || []).map(line => line.code)

  useEffect(() => {
    const handleTouched = (product, touchedCart) => {
      const next = touchedCartLineCode(product, touchedCart, previousCodes.current)
      if (!next) return
      clearTimeout(timer.current)
      setCode(next)
      timer.current = setTimeout(() => setCode(null), CART_LINE_HIGHLIGHT_MS)
    }
    events.on('cart_product_added', handleTouched)
    events.on('cart_product_updated', handleTouched)
    return () => {
      events.off('cart_product_added', handleTouched)
      events.off('cart_product_updated', handleTouched)
    }
  }, [events])

  useEffect(() => () => clearTimeout(timer.current), [])

  return code
}

/**
 * A counter that grows with every product add or update while `enabled`: the "View cart" bar restarts its short
 * animation from it (0: nothing has been added yet, so the bar rests).
 */
export const useCartBarPulse = (enabled) => {
  const [events] = useEvent()
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    // back to rest when the bar stops being the cart's place (a resize to the panel): it does not pulse on return
    if (!enabled) {
      setPulse(0)
      return undefined
    }
    const bump = () => setPulse(count => count + 1)
    events.on('cart_product_added', bump)
    events.on('cart_product_updated', bump)
    return () => {
      events.off('cart_product_added', bump)
      events.off('cart_product_updated', bump)
    }
  }, [events, enabled])

  return pulse
}

/**
 * A counter that grows with every product add or update while the store page keeps the cart in the header's drawer
 * (`storeCartInPage() === 'header'`, the direct menu without the cart column): the header's cart icon restarts its
 * short count animation from it. Read when the event arrives, because the store page publishes the mode in another
 * tree.
 */
export const useCartIconPulse = () => {
  const [events] = useEvent()
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const bump = () => { if (storeCartInPage() === 'header') setPulse(count => count + 1) }
    events.on('cart_product_added', bump)
    events.on('cart_product_updated', bump)
    return () => {
      events.off('cart_product_added', bump)
      events.off('cart_product_updated', bump)
    }
  }, [events])

  return pulse
}
