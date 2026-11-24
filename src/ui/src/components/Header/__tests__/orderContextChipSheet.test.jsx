import React, { Suspense, useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { OrderContextChip } from '../OrderContextChip'

// The chip's sheet, the real Sheet and the real OrderContextUI controls
const windowSize = vi.hoisted(() => ({ width: 390, height: 800 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => windowSize }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, address: { address: '123 Main St' }, moment: null } }, {}]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { preorder_status_enabled: { value: '1' }, order_types_allowed: { value: '1,2' } } }]
}))
vi.mock('~ui/src/components/AddressOrderType', () => ({ AddressOrderType: () => <div data-testid='address-order-type' /> }))
vi.mock('~ui/src/components/MomentContent', () => ({ MomentContent: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => null }))
// the setup's loadable never resolves a lazy chunk: React.lazy does
vi.mock('@loadable/component', async () => {
  const { lazy } = await import('react')
  return { default: (loader) => lazy(() => loader().then((component) => ({ default: component }))) }
})

// What the header does with the modal: opens it (here, a stand-in that takes the focus as the Modal does)
const Host = ({ onOpenModal, onBusyChange }) => {
  const [modal, setModal] = useState(null)
  return (
    <Suspense fallback={null}>
      <OrderContextChip label='123 Main St' onBusyChange={onBusyChange} onOpenModal={(kind) => { setModal(kind); onOpenModal(kind, document.activeElement) }} />
      {modal && <div role='dialog' data-testid='header-modal'>{modal}</div>}
    </Suspense>
  )
}

const openSheet = async (onOpenModal = vi.fn(), onBusyChange = vi.fn()) => {
  const view = renderWithProviders(<Host onOpenModal={onOpenModal} onBusyChange={onBusyChange} />)
  const chip = view.getByRole('button', { name: 'Your order: 123 Main St' })
  chip.focus()
  fireEvent.click(chip)
  const sheet = await view.findByRole('dialog', { name: 'Your order' })
  return { ...view, chip, sheet, onOpenModal }
}

describe('the order context chip opens a Sheet', () => {
  // the sheet is a lazy chunk: warm it, the first import is slow
  beforeAll(() => import('../OrderContextSheet'), 30000)

  it('titled "Your order", with the order\'s controls the theme shows (moment and address), one overlay', async () => {
    const { sheet, getAllByRole } = await openSheet()
    expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
    expect(sheet).toHaveAttribute('data-side', 'bottom')
    expect(sheet.querySelector('[data-testid="address-order-type"]')).not.toBeNull()
    expect(sheet.querySelector("[data-doc-control='order-moment-open']")).not.toBeNull()
    expect(sheet.querySelector("[data-doc-control='order-address-open']")).toHaveTextContent('123 Main St')
    expect(getAllByRole('dialog')).toHaveLength(1)
  })

  it('Esc closes it and the focus goes back to the chip', async () => {
    const { chip, queryByRole } = await openSheet()
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog', { name: 'Your order' })).toBeNull())
    expect(document.activeElement).toBe(chip)
  })

  it('tells the header it is busy from the tap until the sheet is out, so the header keeps the chip meanwhile', async () => {
    const onBusyChange = vi.fn()
    const { queryByRole } = await openSheet(vi.fn(), onBusyChange)
    expect(onBusyChange.mock.calls).toEqual([[true]])
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog', { name: 'Your order' })).toBeNull())
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
  })

  it('its X closes it and the focus goes back to the chip', async () => {
    const { chip, sheet, queryByRole } = await openSheet()
    const close = [...sheet.querySelectorAll('button')].find((button) => /close/i.test(button.getAttribute('aria-label') || button.textContent))
    fireEvent.click(close)
    await waitFor(() => expect(queryByRole('dialog', { name: 'Your order' })).toBeNull())
    expect(document.activeElement).toBe(chip)
  })

  it.each([
    ['moment', "[data-doc-control='order-moment-open']"],
    ['address', "[data-doc-control='order-address-open']"]
  ])('tapping the %s closes the sheet and then opens the header\'s modal, with the chip holding the focus', async (kind, selector) => {
    const { sheet, chip, queryByRole, getByTestId, onOpenModal } = await openSheet()
    fireEvent.click(sheet.querySelector(selector))
    await waitFor(() => expect(getByTestId('header-modal')).toHaveTextContent(kind))
    // the sheet is gone by then: one overlay at a time
    expect(queryByRole('dialog', { name: 'Your order' })).toBeNull()
    expect(onOpenModal).toHaveBeenCalledTimes(1)
    // what the modal remembers to give the focus back to
    expect(onOpenModal.mock.calls[0][1]).toBe(chip)
  })
})
