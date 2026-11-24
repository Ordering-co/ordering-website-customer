import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessProductsCategories } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div data-testid='auto-scroll'>{children}</div>
}))

vi.mock('~components/components/BusinessProductsCategories', () => ({
  BusinessProductsCategories: ({ UIComponent, ...rest }) => (
    <UIComponent
      categories={[{ id: 1, name: 'Drinks' }, { id: 2, name: 'Food' }]}
      categorySelected={{ id: 1, name: 'Drinks' }}
      handlerClickCategory={vi.fn()}
      business={businessFixture}
      isSkeleton={false}
      {...rest}
    />
  )
}))

describe('BusinessProductsCategories', () => {
  beforeEach(() => {
    const style = document.createElement('style')
    style.id = 'styles'
    Object.defineProperty(style, 'sheet', {
      value: {
        cssRules: [],
        insertRule: vi.fn(),
        deleteRule: vi.fn()
      }
    })
    document.head.appendChild(style)
  })

  afterEach(() => {
    document.getElementById('styles')?.remove()
  })

  it('renders category tabs', () => {
    const { getByText } = renderWithProviders(<BusinessProductsCategories />)
    expect(getByText('Drinks')).toBeInTheDocument()
    expect(getByText('Food')).toBeInTheDocument()
  })

  it('its tabs are the bar\'s own (category_tabs.scope.tabs) over the global ones', () => {
    const theme = themeWithValues((values) => {
      const global = values.components.tabs
      values.components.tabs = {
        ...global,
        base: { ...global.base, variant: 'plain' },
        variants: { ...global.variants, plain: { ...global.variants.plain, border: { width: 1, color: '#2F3032', style: 'solid' }, gap: 8 } }
      }
      values.components.category_tabs = {
        ...values.components.category_tabs,
        scope: { tabs: { ...values.components.tabs, variants: { ...values.components.tabs.variants, plain: { ...values.components.tabs.variants.plain, border: null, gap: 20 } } } }
      }
      return values
    })
    const { container } = renderWithProviders(<BusinessProductsCategories />, { theme })
    const track = container.querySelector('[data-slot=tabs-navigation]')
    expect(track.style.getPropertyValue('--ui-tabs-gap')).toBe('20px')
    expect(track.style.getPropertyValue('--ui-tabs-border')).toBe('none')
  })

  it('the bar and its tabs of the category_tabs.slots.tabs size and style', () => {
    const theme = themeWithValues((values) => {
      const tabs = values.components.tabs
      values.components.tabs = {
        ...tabs,
        base: { ...tabs.base, variant: 'plain' },
        sizes: { ...tabs.sizes, lg: { height: 48, padding_x: 16, icon_size: 24 } },
        variants: { ...tabs.variants, pill: { ...tabs.variants.pill, inset: 4, border: null } }
      }
      values.components.category_tabs = {
        ...values.components.category_tabs,
        scope: {},
        slots: { tabs: { component: 'tabs', size: 'lg', variant: 'pill' } }
      }
      return values
    })
    const { container, getByText } = renderWithProviders(<BusinessProductsCategories />, { theme })
    const track = container.querySelector('[data-slot=tabs-navigation]')
    expect(track.style.getPropertyValue('--ui-tabs-height')).toBe('48px')
    expect(track.style.getPropertyValue('--ui-tabs-inset')).toBe('4px')
    // the tab: the bar less its inset
    expect(track.style.getPropertyValue('--ui-tabs-action-height')).toBe('40px')
    expect(getByText('Drinks').closest('button')).toHaveAttribute('data-slot', 'tabs-action')
  })

  it('a bar with a border: its tabs are the size less that border on top and bottom', () => {
    const theme = themeWithValues((values) => {
      const tabs = values.components.tabs
      values.components.tabs = {
        ...tabs,
        sizes: { ...tabs.sizes, lg: { height: 48, padding_x: 16, icon_size: 24 } },
        variants: { ...tabs.variants, plain: { ...tabs.variants.plain, border: null } }
      }
      values.components.category_tabs = {
        ...values.components.category_tabs,
        base: { ...values.components.category_tabs.base, border: { width: 2, color: '#2F3032', style: 'solid' } },
        scope: {},
        slots: { tabs: { component: 'tabs', size: 'lg', variant: 'plain' } }
      }
      return values
    })
    const { container } = renderWithProviders(<BusinessProductsCategories />, { theme })
    // The track subtracts the outer border on top and bottom from the size.
    const track = container.querySelector('[data-slot=tabs-navigation]')
    expect(track.style.getPropertyValue('--ui-tabs-section-rim')).toBe('2px')
    expect(track.style.getPropertyValue('--ui-tabs-height')).toBe('48px')
    expect(track.style.getPropertyValue('--ui-tabs-action-height')).toBe('44px')
  })
})
