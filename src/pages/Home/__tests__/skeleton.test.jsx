import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'
import { SkeletonContent } from '../styles'

describe('Home: the content skeleton', () => {
  it('holds the room of its text as a share of the screen, not 500 px', () => {
    const css = cssFor(renderWith(themeWithValues(), <SkeletonContent data-testid='s' />).getByTestId('s'))
    expect(css).toContain('min-height:60dvh;')
    expect(css).not.toContain('500px')
  })
})
