import React from 'react'
import styled, { useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeTextKeepWeight } from '~/utils/productCartTheme'
import { getThemeCss } from '~/utils/themeCss'
import { motionCss } from '~/utils/themeMotion'
import { themeOpacity, themePart, themePartText, themeSpace, themeText } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { srOnlyCss } from '~ui/src/styles/Rules'
import { Spinner } from '~ui/src/styles/Spinner'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Stepper } from '~ui/src/design-system/components/Stepper'
import { Caption, Note, Section, SectionTitle } from '../ui'

// implementation notes, phase 2: how the cart and the checkout summary say "I am
// updating" while a product is edited, changed in quantity or removed. Sergio
// chose option A, "in the line" (the app does it now); this is its mockup, in
// the cart (a phone's sheet, the side cart of a desktop) and in the checkout's
// summary, at rest and updating. Nothing here is the app's: the lines are
// fixed data and no button does anything. The look is the app's
// (components.cart, components.stepper, components.spinner and the theme's
// opacity levels).

const LINES = [
  { code: 'naan', name: 'Stuffed naan', detail: 'Paneer, mint chutney', quantity: 2, price: 13 },
  { code: 'lassi', name: 'Mango lassi', detail: 'Large', quantity: 1, price: 3.5 },
  { code: 'chai', name: 'Masala chai', detail: 'Oat milk', quantity: 3, price: 7.5 }
]
// the line that is being updated in the "updating" scenes
const UPDATING_CODE = 'lassi'
const FEES = [
  { id: 'tax', label: 'Taxes and fees', amount: 1.92 },
  { id: 'delivery', label: 'Delivery fee', amount: 2.99 }
]
const subtotal = LINES.reduce((sum, line) => sum + line.price, 0)
const total = FEES.reduce((sum, fee) => sum + fee.amount, subtotal)
const money = (amount) => `$${amount.toFixed(2)}`

// the loading ring's sizes the mockup shows: sm, never the lg of a whole screen
const ringDiameter = (theme, size) => getThemeCss(theme, 'spinner').sizes[size].diameter

/* ---- furniture of the mock, painted from the theme as the cart is ---- */

const Scenes = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8)), 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
  align-items: start;
`

const Scene = styled.figure`
  margin: 0;
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
`

const Panel = styled.section`
  box-sizing: border-box;
  width: 100%;
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding: ${({ theme }) => themeSpace(theme, 'lg')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themePart(theme, 'cart', { background: 'base.background', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

const StoreName = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themePartText(theme, 'cart', 'base.business_name')}
`

// A box that can be softened: the opacity level is the theme's (`disabled`, for
// the one thing that is updating), and it moves at the theme's speed (not at
// all with reduced motion).
const Dimmable = styled.div`
  min-width: 0;
  opacity: ${({ theme, $dim }) => ($dim ? themeOpacity(theme, $dim) : 1)};
  ${({ theme }) => motionCss(theme, 'accordion', ['opacity'])}
`

const Lines = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const Line = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  align-items: start;
  padding: ${({ theme }) => themeSpace(theme, 'sm')} 0;
  ${({ theme }) => dividerLineCss(theme, 'item')}
`

const SummaryLine = styled(Line)`
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
`

const Thumb = styled.div`
  box-sizing: border-box;
  width: ${({ theme }) => getThemeCss(theme, 'cart').base.line_image_size};
  height: ${({ theme }) => getThemeCss(theme, 'cart').base.line_image_size};
  border-radius: ${({ theme }) => getThemeCss(theme, 'cart').base.radius};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
`

const LineName = styled.p`
  margin: 0;
  ${({ theme }) => themeText(theme, 'label', { props: ['size', 'weight'], weight: 600 })}
`

const LineDetail = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption', { props: ['size'] })}
`

const LineActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  margin-top: ${({ theme }) => themeSpace(theme, 'xs')};
`

const Amount = styled.span`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  ${({ theme }) => themeText(theme, 'label', { props: ['size', 'weight'] })}
`

// where a ring lives next to an amount: the same box with or without the ring
const RingSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: ${({ theme, $size }) => ringDiameter(theme, $size)};
  height: ${({ theme, $size }) => ringDiameter(theme, $size)};
`

const AmountRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

const Bill = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => themeSpace(theme, 'sm')} ${({ theme }) => themeSpace(theme, 'md')};
  ${({ theme }) => themeTextKeepWeight(theme, 'cart', 'bill_text')}
  dd { margin: 0; text-align: end; font-variant-numeric: tabular-nums; }
  dt { margin: 0; }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

// the label and the amount stay together, against the Checkout button when there is one
const TotalGroup = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  min-width: 0;
`

const TotalLabel = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeTextKeepWeight(theme, 'cart', 'checkout_text')}
`

const CheckoutSlot = styled.div`
  display: flex;
  min-width: 0;
  width: 50%;
`

// Text only a screen reader reads: the region says it is updating; the ring is decorative.
const SrStatus = styled.p`
  margin: 0;
  ${srOnlyCss}
`

/* ---- the cart and the checkout summary, at rest and updating ---- */

// the line that changes is softened and carries a sm ring at its price; the total carries a sm ring too
const LINE_DIM = 'disabled'

const Ring = ({ place }) => (
  <Spinner $size='sm' data-testid='cart-ring' data-place={place} data-size='sm' />
)

const CartLine = ({ line, busy }) => {
  const mine = busy && line.code === UPDATING_CODE
  const dim = mine ? LINE_DIM : null
  return (
    <Line aria-busy={mine ? 'true' : undefined} data-line={line.code} data-updating={mine ? '' : undefined}>
      <Dimmable $dim={dim}><Thumb aria-hidden='true' /></Dimmable>
      <Dimmable $dim={dim}>
        <LineName>{line.name}</LineName>
        <LineDetail>{line.detail}</LineDetail>
        <LineActions>
          <Button appearance='link' size='sm' type='button' disabled={busy}>Edit</Button>
          <Stepper
            size='sm'
            removable
            value={line.quantity}
            onDecrement={() => {}}
            onIncrement={() => {}}
            decrementDisabled={busy}
            incrementDisabled={busy}
          />
        </LineActions>
      </Dimmable>
      <AmountRow>
        <RingSlot $size='sm'>{mine && <Ring place='line' />}</RingSlot>
        <Dimmable $dim={dim}><Amount>{money(line.price)}</Amount></Dimmable>
      </AmountRow>
    </Line>
  )
}

const SummaryRow = ({ line, busy }) => {
  const mine = busy && line.code === UPDATING_CODE
  const dim = mine ? LINE_DIM : null
  return (
    <SummaryLine aria-busy={mine ? 'true' : undefined} data-line={line.code} data-updating={mine ? '' : undefined}>
      <Dimmable $dim={dim}><LineName>{line.quantity} x</LineName></Dimmable>
      <Dimmable $dim={dim}>
        <LineName>{line.name}</LineName>
        <LineDetail>{line.detail}</LineDetail>
      </Dimmable>
      <AmountRow>
        <RingSlot $size='sm'>{mine && <Ring place='line' />}</RingSlot>
        <Dimmable $dim={dim}><Amount>{money(line.price)}</Amount></Dimmable>
      </AmountRow>
      <LineActions style={{ marginTop: 0 }}>
        <Button color='neutral' appearance='ghost' size='sm' shape='icon' aria-label={`Edit ${line.name}`} disabled={busy}>
          <Icon name='pencil' />
        </Button>
        <Button color='neutral' appearance='ghost' size='sm' shape='icon' aria-label={`Remove ${line.name}`} disabled={busy}>
          <Icon name='trashFilled' />
        </Button>
      </LineActions>
    </SummaryLine>
  )
}

const Totals = ({ busy, withButton }) => (
  <>
    <Bill>
      <dt>Subtotal</dt>
      <dd>{money(subtotal)}</dd>
      {FEES.map((fee) => (
        <React.Fragment key={fee.id}>
          <dt>{fee.label}</dt>
          <dd>{money(fee.amount)}</dd>
        </React.Fragment>
      ))}
    </Bill>
    <Footer>
      <TotalGroup>
        <TotalLabel>Total</TotalLabel>
        <AmountRow data-testid='cart-total'>
          <RingSlot $size='sm'>{busy && <Ring place='total' />}</RingSlot>
          <TotalLabel as='span'>{money(total)}</TotalLabel>
        </AmountRow>
      </TotalGroup>
      {withButton && (
        <CheckoutSlot>
          <Button color='primary' size='lg' cta fullWidth busy={busy}>Checkout</Button>
        </CheckoutSlot>
      )}
    </Footer>
  </>
)

const CartScene = ({ busy, surface }) => {
  const isCart = surface === 'cart'
  const headingId = `cart-loading-${surface}-${busy ? 'busy' : 'rest'}`
  return (
    <Panel
      aria-labelledby={headingId}
      data-testid={`cart-scene-${surface}-${busy ? 'updating' : 'rest'}`}
      data-state={busy ? 'updating' : 'rest'}
    >
      <Head>
        <StoreName id={headingId}>{isCart ? 'Cha Sha' : 'Your order'}</StoreName>
      </Head>
      <SrStatus role='status'>{busy ? 'Updating your cart…' : ''}</SrStatus>
      <Lines data-testid='cart-content'>
        {LINES.map((line) => (isCart
          ? <CartLine key={line.code} line={line} busy={busy} />
          : <SummaryRow key={line.code} line={line} busy={busy} />))}
      </Lines>
      <Totals busy={busy} withButton={isCart} />
    </Panel>
  )
}

export const CartLoadingSection = () => {
  const theme = useTheme()
  return (
    <Section
      id='cart-loading-1639'
      aria-labelledby='cart-loading-title'
      data-testid='cart-loading'
      data-spinner-sm={ringDiameter(theme, 'sm')}
      data-spinner-lg={ringDiameter(theme, 'lg')}
    >
      <SectionTitle id='cart-loading-title'>implementation notes · Cart and checkout while a product changes</SectionTitle>
      <Note>
        Option A, in the line (chosen). The line that changes softens to the theme&apos;s disabled opacity and shows a
        sm ring beside its price; the total shows a sm ring too, and the Checkout button is busy (its label stays).
        The rest of the cart stays as it is and its buttons stay disabled while it updates. The ring is the theme&apos;s
        sm size, never the lg. Mockups, nothing is wired.
      </Note>
      <Scenes data-testid='cart-option-A'>
        {[
          { surface: 'cart', busy: false, caption: 'Cart, at rest' },
          { surface: 'cart', busy: true, caption: 'Cart, updating Mango lassi' },
          { surface: 'checkout', busy: false, caption: 'Checkout summary, at rest' },
          { surface: 'checkout', busy: true, caption: 'Checkout summary, updating Mango lassi' }
        ].map(({ surface, busy, caption }) => (
          <Scene key={`${surface}-${busy}`}>
            <CartScene busy={busy} surface={surface} />
            <Caption>{caption}</Caption>
          </Scene>
        ))}
      </Scenes>
    </Section>
  )
}
