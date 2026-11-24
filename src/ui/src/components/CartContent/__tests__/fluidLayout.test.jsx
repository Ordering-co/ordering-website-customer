import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeSpace } from '~/utils/themeTokens'
import { Container, NotCarts } from '../styles'

describe('CartContent: empty state sizes', () => {
  it('the region is a share of the screen height, the panel one reserves the header, the illustration is the 4xl media level', () => {
    const { container } = renderWith(themeWithValues(), <NotCarts isSlideBar />)
    const css = cssFor(container.firstChild)
    expect(css).toMatch(/height:\s*35dvh/)
    expect(css).toMatch(/min-height:\s*calc\(100dvh - 2 \* var\(--header-height,\s*[^)]+\)\)/)
    expect(css).toMatch(/img\{[^}]*width:\s*200px/)
  })
})

describe('CartContent: the space after the carts', () => {
  it('from 769px the trailing padding and margin are the layer\'s end gap, with the theme\'s md where no layer says it', () => {
    const theme = themeWithValues()
    const md = themeSpace(theme, 'md')
    const { container } = renderWith(theme, <Container />)
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    const wide = css.slice(css.indexOf('@media(min-width:769px)'))
    expect(wide).toContain(`padding:${md};`)
    expect(wide).toContain(`margin-bottom:var(--layer-end-gap,${md});`)
    expect(wide).toContain(`padding-bottom:var(--layer-end-gap,${md});`)
    // below it there is no trailing space of its own
    expect(css.slice(0, css.indexOf('@media(min-width:769px)'))).not.toContain('layer-end-gap')
  })
})
