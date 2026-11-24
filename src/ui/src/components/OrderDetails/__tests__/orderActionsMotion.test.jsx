import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ActionsSection } from '../ActionsSection'

// The order's actions (store, messages, phone) are IconButtons of the theme:
// the row around them stays still, but not the buttons, which keep the
// button's motion (components.button.base.animated / speed).
describe('OrderDetails: the action buttons keep the theme motion', () => {
  it('an animated button fades its states and the row does not stop it', () => {
    const theme = themeWithValues((values) => {
      values.tokens.motion_style.enabled = true
      values.components.button.base.animated = true
      values.components.button.base.speed = 150
    })
    const { getByRole } = renderWith(theme, (
      <ActionsSection
        actionType='business'
        order={{}}
        businessData={{ slug: 'store' }}
        handleBusinessRedirect={vi.fn()}
        showMessages
        setOpenMessages={vi.fn()}
        readMessages={vi.fn()}
        setUnreadAlert={vi.fn()}
      />
    ))
    const button = getByRole('button', { name: 'Messages' })
    const row = button.parentElement.parentElement
    const css = injectedCss().replace(/\s+/g, ' ')
    const escape = (cls) => cls.replace(/[-]/g, '\\-')

    // the button's own state motion, at the theme's speed
    expect(button.style.getPropertyValue('--ui-button-motion-duration')).toBe('150ms')
    expect(button).toHaveClass('ui:motion-safe:transition-[color,background-color,border-color,box-shadow]')

    // no rule of the row reaches its children with a transition
    const rowClasses = [...row.classList].map(escape).join('|')
    const childRules = css.split('}').filter((rule) => new RegExp(`\\.(${rowClasses})[^{]*> ?\\*`).test(rule))
    expect(childRules.join('}')).not.toMatch(/transition/)
  })
})
