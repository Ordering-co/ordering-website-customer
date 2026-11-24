import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { taxFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { TaxBillRows } from '../index'

// The info of a tax row: a real button, named, inside the row's icon wrapper
describe('TaxBillRows: the info of a row', () => {
  it('is a button named Information that opens the tax', () => {
    const setOpenTaxModal = vi.fn()
    const Wrapper = (props) => <span data-testid='wrapper' {...props} />
    const { getByRole, getByTestId } = renderWithProviders(
      <table>
        <tbody>
          <TaxBillRows
            taxes={[taxFixture]}
            target='product'
            parsePrice={(v) => `$${v}`}
            parseNumber={(v) => v}
            t={(_key, fallback) => fallback}
            setOpenTaxModal={setOpenTaxModal}
            IconWrapper={Wrapper}
          />
        </tbody>
      </table>
    )
    const info = getByRole('button', { name: 'Information' })
    expect(getByTestId('wrapper').contains(info)).toBe(true)
    // the base Button: xs ghost icon, its border reserved (transparent) so the row keeps its height
    expect(info).toHaveAttribute('data-slot', 'button')
    expect(info).toHaveAttribute('type', 'button')
    expect(info.style.getPropertyValue('--ui-button-border')).toMatch(/solid transparent/)
    expect(info.querySelector('svg')).not.toBeNull()
    fireEvent.click(info)
    expect(setOpenTaxModal).toHaveBeenCalledWith(expect.objectContaining({ open: true, type: 'tax' }))
  })
})
