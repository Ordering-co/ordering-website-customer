import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { TimeListWrapper } from '../styles'

const css = (el) => cssFor(el).replace(/\s+/g, '')

describe('MomentControl custom layout: fluid layout', () => {
  it('the time list scrolls within half of the viewport', () => {
    const out = css(renderWith(themeWithValues(), <TimeListWrapper data-testid='t' />).getByTestId('t'))
    expect(out).toContain('max-height:50dvh;')
    expect(out).not.toContain('425px')
  })
})
