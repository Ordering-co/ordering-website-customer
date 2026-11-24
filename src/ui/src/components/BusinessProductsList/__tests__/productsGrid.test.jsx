import { describe, expect, it } from 'vitest'
import { productsGridCss } from '../styles'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

// the rules without spaces (styled-components minifies them)
const flat = (rules) => [].concat(rules).flat(Infinity).join('').replace(/\s+/g, '')

describe('productsGridCss', () => {
  it('a grid with the md gap, one column on phones, two from 576px and three from 1000px', () => {
    const theme = themeWithValues()
    const md = `${theme.values.tokens.space.md}px`
    const css = flat(productsGridCss(theme, false))
    expect(css).toContain('display:grid')
    expect(css).toContain(`gap:${md}`)
    expect(css).toContain('@media(min-width:576px)')
    expect(css).toContain('repeat(3,minmax(0,1fr))')
  })

  it('with the cart beside the list: two columns from 576px, never three', () => {
    const css = flat(productsGridCss(themeWithValues(), true))
    expect(css).toContain('@media(min-width:576px)')
    expect(css).not.toContain('repeat(3')
  })
})
