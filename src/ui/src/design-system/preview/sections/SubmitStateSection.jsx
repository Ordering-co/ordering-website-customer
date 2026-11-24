import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { getThemeCss } from '~/utils/themeCss'
import { slotButtonOptions } from '~/utils/themeGroups'
import { Button } from '~ui/src/design-system/components/Button'
import { Spinner } from '~ui/src/styles/Spinner'
import { CHECKOUT } from '~ui/src/components/Checkout/checkoutTheme'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// implementation notesthe sending state of a buying button (the Button with
// `busy`: Add to cart, Place order), at rest and sending, as the app renders
// them. While it sends the button keeps its color, shows the spinner and is not
// disabled; a click on it reaches nothing. The labels are the app's (`t` with
// its fallback: the preview has no LanguageContext, so the fallback shows).
export const SubmitStateSection = () => {
  const theme = useTheme()
  const [, t] = useLanguage()
  // as the product modal's own button and the checkout's: the slot's options with the same size
  const add = { ...slotButtonOptions(theme, 'product_modal', 'add', { color: 'primary', size: 'lg' }), cta: true }
  const place = { ...slotButtonOptions(theme, CHECKOUT, 'place_order', { color: 'primary', size: 'lg' }), cta: true }
  // the clicks that reach a button's own handler, by button (the busy ones must stay at 0)
  const [clicks, setClicks] = useState({})
  const count = (id) => () => setClicks((previous) => ({ ...previous, [id]: (previous[id] || 0) + 1 }))
  return (
    <Section aria-labelledby='submit-state-title' data-testid='submit-state'>
      <SectionTitle id='submit-state-title'>Sending state of a buying button</SectionTitle>
      <Note>
        Add to cart and Place order at rest and while they send: the same color, the spinner before the label, not
        disabled, and a click that does nothing.
      </Note>
      {/* what the theme says of a busy button's row, for the spec to measure it against (the button's icon_gap, the sm ring's diameter and thickness) */}
      <Row data-testid='submit-icon-gap' data-icon-gap={getThemeCss(theme, 'button').base.icon_gap} data-spinner-diameter={getThemeCss(theme, 'spinner').sizes.sm.diameter} data-spinner-thickness={getThemeCss(theme, 'spinner').sizes.sm.thickness}>
        <Button {...add} onClick={count('add-rest')} data-testid='submit-add-rest'>{t('ADD_TO_CART', 'Add to cart')}</Button>
        <Button {...add} busy onClick={count('add-busy')} data-testid='submit-add-busy'>{t('ADDING_TO_CART', 'Adding to cart…')}</Button>
      </Row>
      <Row>
        <Button {...place} onClick={count('place-rest')} data-testid='submit-place-rest'>{t('PLACE_ORDER', 'Place Order')}</Button>
        <Button {...place} busy onClick={count('place-busy')} data-testid='submit-place-busy'>{t('CHECKOUT_PLACING_YOUR_ORDER', 'Placing your order...')}</Button>
      </Row>
      <Row>
        <Spinner $size='md' data-testid='spinner-md' />
        <Spinner $size='lg' data-testid='spinner-lg' />
        <Caption>The md and lg spinners, for the reduced-motion check (the button&apos;s is sm).</Caption>
      </Row>
      <Caption data-testid='submit-clicks' data-clicks={JSON.stringify(clicks)}>
        Clicks that reached a button: {Object.values(clicks).reduce((total, value) => total + value, 0)}
      </Caption>
    </Section>
  )
}
