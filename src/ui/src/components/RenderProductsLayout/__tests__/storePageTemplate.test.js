import { afterEach, describe, expect, it } from 'vitest'
import { buildAppTheme } from '~/utils/appTheme'
import { schemaDefault, schemaOptions } from '~/utils/themeSchema'
import { defaultTheme } from '../../../styles/__tests__/themeTestUtils'
import { storeCartColumn, storePageTemplate, storePageVariant } from '../storePageTemplate'

const withTemplate = (base) => ({
  ...defaultTheme,
  values: {
    ...defaultTheme.values,
    components: { ...defaultTheme.values.components, store_page: { base } }
  }
})

describe('storePageTemplate', () => {
  it('a theme without the key is the direct menu', () => {
    expect(storePageTemplate(withTemplate({}))).toBe('menu_index')
  })

  it('a value it does not know falls to the direct menu', () => {
    expect(storePageTemplate(withTemplate({ template: 'grid' }))).toBe('menu_index')
    expect(storePageTemplate(withTemplate({ template: null }))).toBe('menu_index')
  })

  it('reads each value the theme forces', () => {
    expect(storePageTemplate(withTemplate({ template: 'menu_index' }))).toBe('menu_index')
    expect(storePageTemplate(withTemplate({ template: 'classic' }))).toBe('classic')
    expect(storePageTemplate(withTemplate({ template: 'showcase' }))).toBe('showcase')
    expect(storePageTemplate(withTemplate({ template: 'menu_index_no_cart' }))).toBe('menu_index_no_cart')
  })
})

// What the app's own theme (the engine's buildAppTheme, with the schema and the compiled theme of this checkout) says
// for the key.
describe('store_page.base.template, read from the engine\'s theme', () => {
  const built = (base) => buildAppTheme(null, { version: 2, values: { components: { store_page: { base } } } })

  it('the schema default is menu_index and classic and showcase reach the helper', () => {
    expect(schemaDefault('components.store_page.base.template')).toBe('menu_index')
    expect(storePageTemplate(built({}))).toBe('menu_index')
    expect(storePageTemplate(built({ template: 'classic' }))).toBe('classic')
    expect(storePageTemplate(built({ template: 'showcase' }))).toBe('showcase')
  })

  // the schema (the compiled one, which the engine completes the theme with) lists the fourth design, so a saved
  // `menu_index_no_cart` is read as it is and not cut back to the default
  it('menu_index_no_cart is an option of the schema and survives completing the theme', () => {
    expect(schemaOptions('components.store_page.base.template')).toEqual(['menu_index', 'classic', 'showcase', 'menu_index_no_cart'])
    expect(storePageTemplate(built({ template: 'menu_index_no_cart' }))).toBe('menu_index_no_cart')
  })
})

describe('storePageVariant', () => {
  const classic = withTemplate({ template: 'classic' })
  const showcase = withTemplate({ template: 'showcase' })
  const menu = withTemplate({ template: 'menu_index' })

  it('maps the template to its design', () => {
    expect(storePageVariant(menu, {})).toBe('menu')
    expect(storePageVariant(showcase, {})).toBe('showcase')
    expect(storePageVariant(classic, {})).toBe('cover')
    expect(storePageVariant(withTemplate({ template: 'menu_index_no_cart' }), {})).toBe('menu')
  })

  it('the kiosk keeps its own layout with the fourth design too', () => {
    expect(storePageVariant(withTemplate({ template: 'menu_index_no_cart' }), { useKioskApp: true })).toBeNull()
  })

  it('only menu_index_no_cart has no cart column, unless the theme hides the header\'s cart', () => {
    for (const template of ['menu_index', 'classic', 'showcase']) expect(storeCartColumn(withTemplate({ template }))).toBe(true)
    expect(storeCartColumn(withTemplate({}))).toBe(true)
    const noColumn = withTemplate({ template: 'menu_index_no_cart' })
    expect(storeCartColumn(noColumn)).toBe(false)
    const hiddenCart = { ...noColumn, values: { ...noColumn.values, visibility: { ...noColumn.values.visibility, 'header.cart': false } } }
    expect(storeCartColumn(hiddenCart)).toBe(true)
  })

  it('a groceries store (parent category on or off) gets the same design as a food store', () => {
    const groceries = { front_layout: 'groceries' }
    const parentCategory = { use_parent_category: { value: '1' } }
    for (const theme of [menu, classic, showcase]) {
      expect(storePageVariant(theme, { business: groceries, configs: parentCategory })).toBe(storePageVariant(theme, { business: { front_layout: 'food' } }))
      expect(storePageVariant(theme, { business: groceries, configs: {} })).toBe(storePageVariant(theme, {}))
    }
  })

  it('the kiosk keeps its own layout whatever the theme says', () => {
    expect(storePageVariant(showcase, { useKioskApp: true })).toBeNull()
    expect(storePageVariant(classic, { useKioskApp: true })).toBeNull()
  })
})

// Development only: `?store_template=` forces a design (the condition is `import.meta.env.DEV`, which the build
// replaces with false: the build check is in the session's evidence, not here).
describe('the dev query parameter', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))
  const at = (search) => window.history.replaceState({}, '', `/store/x${search}`)

  it('forces each design over what the theme says', () => {
    const theme = withTemplate({ template: 'menu_index' })
    for (const forced of ['classic', 'showcase', 'menu_index', 'menu_index_no_cart']) {
      at(`?store_template=${forced}`)
      expect(storePageTemplate(theme)).toBe(forced)
    }
    at('?store_template=classic')
    expect(storePageVariant(theme, {})).toBe('cover')
  })

  it('a value it does not know is ignored: the theme decides', () => {
    at('?store_template=grid')
    expect(storePageTemplate(withTemplate({ template: 'showcase' }))).toBe('showcase')
  })

  it('without the parameter the theme decides', () => {
    at('')
    expect(storePageTemplate(withTemplate({ template: 'classic' }))).toBe('classic')
  })
})
