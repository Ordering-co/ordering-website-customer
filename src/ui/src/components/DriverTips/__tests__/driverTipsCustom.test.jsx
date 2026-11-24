import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { DriverTips } from '../index'

const handlerChangeOption = vi.hoisted(() => vi.fn())

// fixed price tips ($), with a custom amount allowed
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      driver_tip_type: { value: '1' },
      currency_position: { value: 'left' },
      format_number_currency: { value: '$' }
    }
  }]
}))

vi.mock('~components/components/DriverTips', () => ({
  DriverTips: ({ UIComponent, ...rest }) => (
    <UIComponent
      driverTip={7.5}
      driverTipsOptions={[2, 5, 10]}
      isDriverTipUseCustom
      handlerChangeOption={handlerChangeOption}
      cart={{ total: 20, driver_tip: 7.5 }}
      {...rest}
    />
  )
}))

const themed = themeWithValues((values) => values)

const field = (utils) => utils.queryByRole('spinbutton')

describe('DriverTips custom amount', () => {
  beforeEach(() => handlerChangeOption.mockClear())

  it.each(['Escape', 'Cancel', 'Apply Tip'])('returns focus to the custom choice after %s', (action) => {
    const utils = renderWithProviders(<DriverTips />, { theme: themed })
    const custom = utils.getByRole('radio', { name: /\$7\.5/ })
    fireEvent.click(custom)
    const input = field(utils)
    expect(input).toHaveFocus()
    if (action === 'Escape') {
      fireEvent.keyDown(input, { key: 'Escape' })
    } else {
      if (action === 'Apply Tip') fireEvent.change(input, { target: { value: '8' } })
      const button = utils.getByRole('button', { name: action })
      button.focus()
      fireEvent.click(button)
    }
    expect(field(utils)).toBeNull()
    expect(custom).toHaveFocus()
  })

  it('theme: a custom tip is a selected choice of its own, labelled with its amount, in place of Custom; the field is hidden', () => {
    const utils = renderWithProviders(<DriverTips />, { theme: themed })
    const options = utils.getAllByRole('radio')
    expect(options.map((o) => o.textContent)).toEqual(['$2', '$5', '$10', '$7.5'])
    expect(options[3]).toHaveAttribute('aria-checked', 'true')
    expect(options.slice(0, 3).every((o) => o.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(utils.queryByText('Custom')).toBeNull()
    expect(field(utils)).toBeNull()
    // the amount is in the list: no message repeating it
    expect(utils.queryByText(/Current driver tip amount/)).toBeNull()
  })

  it('theme: editing the custom choice opens the field pre-filled; picking it again or cancel closes it without applying', () => {
    const utils = renderWithProviders(<DriverTips />, { theme: themed })
    const custom = utils.getByRole('radio', { name: /\$7\.5/ })
    fireEvent.click(custom)
    expect(field(utils)).toHaveValue(7.5)
    expect(utils.getByText('Apply Tip').closest('button')).toBeDisabled() // nothing changed yet
    expect(custom).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(custom)
    expect(field(utils)).toBeNull()

    fireEvent.click(custom)
    fireEvent.click(utils.getByRole('button', { name: 'Cancel' }))
    expect(field(utils)).toBeNull()

    fireEvent.click(custom)
    fireEvent.keyDown(field(utils), { key: 'Escape' })
    expect(field(utils)).toBeNull()
    expect(handlerChangeOption).not.toHaveBeenCalled()
  })

  it('theme: the field, Apply Tip and Cancel are the base pieces and keep their behavior', () => {
    const utils = renderWithProviders(<DriverTips />, { theme: themed })
    fireEvent.click(utils.getByRole('radio', { name: /\$7\.5/ }))
    const input = field(utils)
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('name', 'drivertip')
    expect(input).toHaveFocus()
    const apply = utils.getByText('Apply Tip').closest('button')
    expect(apply).toHaveAttribute('data-slot', 'button')
    const cancel = utils.getByRole('button', { name: 'Cancel' })
    expect(cancel).toHaveAttribute('data-slot', 'button')
    expect(cancel).toHaveAttribute('type', 'button')
    expect(cancel.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // a negative amount is not taken and the button stays disabled
    fireEvent.change(input, { target: { value: '-1' } })
    expect(input).toHaveValue(7.5)
    expect(apply).toBeDisabled()
    fireEvent.change(input, { target: { value: '9' } })
    expect(apply).not.toBeDisabled()
  })

  it('theme: applying calls the handler, closes the field and the new amount shows selected', () => {
    const utils = renderWithProviders(<DriverTips />, { theme: themed })
    fireEvent.click(utils.getByRole('radio', { name: /\$7\.5/ }))
    fireEvent.change(field(utils), { target: { value: '9' } })
    fireEvent.click(utils.getByText('Apply Tip'))
    expect(handlerChangeOption).toHaveBeenCalledWith('9')
    expect(field(utils)).toBeNull()

    // the cart answers with the new tip
    utils.rerender(<DriverTips driverTip={9} />)
    const custom = utils.getByRole('radio', { name: /\$9/ })
    expect(custom).toHaveAttribute('aria-checked', 'true')
    expect(field(utils)).toBeNull()
  })

  it('theme: with no custom tip, Custom opens an empty field and takes the selection while it is open', () => {
    const utils = renderWithProviders(<DriverTips driverTip={5} />, { theme: themed })
    expect(field(utils)).toBeNull()
    expect(utils.getByRole('radio', { name: /\$5/ })).toHaveAttribute('aria-checked', 'true')

    const custom = utils.getByRole('radio', { name: /Custom/ })
    fireEvent.click(custom)
    expect(field(utils)).toHaveValue(null)
    expect(custom).toHaveAttribute('aria-checked', 'true')
    expect(utils.getByRole('radio', { name: /\$5/ })).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(custom)
    expect(field(utils)).toBeNull()
    expect(utils.getByRole('radio', { name: /\$5/ })).toHaveAttribute('aria-checked', 'true')
  })
})
