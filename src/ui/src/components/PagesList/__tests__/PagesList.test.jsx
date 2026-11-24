import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PagesList } from '../index'

describe('PagesList', () => {
  it('renders site map title and route links', () => {
    const { getByText } = renderWithProviders(
      <PagesList routes={[{ name: 'Home', slug: '/' }]} />
    )
    expect(getByText('Site Map')).toBeInTheDocument()
    expect(getByText('Home')).toBeInTheDocument()
  })

  it('its links are a list in a navigation landmark', () => {
    const { getByRole, getAllByRole } = renderWithProviders(
      <PagesList routes={[{ name: 'Home', slug: '/' }, { name: 'Login', slug: '/login' }]} />
    )
    const nav = getByRole('navigation', { name: 'Site Map' })
    const items = getAllByRole('listitem')
    expect(items).toHaveLength(2)
    items.forEach((item) => {
      expect(nav.contains(item)).toBe(true)
      expect(item.querySelector('a')).not.toBeNull()
    })
    expect(getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
  })
})
