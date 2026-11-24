import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ProfessionalProfile } from '../index'

vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='preorder' />
}))

describe('ProfessionalProfile', () => {
  it('renders name and book action', () => {
    const handleChangeProfessionalSelected = vi.fn()
    const onClose = vi.fn()
    const { getByText } = renderWithProviders(
      <ProfessionalProfile
        currentProfessional={{ id: 1, name: 'Casey', lastname: 'Nguyen' }}
        handleChangeProfessionalSelected={handleChangeProfessionalSelected}
        onClose={onClose}
      />
    )
    expect(getByText(/Casey/)).toBeInTheDocument()
    expect(getByText('No schedule')).toBeInTheDocument()
    fireEvent.click(getByText('Book'))
    expect(handleChangeProfessionalSelected).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ProfessionalProfile (appointments) with the theme', () => {
  const flat = (text) => text.replace(/\s+/g, '')
  const renderProfile = (theme) => renderWithProviders(
    <ProfessionalProfile currentProfessional={{ id: 1, name: 'Casey', lastname: 'Nguyen', photo: 'https://img/casey.png' }} handleChangeProfessionalSelected={vi.fn()} />,
    { theme }
  )

  it('the photo is an xl avatar; the profile takes the modal\'s padding', () => {
    const theme = themeWithValues()
    const { container } = renderProfile(theme)
    const avatar = container.querySelector('[data-slot=avatar]')
    expect(avatar).toHaveAttribute('data-size', 'xl')
    expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(theme.css.components.avatar.sizes.xl.size)
    const { padding, padding_top: top } = theme.values.components.modal.base
    const box = container.querySelector('[data-doc-section="professional-profile"]')
    expect(flat(cssFor(box))).toContain(`padding:${top || padding}px${padding}px0px${padding}px;`)
  })

})
