import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Button } from '../../../design-system/components/Button'
import { MobileWrapperPlaceOrderButton, PlaceOrderErrorAlert, SlowNotice, WrapperPlaceOrderButton } from '../styles'

const flat = (css) => css.replace(/\s+/g, '')

// implementation notes round 4: Sergio reported the loading spinner misaligned next
// to the Place Order label. implementation notesthe button is now the base piece (inline-flex, centered,
// the spinner in the row before the label apart by the theme's icon gap), so the wrappers carry no
// rule on `button` and the piece's own layout does the centering at the column's full width.
describe('checkout CTA: the spinner and the label center on the same line', () => {
  const place = (Wrapper, inner) => renderWith(themeWithValues(), (
    <Wrapper>{inner(<Button fullWidth busy>Place Order</Button>)}</Wrapper>
  ))

  it('the desktop button (WrapperPlaceOrderButton) is the piece: inline-flex, centered, full width, the spinner first, and the wrapper has no button rule', () => {
    const { getByText } = place(WrapperPlaceOrderButton, (button) => <div>{button}</div>)
    const button = getByText('Place Order').closest('button')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button.className).toEqual(expect.stringContaining('ui:inline-flex'))
    expect(button.className).toEqual(expect.stringContaining('ui:justify-center'))
    expect(button.className).toEqual(expect.stringContaining('ui:w-full'))
    expect(button.firstChild).toHaveAttribute('data-slot', 'button-spinner')
    expect(flat(cssFor(button.parentElement.parentElement))).not.toMatch(/button\{/)
  })

  it('the mobile bar button (MobileWrapperPlaceOrderButton) centers the same way', () => {
    const { getByText } = place(MobileWrapperPlaceOrderButton, (button) => button)
    const button = getByText('Place Order').closest('button')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button.className).toEqual(expect.stringContaining('ui:justify-center'))
    expect(button.className).toEqual(expect.stringContaining('ui:w-full'))
    expect(button.firstChild).toHaveAttribute('data-slot', 'button-spinner')
    expect(flat(cssFor(button.parentElement))).not.toMatch(/button\{/)
  })
})

// implementation notes round 5: the slow notice's clock and the error alert's icon sit
// on the first line of their text: a box one text line tall (1lh), the icon
// centered in it, at the row's start (flex-start), however many lines follow
describe('checkout CTA notices: the icon on the first line of the text', () => {
  it('the slow notice (a status): its clock box is one body line tall, the icon.sm centered in it', () => {
    const { getByTestId, getByRole } = renderWith(themeWithValues(), (
      <SlowNotice><span className='notice-icon' data-testid='icon'><svg /></span><span>Still sending</span></SlowNotice>
    ))
    expect(getByRole('status')).toBeInTheDocument()
    const css = flat(cssFor(getByTestId('icon').parentElement))
    expect(css).toMatch(/\{[^}]*align-items:flex-start;/)
    expect(css).toMatch(/\.notice-icon\{[^}]*align-items:center;[^}]*font-size:14px;line-height:1\.71;height:1lh;/)
    expect(css).toMatch(/\.notice-iconsvg\{[^}]*width:16px;height:16px;/)
  })

  it('the error (a danger alert): its icon box is one line of the alert\'s text tall, in the alert\'s icon size and color', () => {
    const { getByTestId, getByRole } = renderWith(themeWithValues(), (
      <PlaceOrderErrorAlert><span className='notice-icon' data-testid='icon'><svg /></span><p>Not placed</p></PlaceOrderErrorAlert>
    ))
    expect(getByRole('alert')).toBeInTheDocument()
    const css = flat(cssFor(getByTestId('icon').parentElement))
    expect(css).toMatch(/\.notice-icon\{[^}]*height:1lh;color:#DA3453;/)
    expect(css).toMatch(/\.notice-iconsvg\{[^}]*width:20px;height:20px;/)
  })
})
