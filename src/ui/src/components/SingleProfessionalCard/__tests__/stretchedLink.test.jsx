import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { SingleProfessionalCard } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
vi.mock('~ui/src/components/ProfessionalInfo', () => ({
  ProfessionalInfo: () => <div data-testid='pro-info' />
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true }]
}))
vi.mock('~components/components/SingleProfessionalCard', () => ({
  SingleProfessionalCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      professional={{ id: 1, name: 'Sam', last_name: 'Lee', occupation: { name: 'Stylist' }, favorite: true }}
      handleFavoriteProfessional={vi.fn()}
      {...rest}
    />
  )
}))

const card = (container) => container.querySelector('[data-doc-section="favorite-professional-card"]')

describe('SingleProfessionalCard', () => {
  it('a card that picks its professional: the name is the one button, inside the card', () => {
    const handleProfessionalClick = vi.fn()
    const { container, getByRole } = renderWithProviders(
      <SingleProfessionalCard handleProfessionalClick={handleProfessionalClick} active={false} />,
      { theme: themeWithValues() }
    )
    const box = card(container)
    const link = getByRole('button', { name: 'Sam Lee' })
    expect(box.querySelectorAll('[data-card-link]')).toHaveLength(1)
    expect(link).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(box)
    expect(handleProfessionalClick).not.toHaveBeenCalled()
    fireEvent.click(link)
    expect(handleProfessionalClick).toHaveBeenCalledTimes(1)
    expect(window.getComputedStyle(box).position).toBe('relative')
  })

  it('info and favorite are named buttons that do not pick the professional', () => {
    const handleProfessionalClick = vi.fn()
    const handleFavoriteProfessional = vi.fn()
    const { getByRole, getByTestId } = renderWithProviders(
      <SingleProfessionalCard handleProfessionalClick={handleProfessionalClick} handleFavoriteProfessional={handleFavoriteProfessional} />,
      { theme: themeWithValues() }
    )
    const favorite = getByRole('button', { name: 'Favorite' })
    expect(favorite).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(favorite)
    expect(handleFavoriteProfessional).toHaveBeenCalledWith(false)
    fireEvent.click(getByRole('button', { name: 'Information' }))
    expect(getByTestId('pro-info')).toBeInTheDocument()
    expect(handleProfessionalClick).not.toHaveBeenCalled()
  })

  it('a card that only shows: no stretched link, its buttons still there', () => {
    const { container, getByRole } = renderWithProviders(<SingleProfessionalCard />, { theme: themeWithValues() })
    expect(container.querySelector('[data-card-link]')).toBeNull()
    expect(within(card(container)).getByRole('button', { name: 'Favorite' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Information' })).toBeInTheDocument()
  })
})
