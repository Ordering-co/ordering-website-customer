import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { NotSendMessage, TimeofSent, TimeofSentByAdmin } from '../styles'

const flat = (el) => cssFor(el).replace(/\s+/g, '')

describe('Messages: what the theme sets is not overridden', () => {
  it('the time of a message is the theme\'s caption, space.xs under the message (no em of its own)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.typography.caption.size = 13
      values.tokens.space.xs = 6
      return values
    })
    ;[TimeofSent, TimeofSentByAdmin].forEach((Time) => {
      const { getByText, unmount } = renderWith(theme, <Time>10:00</Time>)
      const css = flat(getByText('10:00'))
      expect(css).toContain('font-size:13px')
      expect(css).toContain('margin-block-start:6px')
      expect(css).not.toMatch(/0\.8em|0\.2em/)
      unmount()
    })
  })

  it('the notice that replaces the composer is a quiet band (surface_alt), not the composer\'s background', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.surface_alt = '#F1F2F3'
      values.components.chat_bubble.base.composer_background = '#ABABAB'
      return values
    })
    const { getByText } = renderWith(theme, <NotSendMessage>ended</NotSendMessage>)
    expect(getByText('ended')).toHaveStyle({ backgroundColor: 'rgb(241, 242, 243)' })
  })
})
