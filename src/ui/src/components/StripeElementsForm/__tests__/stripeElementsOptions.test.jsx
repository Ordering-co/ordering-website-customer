import { describe, expect, it, vi } from 'vitest'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { stripeElementsOptions } from '../index'

vi.mock('@stripe/stripe-js/pure', () => ({ loadStripe: vi.fn() }))
vi.mock('@stripe/react-stripe-js', () => ({ Elements: ({ children }) => children }))

describe('stripeElementsOptions', () => {
  it('loads the body font of the theme in the card fields', () => {
    const options = stripeElementsOptions(themeWithValues())
    expect(options.fonts[0].cssSrc).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/)
  })

  it('loads no font without one in the theme', () => {
    expect(stripeElementsOptions({})).toBeUndefined()
  })
})
