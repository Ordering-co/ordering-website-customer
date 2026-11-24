import { describe, expect, it } from 'vitest'
import { HEADER_GLYPHS } from '../headerGlyphs'
import { LUCIDE_ICON_REGISTRY } from '../lucideRegistry'

// Chosen by Sergio for the orders option (the registry keeps ListChecks until IC)
const CHOSEN = { cardChecklist: 'ClipboardList' }

describe('headerGlyphs', () => {
  it('every key is in the registry, with the registry\'s own glyph (the one chosen for cardChecklist)', () => {
    for (const [name, glyph] of Object.entries(HEADER_GLYPHS)) {
      expect(LUCIDE_ICON_REGISTRY, name).toHaveProperty(name)
      if (CHOSEN[name]) expect(glyph.displayName, name).toBe(CHOSEN[name])
      else expect(glyph, name).toBe(LUCIDE_ICON_REGISTRY[name])
    }
  })

  it('has the fourteen glyphs of the header and the bottom bar', () => {
    expect(Object.keys(HEADER_GLYPHS).sort()).toEqual(
      ['arrowLeft', 'basketFilled', 'cardChecklist', 'caretUpFill', 'close', 'geoAltFill', 'house', 'locationFood', 'mapMarker', 'menuBars', 'pinMapFill', 'search', 'shoppingCart', 'userOutline']
    )
  })
})
