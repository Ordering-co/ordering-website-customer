import React from 'react'
import { describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cssFor, defaultTheme, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BubbleBusines, BubbleConsole, BubbleCustomer } from '../styles'

// The chat bubbles of a theme: the background of
// components.chat_bubble with a text that reads on it

describe('chat bubbles', () => {
  it('a light bubble of mine (the schema default) has the theme text, not on_primary', () => {
    const theme = themeWithValues()
    const { getByText } = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    expect(getByText('Hi')).toHaveStyle({ color: theme.values.tokens.color.text })
  })

  it('the text of each side is its mine_color / theirs_color', () => {
    const theme = themeWithValues((values) => {
      values.components.chat_bubble.base.mine_background = '#1A1A1A'
      values.components.chat_bubble.base.mine_color = '#FAFAFA'
      values.components.chat_bubble.base.theirs_color = '#333333'
      return values
    })
    const mine = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    expect(mine.getByText('Hi')).toHaveStyle({ color: '#FAFAFA' })
    mine.unmount()
    const { getByText } = renderWith(theme, <BubbleBusines>Hello</BubbleBusines>)
    expect(getByText('Hello')).toHaveStyle({ color: '#333333' })
  })

  it('a theme with an empty mine_color: the default mine_color (null is not a color of it)', () => {
    const theme = themeWithValues((values) => {
      values.components.chat_bubble.base.mine_background = '#1A1A1A'
      values.components.chat_bubble.base.mine_color = null
      return values
    })
    expect(theme.values.components.chat_bubble.base.mine_color).toBe(defaultTheme.values.components.chat_bubble.base.mine_color)
    const { getByText } = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    expect(getByText('Hi')).toHaveStyle({ color: defaultTheme.values.components.chat_bubble.base.mine_color })
  })

  it('the bubbles are sm / md inside', () => {
    const theme = themeWithValues()
    const { sm, md } = theme.values.tokens.space
    const { getByText } = renderWith(theme, <BubbleBusines>Hello</BubbleBusines>)
    expect(getByText('Hello')).toHaveStyle({ padding: `${sm}px ${md}px` })
  })

  const bubbleTheme = (base = {}) => themeWithValues((values) => {
    Object.assign(values.components.chat_bubble.base, base)
    return values
  })

  it('the schema defaults: today\'s bubble (text color, the identity\'s shadow size, no border, sm / md padding, a tail)', () => {
    const { base } = themeWithValues().values.components.chat_bubble
    const { tokens } = themeWithValues().values
    expect(base.mine_color).toBe(tokens.color.text)
    expect(base.theirs_color).toBe(tokens.color.text)
    expect(base.shadow).toEqual(tokens.shadow[tokens.shadow_style.size])
    expect(base.border).toBeNull()
    expect(base.padding_x).toBe(tokens.space.md)
    expect(base.padding_y).toBe(tokens.space.sm)
    expect(base.tail).toBe(true)
  })

  it('padding, border and shadow of components.chat_bubble', () => {
    const theme = bubbleTheme({
      padding_x: 16,
      padding_y: 4,
      border: { width: 1, style: 'solid', color: '#DDDDDD' },
      shadow: null
    })
    const { getByText } = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    const css = cssFor(getByText('Hi'))
    expect(css).toContain('padding:4px 16px')
    expect(css).toContain('border:1px solid #DDDDDD')
    expect(css).toContain('box-shadow:none')
  })

  it('tail: the corner under the sender squared (mine at the end, theirs at the start), at every width', () => {
    const theme = bubbleTheme({ radius: 12, tail: true })
    const xs = `${theme.values.tokens.radius.xs}px`
    const mine = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    expect(cssFor(mine.getByText('Hi'))).toContain(`border-radius:12px 12px ${xs} 12px`)
    mine.unmount()
    const theirs = renderWith(theme, <BubbleBusines>Hello</BubbleBusines>)
    expect(cssFor(theirs.getByText('Hello'))).toContain(`border-radius:12px 12px 12px ${xs}`)
  })

  it('tail in RTL: mirrored', () => {
    const theme = { ...bubbleTheme({ radius: 12, tail: true }), rtl: true }
    const xs = `${theme.values.tokens.radius.xs}px`
    const { getByText } = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    expect(cssFor(getByText('Hi'))).toContain(`border-radius:12px 12px 12px ${xs}`)
  })

  it('without a tail: every corner the radius; a notice of the console never has one', () => {
    const theme = bubbleTheme({ radius: 12, tail: false })
    const { getByText } = renderWith(theme, <BubbleCustomer>Hi</BubbleCustomer>)
    expect(cssFor(getByText('Hi'))).toContain('border-radius:12px;')
    cleanup()
    const notice = renderWith(bubbleTheme({ radius: 12, tail: true }), <BubbleConsole>Order placed</BubbleConsole>)
    expect(cssFor(notice.getByText('Order placed'))).not.toMatch(/border-radius:12px 12px/)
  })
})
