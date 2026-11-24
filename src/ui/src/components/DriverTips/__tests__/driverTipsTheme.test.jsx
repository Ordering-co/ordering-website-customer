import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { DriverTips } from '../index'

const handlerChangeOption = vi.hoisted(() => vi.fn())

vi.mock('~components/components/DriverTips', () => ({
  DriverTips: ({ UIComponent, ...rest }) => (
    <UIComponent
      driverTip={15}
      driverTipsOptions={[10, 15, 20]}
      isDriverTipUseCustom
      handlerChangeOption={handlerChangeOption}
      cart={{ total: 20 }}
      {...rest}
    />
  )
}))

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const choice = values.components.choice
  choice.base.background = '#FFFFFF'
  choice.base.hover = '#F8F9FA'
  choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  mutate(choice)
  return values
})

describe('DriverTips (components.choice)', () => {
  it('theme: the tips are a horizontal single choice row, the selected one takes the selected state', () => {
    const { getAllByRole, getByRole } = renderWithProviders(<DriverTips />, { theme: theme() })
    expect(getByRole('radiogroup')).toBeInTheDocument()
    const options = getAllByRole('radio')
    expect(options.map((o) => o.textContent)).toEqual(['10%', '15%', '20%', 'Custom'])
    expect(options[1]).toHaveAttribute('aria-checked', 'true')
    expect(options[0]).toHaveAttribute('aria-checked', 'false')
    expect(options[1].style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(options[1]).toHaveClass('ui:flex-[0_0_auto]', 'ui:w-auto')
    expect(options[0].style.getPropertyValue('--ui-choice-hover')).toBe('#F8F9FA')
  })

  it('theme: the indicator follows show_indicator', () => {
    const shown = renderWithProviders(<DriverTips />, { theme: theme() })
    expect(shown.getAllByRole('radio')[1].querySelector('[aria-hidden="true"]')).not.toBeNull()
    shown.unmount()
    const hidden = renderWithProviders(<DriverTips />, { theme: theme((choice) => { choice.base.show_indicator = false }) })
    expect(hidden.getAllByRole('radio')[1].querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('theme: picking a tip calls the controller; Custom opens the custom tip input', () => {
    handlerChangeOption.mockClear()
    const { getByText, getByPlaceholderText } = renderWithProviders(<DriverTips />, { theme: theme() })
    fireEvent.click(getByText('20%'))
    expect(handlerChangeOption).toHaveBeenCalledWith(20)
    fireEvent.click(getByText('Custom'))
    expect(getByPlaceholderText('0%')).toBeInTheDocument()
  })
})

describe('the tips\' box in a section', () => {
  it('the md space under the title and no room below (the section spaces itself)', async () => {
    const { DriverTipContainer } = await import('../styles')
    const { renderWith, cssFor } = await import('../../../styles/__tests__/themeTestUtils')
    const themed = themeWithValues()
    const { getByTestId } = renderWith(themed, <DriverTipContainer data-testid='box' />)
    const css = cssFor(getByTestId('box'))
    expect(css).toContain(`margin-top:${themed.values.tokens.space.md}px;`)
    expect(css).not.toContain('padding-bottom')
  })
})

describe('the tips\' row minimum', () => {
  it('is a multiple of the store control size, not a fixed px', async () => {
    const { WrapperTips } = await import('../styles')
    const { renderWith, cssFor } = await import('../../../styles/__tests__/themeTestUtils')
    const themed = themeWithValues()
    const { getByTestId } = renderWith(themed, <WrapperTips data-testid='row' />)
    const css = cssFor(getByTestId('row'))
    expect(css).toContain(`min-height:calc(1.2 * ${themed.values.tokens.size.xl}px);`)
    expect(css).not.toContain('65px')
  })
})
