import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { marketplaceSections } from '../../marketplace'

const Partner = marketplaceSections.partner

const session = vi.hoisted(() => ({ auth: false }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: session.auth }]
}))

describe('Partner (landing section)', () => {
  beforeEach(() => {
    session.auth = false
  })

  it('a guest: the offer, and the business sign-up as a real link', () => {
    const { getByRole, container } = renderWithProviders(<Partner />)
    expect(getByRole('heading', { level: 2, name: 'Own a restaurant?' })).toBeInTheDocument()
    expect(container).toHaveTextContent('Reach more customers in your city.')
    const cta = getByRole('link', { name: 'Partner with us' })
    expect(cta.tagName).toBe('A')
    expect(cta).toHaveAttribute('href', '/signup_business')
    expect(container.querySelector('a[href="/signup_business"]')).toBe(cta)
  })

  it('with a session nothing shows (the sign-up redirects it)', () => {
    session.auth = true
    const { container } = renderWithProviders(<Partner />)
    expect(container).toBeEmptyDOMElement()
  })
})
