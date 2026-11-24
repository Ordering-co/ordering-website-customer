import { describe, expect, it } from 'vitest'
import { isMarketingHome, LANDING_FOOTER_MODES, LANDING_HEADER_MODES } from '../marketingHome'

const home = { fullWebsite: true, mode: 'single_store', isKioskApp: false, spoonity: false }

describe('isMarketingHome', () => {
  it('is the "/" of a full website whose type paints its own header', () => {
    expect(isMarketingHome('/', home)).toBe(true)
  })

  it.each([
    ['the menu at /order', '/order', home],
    ['a page of the site', '/profile', home],
    ['a site that opens on the menu', '/', { ...home, fullWebsite: false }],
    ['the kiosk, which opens on the menu', '/', { ...home, isKioskApp: true }],
    ['the Spoonity login', '/', { ...home, spoonity: true }],
    ['a type without its own header', '/', { ...home, mode: 'unknown' }]
  ])('is not %s', (_, pathname, state) => {
    expect(isMarketingHome(pathname, state)).toBe(false)
  })

  it('a franchise\'s home is the marketing home too', () => {
    expect(isMarketingHome('/', { ...home, mode: 'franchise' })).toBe(true)
  })

  it.each([['Header', LANDING_HEADER_MODES], ['Footer', LANDING_FOOTER_MODES]])('the types with their own %s are exactly the maps that bring one', async (part, modes) => {
    const { MODE_SECTIONS } = await import('../../pages/Landing')
    const withPart = Object.keys(MODE_SECTIONS).filter((mode) => typeof MODE_SECTIONS[mode][part] === 'function')
    expect([...modes].sort()).toEqual(withPart.sort())
  })
})
