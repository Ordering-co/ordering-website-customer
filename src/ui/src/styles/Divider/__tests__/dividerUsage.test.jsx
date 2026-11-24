import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { Divider as ReviewOrderDivider } from '../../../components/ReviewOrder/styles'
import { Divider as BusinessInformationDivider } from '../../../components/BusinessInformation/styles'
import { Divider as OrderDetailsDivider } from '../../../components/OrderDetails/styles'
import { DriverTipDivider, WrapperRightContainer } from '../../../components/MultiCheckout/styles'
import { SubPageList } from '../../../components/Help/styles'
import { ItemContainer } from '../../../components/WalletTransactionItem/styles'
import { TimeItem } from '../../../components/MomentControl/styles'
import { SingleOfferContainer } from '../../../components/Promotions/styles'
import { Divider as HeaderDivider } from '../../../components/Header/styles'

// Where the screens use components.divider, one spot of each kind. jsdom
// cascades by order, not specificity: the theme's rules come after the local
// ones, as they win in a browser.
const theme = (mutate = () => {}) => themeWithValues((values) => {
  mutate(values.components.divider.variants)
  return values
})
const flat = (el) => cssFor(el).replace(/\s+/g, ' ')
const LINE = '1px solid #E9ECEF'

const renderOne = (t, Component, props = {}) => renderWith(t, <Component data-testid='spot' {...props} />).getByTestId('spot')

describe('components.divider in the screens: section', () => {
  it('ReviewOrder: a 1px line, the section spacing above and below', () => {
    const el = renderOne(theme(), ReviewOrderDivider)
    expect(el).toHaveStyle({ height: '0px', borderTop: LINE, marginTop: '24px', marginBottom: '24px' })
  })

  it('BusinessInformation: the 2px bar is a 1px line', () => {
    const el = renderOne(theme(), BusinessInformationDivider)
    expect(el).toHaveStyle({ height: '0px', borderTop: LINE })
    expect(flat(el)).toContain('background:none')
  })

  it('no line: the divider is not shown', () => {
    const el = renderOne(theme((v) => { v.section.line = null }), ReviewOrderDivider)
    expect(el).toHaveStyle({ display: 'none' })
  })
})

describe('components.divider in the screens: band', () => {
  it('OrderDetails: the band\'s height and color; the margin prop is dropped', () => {
    const el = renderOne(theme(), OrderDetailsDivider, { margin: '10px 0px 10px' })
    expect(el).toHaveStyle({ height: '8px', background: '#F8F9FA', marginTop: '0px', marginBottom: '0px' })
  })

  it('MultiCheckout driver tip: the band keeps its bleed', () => {
    const { getByTestId } = renderWith(theme(), (
      <WrapperRightContainer data-testid='column'>
        <DriverTipDivider data-testid='divider' />
      </WrapperRightContainer>
    ))
    const column = getByTestId('column')
    const band = getByTestId('divider')
    expect(band).toHaveStyle({ height: '8px' })
    expect(flat(column)).toContain('padding:32px var(--checkout-tip-inset)')
    expect(flat(band)).toContain('width:calc(100% + 2 * var(--checkout-tip-inset))')
    expect(flat(band)).toContain('margin-inline-start:calc(-1 * var(--checkout-tip-inset))')
  })
})

describe('components.divider in the screens: item', () => {
  it('Help sub pages: the item line on the bottom edge', () => {
    expect(renderOne(theme(), SubPageList)).toHaveStyle({ borderBottom: LINE })
  })

  it('wallet transactions: the item line, the rows spaced by its spacing (0), the md space above and below', () => {
    const css = flat(renderOne(theme(), ItemContainer))
    expect(css).toContain('border-bottom:1px solid #E9ECEF;')
    expect(css).toMatch(/\+ \.[\w-]+\.[\w-]+\{margin-top:0px;\}/)
    expect(css).toContain(`padding:${theme().values.tokens.space.md}px 0;`)
  })

  it('TimeItem: one edge only (no 2px line between two rows)', () => {
    const el = renderOne(theme(), TimeItem)
    expect(el).toHaveStyle({ borderBottom: LINE })
    expect(flat(el)).toMatch(/border-bottom:1px solid #E9ECEF/)
    expect(el).not.toHaveStyle({ borderTop: LINE })
  })

  it('Promotions: the item line, dashed (was 2px)', () => {
    expect(renderOne(theme(), SingleOfferContainer)).toHaveStyle({ borderBottom: '1px dashed #E9ECEF' })
  })

  it('no line: none', () => {
    const el = renderOne(theme((v) => { v.item.line = null }), SubPageList)
    expect(flat(el)).toContain('border-bottom:none')
  })
})

describe('components.divider in the screens: vertical', () => {
  it('Header: one 1px line (not a 2px box), stretched, spacing beside it and indent at the ends', () => {
    const css = flat(renderOne(theme(), HeaderDivider))
    expect(css).toContain('border:none')
    expect(css).toContain('border-inline-start:1px solid #E9ECEF')
    expect(css).toContain('align-self:stretch')
    expect(css).toContain('margin:8px 16px')
  })

  // implementation notes round 4: the checkout's right column no longer adjoins the
  // left one (a pane edge, dividerLineCss) — proposal B puts a true grid
  // gap between the two fixed columns instead, so there is no shared edge
  // left to draw a line on. Removed along with its import
  // (WrapperRightContainer, Checkout/styles.js); the Header example above
  // keeps this describe block's "vertical" coverage.
})
