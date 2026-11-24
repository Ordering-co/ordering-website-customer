import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BubbleBusines, BubbleCustomer, Chat, ChatImage, HeaderProfile, ImageContainer, MessagesLeftLayout, MessagesTitle } from '../styles'

const flat = (el) => cssFor(el).replace(/\s+/g, '')

// Sizes of the chat in units that follow the screen (dvh, ch, the theme's control size), not px
describe('Messages: fluid sizes', () => {
  it('the transcript viewport is a share of the visible screen with a floor of ch', () => {
    const { getByTestId } = renderWith(themeWithValues(), <Chat data-testid='c' />)
    const css = flat(getByTestId('c'))
    expect(css).toContain('height:50dvh;')
    expect(css).toContain('min-height:50ch;')
    expect(css).toContain('min-height:20ch;')
  })

  it('the inbox transcript fills its pane at every width', () => {
    const { getByTestId } = renderWith(themeWithValues(), <Chat data-testid='c' profileMessages />)
    expect(flat(getByTestId('c'))).toContain('flex:11auto;height:auto;min-height:0;')
  })

  it('a bubble keeps room for the sender and the time in ch', () => {
    ;[BubbleBusines, BubbleCustomer].forEach((Bubble) => {
      const { getByTestId, unmount } = renderWith(themeWithValues(), <Bubble data-testid='b' />)
      expect(flat(getByTestId('b'))).toContain('min-width:10ch;')
      unmount()
    })
  })

  it('the participants column keeps a reading minimum that never exceeds its container', () => {
    const { getByTestId } = renderWith(themeWithValues(), <MessagesLeftLayout data-testid='l' />)
    expect(flat(getByTestId('l'))).toContain('min-width:min(100%,31ch);')
  })

  it('the participant row and the pane title are 1.25 of the theme\'s xl control size', () => {
    const theme = themeWithValues()
    const xl = theme.values.tokens.size.xl
    ;[HeaderProfile, MessagesTitle].forEach((Row) => {
      const { getByTestId, unmount } = renderWith(theme, <Row data-testid='r' />)
      expect(flat(getByTestId('r'))).toContain(`height:calc(1.25*${xl}px);`)
      unmount()
    })
  })

  it('an image sent in the chat and its enlarged view are capped in dvh, 16:9 before they load', () => {
    const { getByTestId } = renderWith(themeWithValues(), <><ChatImage data-testid='thumb'><img alt='' /></ChatImage><ImageContainer data-testid='big'><img alt='' /></ImageContainer></>)
    const thumb = flat(getByTestId('thumb'))
    expect(thumb).toContain('max-height:40dvh;')
    expect(thumb).toContain('aspect-ratio:auto16/9;')
    const big = flat(getByTestId('big'))
    expect(big).toContain('max-height:60dvh;')
    expect(big).toContain('aspect-ratio:auto16/9;')
  })
})
