import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { themeColor } from '~/utils/themeColors'
import { UpsellingPage } from '../index'

// implementation notesthe upselling's buttons are the base Button, with the look the legacy one resolved.

const product = vi.hoisted(() => ({ id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg' }))
const handleUpsellingPage = vi.hoisted(() => vi.fn())

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => <div data-testid='product-form' /> }))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ open, children }) => (open ? <div data-testid='product-modal'>{children}</div> : null)
}))
vi.mock('~ui/src/components/AutoScroll', () => ({ AutoScroll: ({ children }) => <div>{children}</div> }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div>{children}</div> : null)
}))
vi.mock('~components/components/UpsellingPage', () => ({
  UpsellingPage: ({ UIComponent, ...rest }) => (
    <UIComponent
      upsellingProducts={{ products: [product], loading: false, error: null }}
      handleUpsellingPage={handleUpsellingPage}
      openUpselling
      canOpenUpselling
      business={{ id: 1, slug: 'demo-store' }}
      {...rest}
    />
  )
}))

const themes = [
  ['the default theme', themeWithValues()],
  ['another primary', themeWithValues((values) => { values.tokens.color.primary = '#ABCDEF'; return values })]
]
const LOOK = ['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color', '--ui-button-icon-size']
const expectLook = (theme, button, options) => {
  expect(button).toHaveAttribute('data-slot', 'button')
  expect(button).toHaveAttribute('type', 'button')
  expect(button).not.toHaveAttribute('color')
  const vars = componentVars(theme, 'button', options)
  LOOK.forEach((name) => expect(button.style.getPropertyValue(name)).toBe(vars[name] ?? ''))
}

describe.each(themes)('UpsellingPage\'s buttons are the base Button (%s)', (_, theme) => {
  it('the modal: Add is primary solid md (opens the product), No, Thanks secondary outline md', () => {
    handleUpsellingPage.mockClear()
    const { getByRole, getByTestId } = renderWithProviders(<UpsellingPage />, { theme })
    const add = getByRole('button', { name: 'Add' })
    expectLook(theme, add, { size: 'md', color: 'primary', appearance: 'solid' })
    const no = getByRole('button', { name: 'No, Thanks' })
    expectLook(theme, no, { size: 'md', color: 'secondary', appearance: 'outline' })
    fireEvent.click(no)
    expect(handleUpsellingPage).toHaveBeenCalledWith(false)
    fireEvent.click(add)
    expect(getByTestId('product-modal')).toBeInTheDocument()
  })

  it('the list (custom mode): Add is primary tonal md, a direct child of its details; Close neutral ghost sm icon', () => {
    const { getByRole, queryByRole, getByTestId } = renderWithProviders(<UpsellingPage isCustomMode />, { theme })
    const add = getByRole('button', { name: 'Add' })
    expectLook(theme, add, { size: 'md', color: 'primary', appearance: 'tonal' })
    // HorizontalDetails `> button` places it (absolute, at the bottom)
    expect(add.parentElement.querySelector(':scope > .price-container')).not.toBeNull()
    // HorizontalDetails' `span` (its price) does not reach the button's label
    expect(add.querySelector('span')).not.toHaveStyle({ color: themeColor(theme, 'text') })
    // ...and still reaches the price (so the negative above is not empty)
    expect(add.parentElement.querySelector('.price-container > span')).toHaveStyle({ color: themeColor(theme, 'text') })
    const close = getByRole('button', { name: 'Close' })
    expectLook(theme, close, { size: 'sm', shape: 'icon', color: 'neutral', appearance: 'ghost' })
    expect(close.querySelector('svg')).not.toBeNull()
    fireEvent.click(add)
    expect(getByTestId('product-modal')).toBeInTheDocument()
    fireEvent.click(close)
    expect(queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('the cart\'s "Complement your order": Add is primary ghost sm icon', () => {
    const { getByRole, getByTestId } = renderWithProviders(<UpsellingPage isCustomMode fromCartPopover />, { theme })
    const add = getByRole('button', { name: 'Add' })
    expectLook(theme, add, { size: 'sm', shape: 'icon', color: 'primary', appearance: 'ghost' })
    expect(add.querySelector('svg')).not.toBeNull()
    // the price's `span` rule does not paint the icon's span
    expect(add.querySelector('span')).not.toHaveStyle({ color: themeColor(theme, 'text') })
    // the rule still is the price's (emitted as written, not dropped)
    expect(injectedCss()).toMatch(/span:not\(button span\)\{[^}]*color:/)
    fireEvent.click(add)
    expect(getByTestId('product-modal')).toBeInTheDocument()
  })
})
