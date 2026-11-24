import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { MobilePlaceOrderHint, WarningMessage as CheckoutWarningMessage, WarningText as CheckoutWarningText } from '../../../components/Checkout/styles'
import { WarningMessage as MultiWarningMessage, WarningText as MultiWarningText } from '../../../components/MultiCheckout/styles'
import { Notice as StudentNotice } from '../../../components/StudentSelector/styles'
import { Item as CartStudentItem } from '../../../components/CartStudentAlert/styles'
import { ReservationAlert } from '../../../components/Cart/styles'
import { CartGroupMessage } from '../../../components/CartContent/styles'
import { ErrorMessage as StoreError } from '../../../components/BusinessProductsList/styles'
import { ErrorMessage as GroceriesError } from '../../../components/BusinessProductsList/layouts/groceries/styles'
import { ErrorText as VerificationError, WarningText as VerificationWarning } from '../../../components/UserVerification/styles'

// The setup mocks these styles for the screen's tests: the real ones here
vi.unmock('~ui/src/components/UserVerification/styles')

// Where the screens use components.alert: each box takes the variant's fill
// and the role of a live message.
const FILLS = { info: '#EEF4FF', success: '#EAF7EA', warning: '#FFF3DD', danger: '#FDEBEB' }
const theme = () => themeWithValues((values) => {
  Object.entries(FILLS).forEach(([variant, background]) => { values.components.alert.variants[variant].background = background })
  return values
})
const tight = (css) => css.replace(/\s+/g, '')
const doubled = (el) => {
  const css = tight(cssFor(el))
  const match = css.match(/\.([\w-]+)\.\1\{([^}]*)/)
  return match ? match[2] : ''
}

const SPOTS = [
  ['checkout: the order being processed', CheckoutWarningMessage, { $variant: 'info' }, 'info', 'status'],
  ['checkout: the payment failed', CheckoutWarningMessage, { $variant: 'danger' }, 'danger', 'alert'],
  ['checkout: why the order cannot be placed', CheckoutWarningText, {}, 'warning', 'status'],
  ['checkout: the payment hint on small screens', MobilePlaceOrderHint, {}, 'warning', 'status'],
  ['multi checkout: the payment failed', MultiWarningMessage, { $variant: 'danger' }, 'danger', 'alert'],
  ['multi checkout: a cart that cannot be placed', MultiWarningText, {}, 'warning', 'status'],
  ['the student selector: the filtered menu', StudentNotice, {}, 'info', 'status'],
  ['the cart: the missing reservation', ReservationAlert, {}, 'danger', 'alert'],
  ['the store: products that could not load', StoreError, {}, 'danger', 'alert'],
  ['the groceries store: products that could not load', GroceriesError, {}, 'danger', 'alert'],
  ['the verification: the phone to update', VerificationWarning, {}, 'warning', 'status'],
  ['the verification: the email that could not be saved', VerificationError, {}, 'danger', 'alert']
]

describe('components.alert in the screens', () => {
  it.each(SPOTS)('%s', (_, Component, props, variant, role) => {
    const el = renderWith(theme(), <Component data-testid='spot' {...props}>message</Component>).getByTestId('spot')
    expect(el).toHaveAttribute('role', role)
    expect(doubled(el)).toContain(`background:${FILLS[variant]};`)
    expect(doubled(el)).toContain('opacity:1;')
  })

  it('not live messages take the look and no role: the cart student items and the group note', () => {
    const item = renderWith(theme(), <CartStudentItem data-testid='i'>item</CartStudentItem>).getByTestId('i')
    expect(item).not.toHaveAttribute('role')
    expect(doubled(item)).toContain(`background:${FILLS.warning};`)
    const note = renderWith(theme(), <CartGroupMessage data-testid='n'><p>note</p></CartGroupMessage>).getByTestId('n')
    expect(note).not.toHaveAttribute('role')
    expect(doubled(note)).toContain(`background:${FILLS.info};`)
  })

  it('the checkout warning\'s icon sits in the row, not placed over the text', () => {
    const el = renderWith(theme(), <CheckoutWarningMessage data-testid='w' $variant='info'><svg /><p>m</p></CheckoutWarningMessage>).getByTestId('w')
    expect(tight(cssFor(el))).toMatch(/\.([\w-]+)\.\1>svg\{position:static;/)
  })
})
