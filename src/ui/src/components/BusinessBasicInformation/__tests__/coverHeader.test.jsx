import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessBasicInformation } from '../index'

// The classic store page's header (`cover`): a low cover, the name with the favorite, one line (status, address,
// Info) and the closed store's card; no Info/Preorder buttons and no Sort By.

vi.mock('~components/components/BusinessController', () => ({ BusinessController: () => null }))
vi.mock('~ui/src/components/BusinessInformation', () => ({ BusinessInformation: () => <div data-testid='business-information' /> }))
vi.mock('~ui/src/components/BusinessReviews', () => ({ BusinessReviews: () => null }))
vi.mock('~ui/src/components/SearchProducts', () => ({ SearchProducts: () => null }))

const closed = {
  ...businessFixture,
  name: 'Example Restaurant',
  address: 'Kitchen 8, Ardwick Kitchens, Manchester M12 6DA, UK',
  header: 'https://cdn.test/cover.png',
  open: false,
  schedule: Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 22, minute: 0 } }] }))
}

const renderCover = (business, props = {}) => renderWithProviders(
  <BusinessBasicInformation
    variant='cover'
    businessState={{ business, loading: false }}
    openBusinessInformation={false}
    setOpenBusinessInformation={vi.fn()}
    setIsPreOrder={vi.fn()}
    {...props}
  />
)

describe('the classic header (cover)', () => {
  it('name, one line with the status, the address and Info, and the closed card', () => {
    const { container } = renderCover(closed)
    expect(screen.getByRole('heading', { level: 1, name: 'Example Restaurant' })).toBeInTheDocument()
    const meta = container.querySelector('[data-doc-section=business-identity-meta]')
    expect(meta.querySelector('.status')).toHaveTextContent('Closed · Opens')
    expect(meta.querySelector('.address')).toHaveTextContent('Kitchen 8, Ardwick Kitchens, Manchester M12 6DA, UK')
    expect(meta.querySelector('.address-short')).toHaveTextContent('Manchester M12 6DA, UK')
    expect(container.querySelector('[data-doc-section=business-closed-card]')).toBeInTheDocument()
  })

  it('Info is a link on the line and opens the information; there is no Preorder button and no Sort By', () => {
    const setOpenBusinessInformation = vi.fn()
    const { container } = renderCover(closed, { setOpenBusinessInformation })
    const meta = container.querySelector('[data-doc-section=business-identity-meta]')
    fireEvent.click(within(meta).getByRole('button', { name: 'Info' }))
    expect(setOpenBusinessInformation).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('button', { name: 'Preorder' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sort By')).not.toBeInTheDocument()
  })

  it('an open store has the open status and no closed card', () => {
    const { container } = renderCover({ ...closed, open: true })
    expect(container.querySelector('.status')).toHaveTextContent('Open now')
    expect(container.querySelector('[data-doc-section=business-closed-card]')).not.toBeInTheDocument()
  })
})
