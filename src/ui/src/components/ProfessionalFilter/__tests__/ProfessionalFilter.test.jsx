import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ProfessionalFilter } from '../index'

vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))
vi.mock('~ui/src/components/SingleProfessionalCard', () => ({
  SingleProfessionalCard: ({ professional, handleProfessionalClick, handleUpdateProfessionals }) => (
    <div>
      <button
        type='button'
        data-testid='pro-card'
        onClick={(e) => handleProfessionalClick?.(e, professional)}
      >
        {professional?.name}
      </button>
      <button
        type='button'
        data-testid='pro-fav'
        onClick={() => handleUpdateProfessionals?.(professional.id, { favorite: true })}
      >
        fav
      </button>
    </div>
  )
}))
vi.mock('~ui/src/components/ProfessionalProfile', async () => {
  const { ModalHeading } = await vi.importActual('~ui/src/components/Overlay/ModalHeading')
  return {
    ProfessionalProfile: ({ onClose, handleChangeProfessionalSelected, currentProfessional }) => (
      <div data-testid='pro-profile'>
        <ModalHeading>{currentProfessional?.name}</ModalHeading>
        <button type='button' data-testid='book' onClick={() => handleChangeProfessionalSelected?.(currentProfessional)}>book</button>
        <button type='button' data-testid='close-profile' onClick={onClose}>close</button>
      </div>
    )
  }
})
vi.mock('~ui/src/components/ProfessionalInfo', () => ({
  ProfessionalInfo: () => <div data-testid='pro-info' />
}))

describe('ProfessionalFilter', () => {
  const professionals = [{ id: 1, name: 'Alex', last_name: 'Rivera' }]

  it('renders professionals heading and cards', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <ProfessionalFilter
        professionals={professionals}
        professionalSelected={null}
        handleChangeProfessionalSelected={vi.fn()}
        handleUpdateProfessionals={vi.fn()}
      />
    )
    expect(getByText('Professionals')).toBeInTheDocument()
    expect(getByText('Any professional member')).toBeInTheDocument()
    expect(getByTestId('pro-card')).toHaveTextContent('Alex')
  })

  it('offers Any professional member as a named button with phrasing content', () => {
    const { getByRole } = renderWithProviders(
      <ProfessionalFilter professionals={[]} handleChangeProfessionalSelected={vi.fn()} />
    )
    const option = getByRole('button', { name: 'Any professional member' })
    expect(option.querySelector('p')).toBeNull()
    expect(option.querySelector('span')).toHaveTextContent('Any professional member')
  })

  it('opens the profile in the base dialog, flush, named by the title ProfessionalProfile hands it; its close closes it', async () => {
    const { getByTestId, findByRole, queryByRole } = renderWithProviders(
      <ProfessionalFilter
        professionals={professionals}
        professionalSelected={null}
        handleChangeProfessionalSelected={vi.fn()}
        handleUpdateProfessionals={vi.fn()}
      />
    )
    fireEvent.click(getByTestId('pro-card'))
    const dialog = await findByRole('dialog', { name: 'Alex' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog).toHaveAttribute('data-doc-section', 'professional-profile-dialog')
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

  it('opens profile modal and books professional', () => {
    const handleChangeProfessionalSelected = vi.fn()
    const { getByTestId, getByText } = renderWithProviders(
      <ProfessionalFilter
        professionals={professionals}
        professionalSelected={null}
        handleChangeProfessionalSelected={handleChangeProfessionalSelected}
        handleUpdateProfessionals={vi.fn()}
      />
    )
    fireEvent.click(getByTestId('pro-card'))
    expect(getByTestId('pro-profile')).toBeInTheDocument()
    fireEvent.click(getByTestId('book'))
    expect(handleChangeProfessionalSelected).toHaveBeenCalled()
    fireEvent.click(getByText('Any professional member'))
    expect(handleChangeProfessionalSelected).toHaveBeenCalledWith(null)
  })

  it('blocks open when cart status is 2', () => {
    const openAlertErrorStatus = vi.fn()
    const { getByTestId, queryByTestId } = renderWithProviders(
      <ProfessionalFilter
        professionals={professionals}
        professionalSelected={null}
        handleChangeProfessionalSelected={vi.fn()}
        handleUpdateProfessionals={vi.fn()}
        openAlertErrorStatus={openAlertErrorStatus}
        cart={{ status: 2 }}
      />
    )
    fireEvent.click(getByTestId('pro-card'))
    expect(openAlertErrorStatus).toHaveBeenCalled()
    expect(queryByTestId('pro-profile')).not.toBeInTheDocument()
  })

  it('updates professionals from card callback', () => {
    const handleUpdateProfessionals = vi.fn()
    const { getByTestId } = renderWithProviders(
      <ProfessionalFilter
        professionals={professionals}
        professionalSelected={null}
        handleChangeProfessionalSelected={vi.fn()}
        handleUpdateProfessionals={handleUpdateProfessionals}
      />
    )
    fireEvent.click(getByTestId('pro-fav'))
    expect(handleUpdateProfessionals).toHaveBeenCalled()
  })
})
