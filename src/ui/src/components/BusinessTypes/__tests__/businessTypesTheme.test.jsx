import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { schemaDefault, schemaEntry } from '~/utils/themeSchema'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessTypes, businessTypeImage } from '../index'
import {
  businessTypesGap,
  businessTypesImageSize,
  businessTypesLayout,
  businessTypesTileWidth
} from '../styles'

const controller = vi.hoisted(() => ({ typesState: null, selected: 2, onChange: null }))

vi.mock('~components/components/BusinessTypeFilter', () => ({
  BusinessTypeFilter: ({ UIComponent, ...rest }) => (
    <UIComponent
      typesState={controller.typesState}
      currentTypeSelected={controller.selected}
      handleChangeBusinessType={controller.onChange}
      {...rest}
    />
  )
}))

const types = {
  loading: false,
  error: null,
  types: [
    { id: null, name: 'All', enabled: true, image: null },
    { id: 2, name: 'Groceries', enabled: true, image: '/groceries.png' },
    { id: 3, name: 'Pharmacy', enabled: true, image: null },
    { id: 4, name: 'Food', enabled: true, image: null },
    { id: 5, name: 'Hidden', enabled: false, image: '/hidden.png' }
  ]
}

const tight = (css) => css.replace(/\s+/g, '')

// The CSS rules of an element's generated classes (not the component ids nor
// the type-* names the markup gives)
const cssFor = (el) => {
  const classes = [...el.classList].filter((name) => !name.includes('-sc-') && !name.startsWith('sc-') && !name.startsWith('type-'))
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}`))).join('}')
}

const withBase = (base = {}, mutate) => themeWithValues((values) => {
  Object.assign(values.components.business_types.base, base)
  mutate && mutate(values)
  return values
})

describe('components.business_types in the schema', () => {
  it('the layout: automatic (the default), pills, pills with image or tiles', () => {
    expect(schemaEntry('components.business_types.base.layout')).toMatchObject({
      type: 'layout', value: 'auto', options: ['auto', 'pills', 'pills_image', 'tiles']
    })
  })

  it('the sizes of the looks with images', () => {
    const base = (prop) => schemaEntry(`components.business_types.base.${prop}`)
    expect(base('pill_image_size')).toMatchObject({ type: 'number', value: 28 })
    expect(base('image_size')).toMatchObject({ type: 'number', value: 64 })
    expect(base('tile_width')).toMatchObject({ type: 'number', value: 80 })
    expect(base('image_radius')).toMatchObject({ value: '{radius.full}' })
    expect(base('image_gap')).toMatchObject({ value: '{space.sm}' })
    expect(base('label')).toMatchObject({ value: '{typography.caption}' })
    expect(base('gap')).toMatchObject({ value: '{space.sm}' })
    expect(schemaDefault('components.business_types.base.image_selected_border')).toEqual({
      width: '{border.thick}', color: '{color.primary}', style: 'solid'
    })
    // the tiles are not tabs any more, and every tile has an image
    expect(schemaEntry('components.business_types.slots.tab')).toBeFalsy()
    expect(schemaEntry('components.business_types.base.label_plain')).toBeFalsy()
    expect(schemaDefault('components.business_types.slots.pill')).toEqual({ component: 'chip', size: 'md' })
  })
})

describe('the helpers of components.business_types', () => {
  it('the layout: the theme\'s, pills by default', () => {
    expect(businessTypesLayout(withBase())).toBe('pills')
    expect(businessTypesLayout(withBase({ layout: 'tiles' }))).toBe('tiles')
  })

  it('the theme\'s sizes', () => {
    const theme = withBase({ image_size: 72, tile_width: 96, gap: 12 })
    expect(businessTypesImageSize(theme)).toBe(72)
    expect(businessTypesTileWidth(theme)).toBe(96)
    expect(businessTypesGap(theme)).toBe(12)
    expect(businessTypesImageSize(withBase())).toBe(64)
    expect(businessTypesTileWidth(withBase())).toBe(80)
    // a tile is never narrower than its image
    expect(businessTypesTileWidth(withBase({ image_size: 100, tile_width: 80 }))).toBe(100)
  })

  it('a type\'s image: its own, else the bundle\'s of its name, else none', () => {
    expect(businessTypeImage({ name: 'Food', image: '/mine.png' })).toBe('/mine.png')
    expect(businessTypeImage({ name: 'Food', image: null })).toBe(BUNDLED_IMAGES.categories.food)
    expect(businessTypeImage({ name: 'Pharmacy', image: ' ' })).toBeNull()
  })
})

describe('business types: the three looks (components.business_types.base.layout)', () => {
  beforeEach(() => {
    controller.typesState = types
    controller.selected = 2
    controller.onChange = vi.fn()
  })

  it.each([['auto', 'tiles'], ['pills', 'pills'], ['pills_image', 'pills_image'], ['tiles', 'tiles']])(
    'showcase chooses tiles only when the category layout is automatic (%s)',
    (layout, expected) => {
      const theme = withBase({ layout })
      const view = renderWithProviders(<BusinessTypes defaultLayout='tiles' />, { theme })
      expect(view.container.querySelector('#container')).toHaveAttribute('data-layout', expected)
    }
  )

  it('by default: pills, the name alone in a chip, no image', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: themeWithValues() })
    expect(view.container.querySelector('#businessTypesPills')).not.toBeNull()
    expect(view.container.querySelector('img')).toBeNull()
    const pill = view.getByText('Groceries')
    expect(pill.tagName).toBe('BUTTON')
    expect(pill).toHaveAttribute('aria-pressed', 'true')
    expect(view.getByText('Pharmacy')).toHaveAttribute('aria-pressed', 'false')
    // a disabled type is not shown
    expect(view.queryByText('Hidden')).toBeNull()
    // the row places the chips, it writes no rule over them (they are inline-flex, centered, no wrap and no shrink themselves)
    expect(tight(cssFor(pill.parentElement))).not.toMatch(/button\{|white-space/)
    expect(pill).toHaveClass('ui:shrink-0', 'ui:whitespace-nowrap', 'ui:inline-flex', 'ui:justify-center')
  })

  it('pills with image: the image (decorative) before the name, in the same chip', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: withBase({ layout: 'pills_image' }) })
    const pill = view.getByText('Groceries').closest('button')
    expect(pill).toHaveAttribute('aria-pressed', 'true')
    expect(pill.firstElementChild).toHaveAttribute('data-slot', 'chip-edge-image')
    expect(pill.firstElementChild.firstElementChild).toHaveClass('type-image')
    expect(pill.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    const img = pill.querySelector('img')
    expect(img).toHaveAttribute('src', '/groceries.png')
    expect(img).toHaveAttribute('alt', '')
    // the accessible name is the type's name
    expect(pill).toHaveTextContent(/^Groceries$/)
    expect(view.container.querySelector('#businessTypesPills')).not.toBeNull()
  })

  it('pills with image: the theme\'s size, concentric with the pill\'s end', () => {
    const theme = withBase({ layout: 'pills_image', pill_image_size: 24 })
    const view = renderWithProviders(<BusinessTypes />, { theme })
    const pill = view.getByText('Groceries').closest('button')
    const height = theme.values.components.chip.sizes.md.height
    const thin = theme.values.tokens.border.thin
    expect(pill.style.getPropertyValue('--ui-chip-image-padding-start')).toBe(`${(height - 24) / 2 - thin}px`)
    expect(pill.style.getPropertyValue('--ui-chip-image-size')).toBe('24px')
    expect(pill.style.getPropertyValue('--ui-chip-image-radius')).toBe('50%')
  })

  it('tiles: a button each, the image on top and the name below', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: withBase({ layout: 'tiles' }) })
    expect(view.container.querySelector('#businessTypesTiles')).not.toBeNull()
    const tile = view.getByText('Groceries').closest('button')
    expect(tile).toHaveAttribute('type', 'button')
    // implementation notes B3: the tile is a base Button (its own BusinessTypeTileButton appearance: block, the theme's radius), not restyled: its
    // box is the wrapper's and its layout the content's
    expect(tile).toHaveAttribute('data-slot', 'button')
    expect(tile).toHaveAttribute('aria-pressed', 'true')
    expect(tile).toHaveClass('ui:rounded-(--ui-business-type-tile-radius)')
    expect(tile.children).toHaveLength(1)
    expect([...tile.firstElementChild.children].map((child) => child.className.split(' ').find((name) => name.startsWith('type-')))).toEqual(['type-image', 'type-name'])
    expect(tile.querySelector('img')).toHaveAttribute('src', '/groceries.png')
    expect(view.getByText('Pharmacy').closest('button')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(view.getByText('Pharmacy'))
    expect(controller.onChange).toHaveBeenCalledWith(3)
  })

  it('tiles: the theme\'s sizes, radius, gaps, text, colors and the selected contour', () => {
    const theme = withBase({
      layout: 'tiles',
      image_size: 72,
      tile_width: 96,
      image_radius: 12,
      image_gap: 6,
      image_background: '#F1F1F1',
      label: { size: 13, line: 1.38, weight: 500 },
      label_color: '#555555',
      label_active_color: '#AA0000',
      image_selected_border: { width: 3, color: '#00AA00', style: 'solid' },
      gap: 14
    })
    const view = renderWithProviders(<BusinessTypes />, { theme })
    const tile = view.getByText('Groceries').closest('button')
    // the width is the wrapper's, the layout and the theme's parts the content's: the Button gets none
    expect(tight(cssFor(tile.parentElement))).toContain('width:96px;')
    const css = tight(cssFor(tile.firstElementChild))
    expect(css).toContain('gap:6px;')
    expect(css).toMatch(/\.type-image\{width:72px;height:72px;border-radius:12px;\}/)
    expect(css).toMatch(/\.type-name\{[^}]*font-size:13px;line-height:1\.38;font-weight:500;color:#555555;/)
    expect(css).toMatch(/\.type-name\{color:#AA0000;\}/)
    expect(css).toMatch(/\.type-image::after\{[^}]*border:3pxsolid#00AA00;/)
    // only the selected tile's content carries them
    const other = view.getByText('Pharmacy').closest('button').firstElementChild
    expect(tight(cssFor(other))).not.toContain('#AA0000')
    // the row writes no box over a tile's Button
    expect(tight(cssFor(view.container.querySelector('#businessTypesTiles')))).not.toContain('button{')
    expect(tight(cssFor(tile.querySelector('.type-image')))).toContain('background:#F1F1F1;')
    expect(tight(cssFor(view.container.querySelector('#businessTypesTiles')))).toContain('gap:14px;')
  })

  it('without an image: "All" its grid icon, a type of the bundle its image, another its initial', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: withBase({ layout: 'tiles' }) })
    const all = view.getByText('All').closest('button').querySelector('.type-image')
    expect(all.querySelector('svg.lucide-layout-grid')).toHaveAttribute('aria-hidden', 'true')
    expect(all.querySelector('img')).toBeNull()
    expect(view.getByText('Food').closest('button').querySelector('img')).toHaveAttribute('src', BUNDLED_IMAGES.categories.food)
    const pharmacy = view.getByText('Pharmacy').closest('button').querySelector('.type-image')
    expect(pharmacy.querySelector('img')).toBeNull()
    expect(pharmacy).toHaveTextContent('P')
  })

  it('an image that fails to load: its initial, never a broken image', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: withBase({ layout: 'pills_image' }) })
    const pill = view.getByText('Groceries').closest('button')
    fireEvent.error(pill.querySelector('img'))
    expect(pill.querySelector('img')).toBeNull()
    expect(pill.querySelector('.type-image')).toHaveTextContent('G')
  })

  it('tiles while loading: skeletons of the tile\'s image', () => {
    controller.typesState = { loading: true, error: null, types: [] }
    const view = renderWithProviders(<BusinessTypes />, { theme: withBase({ layout: 'tiles', image_size: 70 }) })
    // the image's box and the line of its name, for each of the 6
    expect(view.getAllByTestId('skeleton').length).toBe(12)
    expect(view.container.querySelector('#businessTypesTiles')).toBeNull()
  })
})
