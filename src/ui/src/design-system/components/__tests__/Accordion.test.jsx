import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { THEMES } from '../../preview/themes'
import { AccordionTrigger } from '../Accordion'

describe('Accordion step header', () => {
  it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('uses the $id header and divider', ({ theme }) => {
    const onClick = vi.fn()
    const trigger = (expanded, disabled) => (
      <ThemeProvider theme={theme}>
        <AccordionTrigger variant='step-header' expanded={expanded} disabled={disabled} onClick={onClick}>
          Choose a date
        </AccordionTrigger>
      </ThemeProvider>
    )
    const { rerender } = render(trigger(false, false))
    const button = screen.getByRole('button', { expanded: false })
    const header = getThemeCss(theme, 'accordion').base
    expect(button.style.getPropertyValue('--ui-accordion-header-padding')).toBe(header.header_padding)
    expect(button.style.getPropertyValue('--ui-accordion-header-background')).toBe(header.header_background)
    expect(button.style.getPropertyValue('--ui-accordion-header-hover')).toBe(header.header_hover)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(trigger(true, true))
    expect(screen.getByRole('button', { expanded: true })).toBeDisabled()
    expect(button.className).toContain('ui:aria-expanded:bg-primary-subtle')
    expect(button.className).toContain('ui:aria-expanded:[border-bottom:var(--ui-accordion-step-divider,none)]')
  })
})
