import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'styled-components'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { Button } from '~ui/src/design-system/components/Button'
import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { HeaderCartButton } from '~ui/src/components/HeaderOption/HeaderCartButton'
import { headerScrollBehavior, HEADER_SCROLL_FIXED } from '~ui/src/components/Header/scrollBehavior'
import { HEADER_STORE_SLOT_SELECTOR, focusHeaderEntry, watchBehindHeader } from '~ui/src/components/Header/behindHeader'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeVisible } from '~/utils/themeVisibility'
import { singleStoreCarts, singleStoreSlug } from '~/utils/singleStore'
import { cartItemsCount } from '~/utils/cartItemsCount'
import settings from '../../../../config'
import { BackArrow, StickyBrandLogo, StickyHeader, StickyTitle } from './styles'

/**
 * The cart of the header on the revealing header's bar: it opens the header's
 * cart (its popover, or its modal on narrow screens), on every screen but the
 * multi checkout. The page's carts and session are read here, not by the bar
 * with a fixed header, which has no cart of its own.
 */
const StickyCart = () => {
  const [events] = useEvent()
  const [orderState] = useOrder()
  const theme = useTheme()

  // with or without a session, as the header's
  const showCart = !window.location.pathname?.includes('/multi-checkout')
  // The badge counts what the header's does: the units of the carts with
  // products, valid or not; in a single store site, only the store's carts
  const count = cartItemsCount(singleStoreCarts(Object.values(orderState?.carts || {})
    .filter(cart => (cart?.products?.length > 0) || cart?.reservation), singleStoreSlug(theme, settings)))

  // the badge is the header's: hidden with it (visibility.header.cart_count)
  const showCount = themeVisible(theme, 'header.cart_count')
  if (!showCart) return null
  return (
    <HeaderCartButton
      data-doc-control='cart-open'
      count={showCount ? count : null}
      onClick={() => events.emit('header_cart_open')}
    />
  )
}

/**
 * The business's header fixed on top while the page is past the
 * business name (BusinessBasicInformation toggles `fixed-name` on
 * #business_name_bar). It repeats the name (the title stays in its place,
 * hidden here from assistive tech) and has the cart of the header, which
 * opens the header's cart (its popover, or its modal on narrow screens).
 * With `onBack` (the page shows its back arrow), it starts with that arrow:
 * a link to the list, as the page's.
 *
 * With a fixed header (implementation notes, scroll_behavior fixed) the bar paints
 * nothing of its own — it stays in the page, without a box, for those that
 * look for it — and the header's row has the store instead: once the name
 * (`#business_name`) goes behind the header, the back arrow and the name (or
 * the brand's logo) take the logo's place in the header's store slot, from
 * here, by a portal. Its cart is the row's own. A revealing header keeps the
 * bar as above.
 *
 * `brand` (implementation notes, Single Restaurant only — BusinessBasicInformation's
 * `headerBrand`, null in Marketplace): a small logo image instead of the
 * name, when the header would be showing one too (kind `site` or `store`);
 * the name as text, unchanged, otherwise.
 */
export const BusinessStickyHeader = ({ name, onBack, brand }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const fused = headerScrollBehavior(theme) === HEADER_SCROLL_FIXED
  // the name has gone behind the header: the row shows the store (fixed header)
  const [nameBehind, setNameBehind] = useState(false)
  // the header's store slot, looked for again each time the name goes behind
  // the header (it can have mounted again since)
  const [slot, setSlot] = useState(null)
  // the focus was on the back arrow as it left the row: it goes to the header's logo
  const refocus = useRef(false)
  useEffect(() => {
    if (!fused) return undefined
    const stop = watchBehindHeader(document.getElementById('business_name'), (behind) => {
      const found = document.querySelector(HEADER_STORE_SLOT_SELECTOR)
      if (!behind && found?.contains(document.activeElement)) refocus.current = true
      setSlot(found)
      setNameBehind(behind)
    })
    return () => {
      stop()
      setNameBehind(false)
    }
  }, [fused, name])
  // the arrow is gone from the DOM now: the focus would fall to the body
  useEffect(() => {
    if (nameBehind || !refocus.current) return
    refocus.current = false
    focusHeaderEntry()
  }, [nameBehind])

  // Single Restaurant only (brand is null in Marketplace, BusinessBasicInformation):
  // a small logo image instead of the name; the bar's own aria-label (the
  // image's stand-in, since StickyTitle's text already carries the name
  // when it shows) only applies then — Marketplace's DOM stays as before.
  const showsBrandImage = brand?.kind === 'site' || brand?.kind === 'store'

  const title = showsBrandImage
    ? <StickyBrandLogo aria-hidden='true' alt={name} title={name} src={brand.logoSrc} />
    : <StickyTitle aria-hidden='true' title={name}>{name}</StickyTitle>

  // the page's back arrow: the base Button of components.business_header.slots.back
  const back = onBack && (
    <Button
      {...slotButtonOptions(theme, 'business_header', 'back', { color: 'neutral', appearance: 'ghost', size: 'md' })}
      shape='icon'
      render={<a href='/search' />}
      nativeButton={false}
      aria-label={t('BACK', 'Back')}
      onClick={onBack}
    >
      <BackArrow><HeaderIcon name='arrowLeft' /></BackArrow>
    </Button>
  )

  if (fused) {
    return (
      <>
        <StickyHeader $fused id='business_name_bar' data-doc-section='business-sticky-header' />
        {nameBehind && slot && createPortal(
          <>
            {back}
            {title}
          </>,
          slot
        )}
      </>
    )
  }

  return (
    <StickyHeader id='business_name_bar' data-doc-section='business-sticky-header' {...(showsBrandImage && { 'aria-label': name })}>
      {back}
      {title}
      <StickyCart />
    </StickyHeader>
  )
}
