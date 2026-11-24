import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { marketplaceSections } from '../../marketplace'

const HowItWorks = marketplaceSections.how_it_works

describe('HowItWorks (landing section)', () => {
  it('is a section with its h2 and three numbered steps, in order', () => {
    const { container, getByRole, getAllByRole } = renderWithProviders(<HowItWorks />)
    expect(getByRole('heading', { level: 2, name: 'How it works' })).toBeInTheDocument()
    expect(container.querySelector('section')).toHaveAttribute('id', 'landing-how_it_works')
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'landing-how_it_works-title')
    const steps = getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    expect(container.querySelector('ol')).not.toBeNull()
    expect(steps.map((step) => step.textContent)).toEqual([
      '1Find a restaurantEnter your address and see who delivers to you.',
      '2Order in a few tapsPay online, pick delivery or pickup.',
      '3Track it liveFollow your order until it\'s at your door.'
    ])
    expect(getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Find a restaurant', 'Order in a few taps', 'Track it live'])
  })

  it('has no h1 (the hero\'s is the page\'s)', () => {
    const { container } = renderWithProviders(<HowItWorks />)
    expect(container.querySelector('h1')).toBeNull()
  })
})
