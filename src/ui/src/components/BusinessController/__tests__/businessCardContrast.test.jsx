import React from 'react'
import { describe, expect, it } from 'vitest'
import { contrast } from '@orderingco/ordering-theme-engine/colors'
import { buildAppTheme } from '~/utils/appTheme'
import { THEME_ENVELOPES } from '~ui/src/design-system/preview/themes'
import { cssFor, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { BusinessHeader, BusinessStarInfo, RibbonBox } from '../styles'

// implementation notes, M4: the texts of the listing card that sit on a color the card paints (the rating's number on the card,
// "Closed" on the header without a photo, the ribbon's text on the color the data gives it) keep AA (4.5:1) in every
// theme, with no theme value changed: the text color is the theme's, made legible over what is painted.
const AA = 4.5
const tight = (css) => css.replace(/\s+/g, '')
const THEMES = ['defaults', 'cafe', 'grill'].map((id) => [id, buildAppTheme(null, structuredClone(THEME_ENVELOPES[id]))])
// the last text color the rules of the selector set: the one that wins
const colorOf = (css, selector) => tight(css).split('}')
  .filter((rule) => new RegExp(`${selector}\\{`).test(rule))
  .flatMap((rule) => [...rule.matchAll(/(?<![-\w])color:(#[0-9A-Fa-f]{6})/g)].map((found) => found[1]))
  .at(-1)

describe.each(THEMES)('%s', (id, theme) => {
  const card = theme.values.components.business_card.base
  it('the rating number reads on the card, the star keeps the theme color', () => {
    const star = renderWith(theme, <BusinessStarInfo data-testid='s'><div className='reviews'><span>4.8</span></div></BusinessStarInfo>).getByTestId('s')
    const css = cssFor(star)
    expect(contrast(colorOf(css, '\\.reviewsspan'), card.background)).toBeGreaterThanOrEqual(AA)
    expect(tight(css)).toContain(`svg{margin-right:`)
    expect(tight(css)).toContain(`color:${theme.values.components.rating.base.color};`)
  })

  it('"Closed" reads on the header without a photo', () => {
    const header = renderWith(theme, <BusinessHeader name='x' data-testid='h'><p className='closed'>Closed</p></BusinessHeader>).getByTestId('h')
    expect(contrast(colorOf(cssFor(header), '\\.closed,\\.[\\w-]+\\.disabled'), card.header_background)).toBeGreaterThanOrEqual(AA)
  })

  it('the ribbon text reads on the color of the data', () => {
    const ribbon = renderWith(theme, <RibbonBox bgColor='#2F6F5E' data-testid='r'>Popular</RibbonBox>).getByTestId('r')
    expect(contrast(colorOf(cssFor(ribbon), ''), '#2F6F5E')).toBeGreaterThanOrEqual(AA)
  })
})
