import { describe, expect, it } from 'vitest'
import { composeAddress, streetLineOf } from '../addressParts'

describe('addressParts', () => {
  it('the street line is what a geocoded address says before its first comma', () => {
    expect(streetLineOf('3535 Odyssey Drive, Mississauga, Ontario L5M 7Z7, Canada')).toBe('3535 Odyssey Drive')
    expect(streetLineOf('Calle Mayor 5')).toBe('Calle Mayor 5')
    expect(streetLineOf(undefined)).toBe('')
  })

  it('composes the address text in the order Mapbox writes it, skipping what is missing', () => {
    expect(composeAddress('3537 Odyssey Drive', { city: 'Mississauga', state: 'Ontario', zipcode: 'L5M 7Z7', country: 'Canada' }))
      .toBe('3537 Odyssey Drive, Mississauga, Ontario L5M 7Z7, Canada')
    expect(composeAddress('5 Oak', { city: 'Austin', zipcode: '78701' })).toBe('5 Oak, Austin, 78701')
    expect(composeAddress('5 Oak')).toBe('5 Oak')
  })

  it('without a street line there is no address', () => {
    expect(composeAddress('  ', { city: 'Austin' })).toBe('')
  })
})
