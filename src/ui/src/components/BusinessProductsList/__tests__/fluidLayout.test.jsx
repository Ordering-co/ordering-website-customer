import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import * as classic from '../styles'
import * as groceries from '../layouts/groceries/styles'

const css = (Comp, props = {}) => cssFor(renderWith(themeWithValues(), <Comp {...props} />).container.firstChild).replace(/\s+/g, '')

describe.each([['classic', classic, '200px', '4xl'], ['groceries', groceries, '300px', '5xl']])('BusinessProductsList %s: fluid layout', (_, m, media) => {
  it('the empty results fill 60dvh, the dialog photo is the media level, the ribbon reads up to 30ch', () => {
    expect(css(m.WrapperNotFound)).toContain('height:60dvh')
    expect(css(m.DescriptionModalContainer)).toContain(`width:${media}`)
    expect(css(m.RibbonBox)).toContain('max-width:min(100%,30ch)')
  })
})

describe('BusinessProductsList classic: the description region and the previous carousel', () => {
  it('the scrolling region is 40dvh; the previous cards are 34ch', () => {
    expect(css(classic.DescriptionContainer)).toContain('height:40dvh')
    expect(css(classic.PreviouslyOrderedWrapper)).toContain('flex:0034ch')
  })
})
