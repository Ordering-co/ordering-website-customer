import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Chat, MessagesLayoutWrapper, MessagesRightLayout } from '../styles'
import { OrderMessagesPane } from '../../OrderDetails/styles'
import { getThemeCss } from '~/utils/themeCss'

const flat = (css) => css.replace(/\s+/g, '')

const withNav = (mutate) => themeWithValues((values) => {
  mutate(values)
  return values
})

// An order's messages (alone on the order's page) fit the visible screen at
// every width: under the header and, below 576px, above the bottom
// navigation (its real height, 0 when the theme hides it); the chat takes
// what the conversation's header and the composer leave, so the composer
// stays in sight.
describe('order chat fits the screen', () => {
  it('the pane: the viewport less the header, and below 576px less the navigation', () => {
    const theme = themeWithValues()
    // (until the header mounts and publishes its height, the fallback is the theme's header height, not a literal)
    const header = getThemeCss(theme, 'header').base.height
    const { getByText } = renderWith(theme, <OrderMessagesPane>pane</OrderMessagesPane>)
    const css = flat(cssFor(getByText('pane')))
    expect(css).toContain(`height:calc(100dvh-var(--header-height,${header}));`)
    expect(css).toMatch(new RegExp(`@media\\(max-width:575px\\)\\{[^}]*height:calc\\(100dvh-var\\(--header-height,${header}\\)-65px\\)`))
  })

  it('the navigation\'s height is the theme\'s, 0 when the theme hides it', () => {
    const tall = renderWith(withNav((v) => { v.components.bottom_nav.base.height = 72 }), <OrderMessagesPane>tall</OrderMessagesPane>)
    expect(flat(cssFor(tall.getByText('tall')))).toContain('-72px)')
    const hidden = renderWith(withNav((v) => { v.visibility.bottom_nav = false }), <OrderMessagesPane>hidden</OrderMessagesPane>)
    expect(flat(cssFor(hidden.getByText('hidden')))).toContain('-0px)')
  })

  it('the conversation is a column of the pane\'s height, the chat what is left', () => {
    const theme = themeWithValues()
    const wrapper = renderWith(theme, <MessagesLayoutWrapper $fill>wrap</MessagesLayoutWrapper>)
    expect(flat(cssFor(wrapper.getByText('wrap')))).toMatch(/height:100%;min-height:0;/)
    const right = renderWith(theme, <MessagesRightLayout $fill>right</MessagesRightLayout>)
    expect(flat(cssFor(right.getByText('right')))).toMatch(/[^-]flex-direction:column;height:100%;min-height:0;/)
    const chat = renderWith(theme, <Chat $fill>chat</Chat>)
    // over the column's flex-shrink: 0 for its children
    expect(flat(cssFor(chat.getByText('chat')))).toMatch(/\.([\w-]+)\.\1\.\1\{[^}]*[^-]flex:11auto;height:auto;min-height:0;/)
  })
})

// The space over the first message is outside the scroll (a
// margin of the chat), so a scrolled message is clipped md under the
// conversation's header line, never against it
describe('the chat\'s space under the header', () => {
  it('md over the scroll area, none inside it', () => {
    const theme = themeWithValues()
    const css = flat(cssFor(renderWith(theme, <Chat>themechat</Chat>).getByText('themechat')))
    expect(css).toContain(`margin-top:${theme.values.tokens.space.md}px;`)
    expect(css).toMatch(/>:first-child\{margin-top:0;\}/)
  })
})
