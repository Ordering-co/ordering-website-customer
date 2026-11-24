import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { SingleProfessionalCard } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~ui/src/components/ProfessionalInfo', async () => {
  const { ModalHeading } = await vi.importActual('~ui/src/components/Overlay/ModalHeading')
  return { ProfessionalInfo: () => <div data-testid='pro-info'><ModalHeading>Sam Lee</ModalHeading></div> }
})

vi.mock('~components/components/SingleProfessionalCard', () => ({
  SingleProfessionalCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      professional={{
        id: 1,
        name: 'Sam',
        last_name: 'Lee',
        occupation: { name: 'Stylist' },
        favorite: false
      }}
      handleFavoriteProfessional={vi.fn()}
      {...rest}
    />
  )
}))

describe('SingleProfessionalCard', () => {
  it('renders professional name and occupation', () => {
    const { getByText } = renderWithProviders(<SingleProfessionalCard />)
    expect(getByText(/Sam/)).toBeInTheDocument()
    expect(getByText('Stylist')).toBeInTheDocument()
  })

  it('the info opens ProfessionalInfo in the base dialog, flush, named by the title it hands; its close closes it', async () => {
    const { getByRole, findByRole, queryByRole } = renderWithProviders(<SingleProfessionalCard />)
    fireEvent.click(getByRole('button', { name: 'Information' }))
    const dialog = await findByRole('dialog', { name: 'Sam Lee' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    // flush: the body has no padding, and the title row has none of its own (it sits at the edges)
    const header = dialog.querySelector('[data-slot=dialog-header]')
    // flush: no padding but the keyboard's inset at the bottom
    expect(header.parentElement.className).toContain('ui:px-none')
    expect(header.parentElement.className).toContain('ui:pt-none')
    expect(header.parentElement.className).toContain('ui:pb-[var(--keyboard-inset,0px)]')
    expect(header.className).not.toMatch(/ui:(p|px|pt|ps)-/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})
