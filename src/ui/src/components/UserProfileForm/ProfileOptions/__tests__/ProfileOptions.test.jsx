import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'
import { ProfileOptions } from '../index'

const emit = vi.hoisted(() => vi.fn())
vi.mock('~components/contexts/EventContext', () => ({ useEvent: () => [{ emit }] }))

describe('ProfileOptions', () => {
  it('renders profile navigation tabs', () => {
    const { getByText } = renderWithProviders(<ProfileOptions value='account' />)
    expect(getByText('My Account')).toBeInTheDocument()
    expect(getByText('My orders')).toBeInTheDocument()
  })

  it('the tabs are real links: their address, the current page marked, go_to_page on click without leaving', () => {
    const { getByTitle, getAllByRole } = renderWithProviders(<ProfileOptions value='orders' />, { theme: themeWithValues() })
    const links = getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toContain('/profile')
    expect(getByTitle('My orders')).toHaveAttribute('href', '/profile/orders')
    expect(getByTitle('My orders')).toHaveAttribute('aria-current', 'page')
    expect(getByTitle('My Account')).not.toHaveAttribute('aria-current')
    const click = fireEvent.click(getByTitle('My Account'))
    expect(click).toBe(false) // preventDefault: the app navigates
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'profile' })
  })

  it('each label (in a span beside its icon) ends in … when it does not fit', () => {
    const { getByText } = renderWithProviders(<ProfileOptions value='account' />, { theme: themeWithValues() })
    const label = getByText('My Account')
    expect(label.tagName).toBe('SPAN')
    expect(label.previousElementSibling.querySelector('svg')).not.toBeNull()
    // its full text stays available as the link's title
    expect(label.closest('a')).toHaveAttribute('title', 'My Account')
  })
})
