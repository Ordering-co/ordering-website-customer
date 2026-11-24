import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { DatePickerUI } from '../index'

// the sheet loads on its first opening (lazyOverlay): the real loader here
vi.unmock('@loadable/component')

// implementation notesCancel and Apply of the phone's sheet are the base Button (Cancel
// neutral outline, Apply primary solid, md); the field is the base DateField.

vi.mock('react-date-range/dist/styles.css', () => ({}))
vi.mock('react-date-range/dist/theme/default.css', () => ({}))
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: window.innerWidth, height: window.innerHeight })
}))

const originalWidth = window.innerWidth
afterEach(() => { window.innerWidth = originalWidth })

describe('DatePicker: the sheet\'s actions are the base Button', () => {
  it('Cancel closes, Apply is disabled without a day and applies one', async () => {
    window.innerWidth = 375
    const theme = themeWithValues()
    const onChange = vi.fn()
    renderWithProviders(<DatePickerUI id='birthdate' value={null} onChange={onChange} label='Birthdate' placeholder='Birthdate' />, { theme })
    const field = screen.getAllByRole('button').find((b) => b.getAttribute('aria-haspopup') === 'dialog')
    fireEvent.click(field)
    const sheet = await screen.findByRole('dialog', { name: 'Birthdate' })
    const cancel = within(sheet).getByRole('button', { name: 'Cancel' })
    const apply = within(sheet).getByRole('button', { name: 'Apply' })
    expect(cancel).toHaveAttribute('data-slot', 'button')
    expect(apply).toHaveAttribute('data-slot', 'button')
    expect(cancel.style.getPropertyValue('--ui-button-border')).toBe(componentVars(theme, 'button', { size: 'md', color: 'neutral', appearance: 'outline' })['--ui-button-border'])
    expect(apply.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
    // the actions share the row in halves (placement); their min-width is the Button's own (0), none written by the row
    const row = cancel.parentElement
    expect(cssFor(row).replace(/\s+/g, '')).toMatch(/>button\{[^}]*(^|;)flex:1;/)
    expect(cssFor(row)).not.toMatch(/min-width/)
    expect(cancel).toHaveClass('ui:min-w-[0]')
    // no day chosen yet
    expect(apply).toBeDisabled()
    const day = [...sheet.querySelectorAll('.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)')][0]
    fireEvent.mouseDown(day)
    expect(apply).not.toBeDisabled()
    fireEvent.click(apply)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(field).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(field)
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Birthdate' })).getByRole('button', { name: 'Cancel' }))
    expect(field).toHaveAttribute('aria-expanded', 'false')
  })

  it('the field is the base DateField (components.input) and its popover the base Popover of components.menu', async () => {
    window.innerWidth = 1280
    const theme = themeWithValues()
    renderWithProviders(<DatePickerUI id='birthdate' value={new Date(2000, 4, 15)} onChange={vi.fn()} label='Birthdate' placeholder='Birthdate' />, { theme })
    const field = screen.getByRole('button', { name: 'Birthdate, 2000-05-15' })
    expect(field).toHaveAttribute('data-slot', 'date-field')
    expect(field.style.getPropertyValue('--ui-input-height')).toBe(componentVars(theme, 'input', { variant: 'default', radius: 'md' })['--ui-input-height'])
    fireEvent.click(field)
    const popup = await screen.findByRole('dialog', { name: 'Birthdate' })
    expect(popup.closest('[data-base-ui-portal]').style.getPropertyValue('--ui-menu-background')).toBe(componentVars(theme, 'menu', { radius: 'md' })['--ui-menu-background'])
    expect(popup.querySelector('.rdrCalendarWrapper')).not.toBeNull()
  })
})
