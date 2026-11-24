import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { businessFixture } from '../../__tests__/helpers/cartTestMocks'
import { MomentControl } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const handleAsap = vi.hoisted(() => vi.fn())

vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: () => <div data-testid='preorder-steps' />
}))
vi.mock('~ui/src/components/MomentControl/layouts/CustomLayout', () => ({
  CustomLayout: () => <div data-testid='custom-layout' />
}))
vi.mock('~components/components/MomentOption', () => ({
  MomentOption: ({ UIComponent, ...rest }) => (
    <UIComponent
      isAsap
      datesList={['2026-07-14', '2026-07-15']}
      hoursList={[]}
      dateSelected='2026-07-14'
      timeSelected='10:00'
      handleAsap={handleAsap}
      handleChangeDate={vi.fn()}
      handleChangeTime={vi.fn()}
      onClose={vi.fn()}
      business={businessFixture}
      isUseWeekPicker={false}
      {...rest}
    />
  )
}))

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const choice = values.components.choice
  choice.base.background = '#FFFFFF'
  choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  mutate(choice)
  return values
})

const cssOf = (el) => {
  const rules = injectedCss().split('}')
  return Array.from(el.classList).map((cls) => rules.filter((rule) => rule.includes(`.${cls}`)).join('}')).join('}')
}

describe('MomentControl (components.choice)', () => {
  it('ASAP / Schedule for later are a single choice list 10px apart, the indicator replaces the radio icons', () => {
    const { getAllByRole, getByRole, queryByTestId } = renderWithProviders(<MomentControl business={businessFixture} />, { theme: theme() })
    const group = getByRole('radiogroup')
    expect(cssOf(group)).toContain('gap:10px')
    const [asap, later] = getAllByRole('radio')
    expect(asap).toHaveTextContent(/ASAP/)
    expect(asap).toHaveAttribute('aria-checked', 'true')
    expect(later).toHaveTextContent('Schedule for later')
    expect(later).toHaveAttribute('aria-checked', 'false')
    expect(asap).toHaveAttribute('data-slot', 'choice')
    expect(asap.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(asap.querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    expect(queryByTestId('icon-radioCheck')).toBeNull()
  })

  it('without show_indicator, no indicator', () => {
    const { getAllByRole } = renderWithProviders(<MomentControl business={businessFixture} />, { theme: theme((choice) => { choice.base.show_indicator = false }) })
    expect(getAllByRole('radio')[0].querySelector('[data-slot="choice-indicator"]')).toBeNull()
  })

  it('Schedule for later opens the date and time steps', () => {
    const { getAllByRole, getByTestId } = renderWithProviders(<MomentControl business={businessFixture} />, { theme: theme() })
    fireEvent.click(getAllByRole('radio')[1])
    expect(getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'true')
    expect(getByTestId('preorder-steps')).toBeInTheDocument()
  })

})
