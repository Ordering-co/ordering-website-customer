import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CustomOrderModal } from '../index'

vi.mock('~ui/utils/customOrder', () => ({
  fetchPluginConfig: vi.fn().mockResolvedValue({ max_distance_km: 25 }),
  createCustomOrder: vi.fn()
}))

vi.mock('~ui/src/components/CustomOrderModal/Step1', () => ({
  Step1: () => <div>Step one form</div>
}))

vi.mock('~ui/src/components/CustomOrderModal/Step2', () => ({
  Step2: () => <div>Step 2</div>
}))

describe('CustomOrderModal', () => {
  it('renders step one content when open', () => {
    const { getByText } = renderWithProviders(
      <CustomOrderModal open onClose={vi.fn()} />
    )
    expect(getByText('Where do we pickup and deliver?')).toBeInTheDocument()
    expect(getByText('Step one form')).toBeInTheDocument()
  })

  it('is the base Dialog: named by its step title, md, its doc marker, closed by its close', async () => {
    const onClose = vi.fn()
    const view = renderWithProviders(<CustomOrderModal open onClose={onClose} />)
    const dialog = await view.findByRole('dialog', { name: 'Where do we pickup and deliver?' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog.getAttribute('data-doc-section')).toBe('custom-order-modal')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
