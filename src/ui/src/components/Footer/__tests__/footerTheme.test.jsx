import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaEntry } from '~/utils/themeSchema'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Container, FooterContent } from '../styles'

const tight = (css) => css.replace(/\s+/g, '')

const custom = themeWithValues((values) => {
  Object.assign(values.components.footer.base, {
    padding_y: 24,
    padding_x: 16,
    margin_top: 40,
    border_top: { width: 1, color: '#DDDDDD', style: 'solid' }
  })
  return values
})

describe('components.footer in the schema', () => {
  it('no padding nor line by default', () => {
    const base = (prop) => schemaEntry(`components.footer.base.${prop}`)
    expect(base('padding_y')).toMatchObject({ type: 'space', value: '{space.none}' })
    expect(base('padding_x')).toMatchObject({ type: 'space', value: '{space.none}' })
    expect(base('margin_top')).toMatchObject({ type: 'space', value: '{space.xxxl}' })
    expect(base('border_top')).toMatchObject({ type: 'border', value: null })
  })
})

describe('footer (components.footer)', () => {
  it('its padding, line on top and the space over it (none on the home)', () => {
    const page = tight(cssFor(renderWith(custom, <Container data-testid='f' />).getByTestId('f')))
    expect(page).toContain('padding:24px16px;margin-top:40px;border-top:1pxsolid#DDDDDD;')
    const home = tight(cssFor(renderWith(custom, <Container $isHome data-testid='h' />).getByTestId('h')))
    expect(home).not.toContain('margin-top:40px')
    expect(home).toContain('border-top:1pxsolid#DDDDDD;')
  })

  it('the content breaks words only when they do not fit', () => {
    const css = tight(cssFor(renderWith(custom, <FooterContent data-testid='c' />).getByTestId('c')))
    expect(css).toContain('word-break:normal;overflow-wrap:anywhere;')
  })
})
