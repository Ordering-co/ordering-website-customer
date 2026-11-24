import { describe, expect, it } from 'vitest'
import { EMPTY_STATE_GLYPHS } from '../emptyStateGlyphs'
import { LUCIDE_ICON_REGISTRY } from '../lucideRegistry'

describe('emptyStateGlyphs', () => {
  it('every key is in the registry, with the registry\'s own glyph', () => {
    for (const [name, glyph] of Object.entries(EMPTY_STATE_GLYPHS)) expect(glyph, name).toBe(LUCIDE_ICON_REGISTRY[name])
  })
})
