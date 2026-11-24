import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { getUtils } from '../utils'

describe('BusinessController delivery icon (§2.21)', () => {
  it('the theme\'s truckDelivery icon (every project, EatStreet included), decorative', () => {
    const { container } = render(getUtils().getDeliveryIcon())
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('img')).toBeNull()
  })
})
