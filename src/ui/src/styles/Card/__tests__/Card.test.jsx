import React from 'react'
import styled from 'styled-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, within } from '@testing-library/react'
import {
  CARD_LINK_ATTR,
  CardLink,
  cardBoxCss,
  cardDecorationCss,
  cardFocusStateCss,
  cardInnerControlCss,
  cardPadding,
  clickableCardCss,
  stretchedCardCss,
  stretchedLinkCss
} from '../index'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { THEME_DEFAULTS } from '~/utils/appTheme'
import THEME_COMPILED from '~/theme.compiled.json'

afterEach(cleanup)

const flat = (css) => css.replace(/\s+/g, ' ').trim()

const theme = (mutate = () => {}) => themeWithValues((values) => {
  mutate(values.components.card, values)
  return values
})

describe('components.card in the schema (defaults: today\'s look)', () => {
  it('padding lg; hover and focus keep the resting shadow', () => {
    const t = themeWithValues()
    const card = t.values.components.card
    expect(card.base.padding).toBe(t.values.tokens.space.lg)
    expect(card.variants.default.states.hover.shadow).toEqual(card.base.shadow)
    expect(card.variants.default.states.focus.shadow).toEqual(card.base.shadow)
  })
})

describe('cardPadding / cardBoxCss', () => {
  it('the card\'s padding and look', () => {
    const t = theme((card) => { card.base.padding = 18; card.base.background = '#101010' })
    expect(cardPadding(t)).toBe('18px')
    const css = flat(cardBoxCss(t, 'card', { padding: true }))
    expect(css).toContain('background: #101010;')
    expect(css).toContain('padding: 18px;')
    expect(flat(cardBoxCss(t))).not.toContain('padding')
  })

  it('another card component: its own base', () => {
    const t = themeWithValues((values) => { values.components.order_card.base.background = '#202020'; return values })
    expect(cardBoxCss(t, 'order_card')).toContain('background: #202020;')
  })

  it('a padding out of range is clamped, one that is not a number is the default; a card without one, null', () => {
    const [min] = THEME_COMPILED.values.components.card.base.padding.$rule
    expect(cardPadding(theme((card) => { card.base.padding = -1 }))).toBe(`${min}px`)
    expect(cardPadding(theme((card) => { card.base.padding = 'x' }))).toBe(`${THEME_DEFAULTS.components.card.base.padding}px`)
    expect(cardPadding(theme(), 'order_card')).toBeNull()
  })
})

describe('cardFocusStateCss', () => {
  it('the focus state\'s shadow under the selector; none for a null shadow', () => {
    const t = theme((card) => { card.variants.default.states.focus.shadow = { x: 0, y: 4, blur: 10, spread: 0, color: '#000000', opacity: 0.25 } })
    expect(cardFocusStateCss(t)).toBe('&:focus-visible { box-shadow: 0px 4px 10px 0px rgba(0,0,0,0.25); }')
    expect(cardFocusStateCss(theme((card) => { card.variants.default.states.focus.shadow = null }), 'card', '&:x')).toBe('&:x { box-shadow: none; }')
  })

  it('a card without a focus state: nothing', () => {
    expect(cardFocusStateCss(themeWithValues(), 'business_card')).toBe('')
  })
})

describe('clickableCardCss (a card that is one button)', () => {
  const Row = styled.button`
    padding: 20px;
    &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px red; }
    ${({ theme }) => clickableCardCss(theme)}
  `

  it('the card\'s look and padding, its hover state (no lift), the focus ring and the focus state', () => {
    const t = theme((card, values) => {
      card.base.padding = 22
      card.base.shadow = { x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.1 }
      card.variants.default.states.hover.shadow = { x: 0, y: 6, blur: 12, spread: 0, color: '#000000', opacity: 0.2 }
      card.variants.default.states.focus.shadow = { x: 0, y: 8, blur: 16, spread: 0, color: '#000000', opacity: 0.3 }
      values.tokens.color.primary = '#ABCDEF'
    })
    const { getByRole } = renderWith(t, <Row type='button'>Topic</Row>)
    const row = getByRole('button', { name: 'Topic' })
    expect(row).toHaveStyle({ padding: '22px', boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)' })
    const css = cssFor(row)
    expect(css).toMatch(/:hover,\.[\w-]+\.[\w-]+:active\{[^}]*transform:none;/)
    expect(css).toMatch(/:hover\{box-shadow:0px 6px 12px 0px rgba\(0,0,0,0\.2\)/)
    expect(css).toMatch(/:focus-visible\{outline:[^;]+solid #ABCDEF/)
    expect(css).toMatch(/:focus-visible\{box-shadow:0px 8px 16px 0px rgba\(0,0,0,0\.3\)/)
    expect(css).toMatch(/cursor:pointer/)
  })
})

describe('the stretched link', () => {
  const Card = styled.article`
    padding: 10px;
    ${({ theme }) => stretchedCardCss(theme, 'order_card')}
  `
  const Inner = styled.button`${({ theme }) => cardInnerControlCss(theme)}`
  const Deco = styled.span`${({ theme }) => cardDecorationCss(theme)}`

  const renderCard = (t, { onOpen = vi.fn(), onFavorite = vi.fn() } = {}) => {
    const utils = renderWith(t, (
      <Card data-testid='card'>
        <Deco data-testid='ribbon'>New</Deco>
        <h3>
          <CardLink as='button' $card='order_card' onClick={onOpen}>Store 1</CardLink>
        </h3>
        <Inner type='button' aria-pressed='false' aria-label='Favorite' onClick={onFavorite}>♥</Inner>
      </Card>
    ))
    return { ...utils, onOpen, onFavorite }
  }

  it('one control opens the card: a button named by the title, in the heading; the inner button is apart', () => {
    const { getByTestId, getByRole, onOpen, onFavorite } = renderCard(themeWithValues())
    const card = getByTestId('card')
    const open = within(card).getByRole('button', { name: 'Store 1' })
    expect(open).toHaveAttribute('type', 'button')
    expect(open).toHaveAttribute(CARD_LINK_ATTR)
    expect(open.closest('h3')).not.toBeNull()
    // no control inside another
    expect(open.querySelector('button, a')).toBeNull()
    expect(card.querySelectorAll(`[${CARD_LINK_ATTR}]`)).toHaveLength(1)
    fireEvent.click(getByRole('button', { name: 'Favorite' }))
    expect(onFavorite).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(open)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('the card places the cover, the cover spans it with the card\'s radius, the ring is on the cover', () => {
    const t = themeWithValues((values) => {
      values.components.order_card.base.radius = 13
      values.tokens.color.primary = '#ABCDEF'
      return values
    })
    const { getByTestId, getByRole } = renderCard(t)
    expect(getByTestId('card')).toHaveStyle({ position: 'relative' })
    const link = getByRole('button', { name: 'Store 1' })
    const css = injectedCss()
    expect(cssFor(link)).toMatch(/::after\{content:'';position:absolute;inset:0;z-index:0;border-radius:13px;\}/)
    expect(css).toMatch(/:focus-visible\{outline:none !important;\}/)
    expect(css).toMatch(/:focus-visible::after\{outline:[^;]+solid #ABCDEF !important;/)
    expect(getByRole('button', { name: 'Favorite' })).toHaveStyle({ position: 'relative', zIndex: '1' })
    expect(getByTestId('ribbon')).toHaveStyle({ pointerEvents: 'none' })
  })

  it('the card\'s focus state while its link has the keyboard focus', () => {
    const t = theme((card) => { card.variants.default.states.focus.shadow = null })
    expect(flat(stretchedCardCss(t))).toContain(`&:has([${CARD_LINK_ATTR}]:focus-visible) { box-shadow: none; }`)
  })

  it('a control inside sits over the cover; a decoration lets the pointer through', () => {
    expect(cardInnerControlCss(themeWithValues())).toBe('position: relative; z-index: 1;')
    expect(cardDecorationCss(themeWithValues())).toBe('pointer-events: none;')
    expect(stretchedLinkCss(themeWithValues())).toContain('::after')
  })

  it('a button title in a heading takes the heading\'s clamp (lines and ellipsis), as a link does', () => {
    const { getByRole } = renderWith(themeWithValues(), (
      <>
        <h3><CardLink as='button'>Store 1</CardLink></h3>
        <div><CardLink as='button'>Store 2</CardLink></div>
      </>
    ))
    const cls = [...getByRole('button', { name: 'Store 1' }).classList].pop()
    const rules = injectedCss().replace(/\s*([{};:,>])\s*/g, '$1').split('}')
    const clamp = rules.find((rule) => rule.includes(`h3>.${cls}:is(button)`))
    // only a button (a link is inline: the heading's clamp cuts it) and only
    // in a heading: h1 to h6
    expect(clamp).toBeDefined()
    expect(clamp.split('{')[0].split(',').map((sel) => sel.replace(/\.[\w-]+/, '.x'))).toEqual(
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => `${tag}>.x:is(button)`)
    )
    expect(clamp.split('{')[1]).toBe('display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:inherit;overflow:hidden;max-width:100%;')
    // the stretched link itself is unchanged: inline, its cover on ::after
    expect(stretchedLinkCss(themeWithValues())).toMatch(/^\s*display: inline;/)
  })

  it('a link with href stays a link (no type)', () => {
    const { getByRole } = renderWith(themeWithValues(), <CardLink href='/store/1'>Store 1</CardLink>)
    const link = getByRole('link', { name: 'Store 1' })
    expect(link).toHaveAttribute('href', '/store/1')
    expect(link).not.toHaveAttribute('type')
  })
})
