import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { getThemeComponent } from '~/utils/themeCss'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '../../../design-system/lib/componentVars'
import { UserFormDetailsUI } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => null,
    handleSubmit: (fn) => fn,
    errors: {},
    formState: { errors: {} }
  })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

// /profile?view=notifications: the three marketing switches (sms on)
const USER = { ...userFixture, settings: { email: { newsletter: false }, sms: { newsletter: true }, notification: { newsletter: false } } }

const renderNotifications = (theme, { loading = false } = {}) => {
  const handleChangeNotifications = vi.fn((list, callback) => callback(list))
  const handleButtonUpdateClick = vi.fn()
  const view = renderWith(theme, (
    <UserFormDetailsUI
      view='notifications'
      isEdit
      formState={{ ...formStateFixture, changes: {}, loading }}
      validationFields={validationFieldsFixture}
      userData={USER}
      handleChangeInput={vi.fn()}
      handleButtonUpdateClick={handleButtonUpdateClick}
      handleChangeNotifications={handleChangeNotifications}
      showField={() => true}
      isRequiredField={() => false}
      toggleIsEdit={vi.fn()}
      cleanFormState={vi.fn()}
    />
  ))
  return { ...view, handleChangeNotifications, handleButtonUpdateClick }
}

// A theme with values these tests can tell apart
const notificationsTheme = () => themeWithValues((values) => {
  const choice = values.components.choice
  choice.base.background = '#FAFAF0'
  choice.base.border = null
  choice.base.radius = 9
  choice.base.hover = '#F1F2F3'
  choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111112' }
  choice.variants.default.states.disabled = { opacity: 0.45 }
  values.components.card.base.background = '#ABCDEF'
  values.components.switch.base.on = '#00AA55'
  return values
})

describe('notifications settings', () => {
  it('the settings are a choice list named as a group, the choice gap apart, no card of their own', () => {
    const theme = notificationsTheme()
    const { getByRole, getAllByRole } = renderNotifications(theme)
    const group = getByRole('group', { name: 'Marketing Notifications' })
    expect(group).toHaveStyle({ display: 'flex', flexDirection: 'column', gap: `${getThemeComponent(theme, 'choice').base.gap}px` })
    const css = cssFor(group)
    expect(css).toContain('text-align:start;')
    expect(css).not.toContain('#ABCDEF')
    expect(css).not.toMatch(/background|box-shadow|overflow|border/)
    const switches = getAllByRole('switch')
    expect(switches).toHaveLength(3)
    switches.forEach((row) => expect(group).toContainElement(row))
  })

  it('each setting is the base Choice switch row: the whole row the switch, on while the setting is', () => {
    const theme = notificationsTheme()
    const { getByRole } = renderNotifications(theme)
    const rows = ['Emails', 'Sms', 'Push Notifications'].map((name) => {
      const row = getByRole('switch', { name })
      expect(row).toHaveAttribute('data-slot', 'choice')
      expect(row.querySelector('[data-slot=switch-mark]')).toBeTruthy()
      expect(row.querySelector('[data-slot=choice-title]')).toHaveTextContent(name)
      return row
    })
    expect(rows.map((row) => row.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    // components.choice paints the row and components.switch the track
    const vars = componentVars(theme, 'choice', { size: 'md', variant: 'default', radius: 'md' })
    expect(rows[0].style.getPropertyValue('--ui-choice-height')).toBe(vars['--ui-choice-height'])
    expect(rows[0].style.getPropertyValue('--ui-switch-on')).toBe('#00AA55')
    expect(rows[1]).toHaveAttribute('data-checked')
    expect(rows[0]).not.toHaveAttribute('data-checked')
  })

  it('toggling a row (anywhere on it) calls the same handlers with that setting and selects it', () => {
    const { getByRole, getByText, handleChangeNotifications, handleButtonUpdateClick } = renderNotifications(notificationsTheme())
    handleChangeNotifications.mockClear()
    handleButtonUpdateClick.mockClear()
    const row = getByRole('switch', { name: 'Emails' })
    fireEvent.click(getByText('Emails'))
    expect(row).toHaveAttribute('aria-checked', 'true')
    expect(handleChangeNotifications).toHaveBeenCalledTimes(1)
    expect(handleChangeNotifications).toHaveBeenLastCalledWith(
      { email: true, sms: true, notification: false },
      expect.any(Function)
    )
    expect(handleButtonUpdateClick).toHaveBeenLastCalledWith({ email: true, sms: true, notification: false })
    expect(row).toHaveAttribute('data-checked')
  })

  it('while saving the rows are disabled (also for the keyboard) and dim once, as the choice says', () => {
    const { getAllByRole } = renderNotifications(notificationsTheme(), { loading: true })
    getAllByRole('switch').forEach((row) => {
      expect(row).toHaveAttribute('data-disabled')
      expect(row.className).toContain('ui:data-disabled:opacity-(--ui-choice-disabled-opacity)')
      expect(row.querySelector('[data-slot=switch-mark]').className).not.toContain('opacity')
    })
  })
})
