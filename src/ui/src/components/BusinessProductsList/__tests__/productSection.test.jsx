import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ProductsListing, WrapAllCategories, productsGridCss } from '../styles'
import { WrapAllCategories as FeaturedSection } from '../../RenderProductsLayout/styles'
import { ContentHeader, ProductList as OrderItAgainList } from '../../OrderItAgain/styles'
import { CategoriesContainer, CategoriesScrollport, categoriesMenuIconOf, showAllCategory } from '../../BusinessProductsCategories/styles'

// A section of products of the business page (components.product_section)
// and the category bar's new props (components.category_tabs).

const flat = (rules) => [].concat(rules).flat(Infinity).join('').replace(/\s+/g, '')
const css = (theme, element) => cssFor(renderWith(theme, element).container.firstChild)

const section = (base) => themeWithValues((values) => {
  Object.assign(values.components.product_section.base, base)
  return values
})

describe('product_section: the grid of a category', () => {
  it('by default 1 column on phones (its platforms.mobile_web value), 2 from 576px, 3 from 1000px and the md gap', () => {
    const theme = themeWithValues()
    const grid = flat(productsGridCss(theme, false))
    expect(grid).toContain(`gap:${theme.values.tokens.space.md}px`)
    expect(grid).toContain('grid-template-columns:repeat(1,minmax(0,1fr))')
    expect(grid).toMatch(/@media\(min-width:576px\)\{grid-template-columns:repeat\(2,/)
    expect(grid).toMatch(/@media\(min-width:1000px\)\{grid-template-columns:repeat\(3,/)
  })

  it('its columns per width and its gap', () => {
    const theme = themeWithValues((values) => {
      Object.assign(values.components.product_section.base, { columns: 4, columns_tablet: 3, gap: 20 })
      values.platforms.mobile_web.components.product_section.base.columns = 2
      return values
    })
    const grid = flat(productsGridCss(theme, false))
    expect(grid).toContain('gap:20px')
    expect(grid).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(grid).toMatch(/min-width:576px\)\{grid-template-columns:repeat\(3,/)
    expect(grid).toMatch(/min-width:1000px\)\{grid-template-columns:repeat\(4,/)
    // with the cart beside the list: the tablet columns from 576px, never the desktop ones
    const withCart = flat(productsGridCss(section({ columns: 4, columns_tablet: 3 }), true))
    expect(withCart).toMatch(/min-width:576px\)\{grid-template-columns:repeat\(3,/)
    expect(withCart).not.toContain('min-width:1000px')
  })

  it('the space below a category: margin_bottom', () => {
    expect(css(section({ margin_bottom: 32 }), <ProductsListing />)).toMatch(/margin-bottom: ?32px/)
  })
})

describe('product_section: the titles of the sections (section titles of components.section_header)', () => {
  const theme = themeWithValues((values) => {
    Object.assign(values.components.product_section.base, { image_size: 48, image_radius: 4 })
    Object.assign(values.components.section_header.base, { title_color: '#AA0000' })
    return values
  })

  it('a category: its title color and the size and radius of its image', () => {
    const rules = css(theme, <WrapAllCategories />)
    expect(rules).toMatch(/h2\{[^}]*color: ?#AA0000/)
    expect(rules).toMatch(/img\{[^}]*width: ?48px[^}]*border-radius: ?4px/)
  })

  it('the featured products and order it again: the same title', () => {
    expect(css(theme, <FeaturedSection />)).toMatch(/h2\{[^}]*color: ?#AA0000/)
    expect(css(theme, <ContentHeader />)).toMatch(/h2\{[^}]*color: ?#AA0000/)
  })

  it('order it again: carousel_item_width from 768px (350px by default)', () => {
    expect(css(themeWithValues(), <OrderItAgainList />)).toMatch(/width: ?350px/)
    expect(css(section({ carousel_item_width: 280 }), <OrderItAgainList />)).toMatch(/width: ?280px/)
  })
})

describe('category_tabs: the menu, "All", padding and sticky shadow', () => {
  const tabs = (base) => themeWithValues((values) => {
    Object.assign(values.components.category_tabs.base, base)
    return values
  })

  const hiding = (key) => themeWithValues((values) => {
    values.visibility[key] = false
    return values
  })

  it('the menu icon: bars by default, bars_right; no menu with visibility business.categories.menu false', () => {
    expect(categoriesMenuIconOf(themeWithValues()).name).toBe('menuBars')
    expect(categoriesMenuIconOf(tabs({ menu_icon: 'bars_right' }))).toEqual({ name: 'menuAltRight' })
    expect(categoriesMenuIconOf(hiding('business.categories.menu'))).toBeNull()
  })

  it('"All": by default, not with visibility business.categories.all false', () => {
    expect(showAllCategory(themeWithValues())).toBe(true)
    expect(showAllCategory(hiding('business.categories.all'))).toBe(false)
  })

  it('the scrollport reads the bar\'s padding at its sides', () => {
    expect(css(tabs({ padding: 8 }), <CategoriesScrollport />)).toMatch(/padding-left: ?8px;padding-right: ?8px/)
  })

  it('fixed on scroll: sticky_shadow, cast down', () => {
    const theme = tabs({ sticky_shadow: { x: 0, y: 6, blur: 12, spread: 0, color: '#000000', opacity: 0.2 } })
    const rules = css(theme, <CategoriesContainer $fullWidthSticky className='sticky-prod-cat' />)
    expect(rules).toMatch(/\.sticky-prod-cat\{[^}]*box-shadow: ?0px 6px 12px 0px rgba\(0,\s?0,\s?0,\s?0\.2\)/)
  })
})
