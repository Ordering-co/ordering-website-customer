import React from 'react'
import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import { defaultTheme, injectedCss, renderWith, themeWithValues } from './themeTestUtils'
import { renderWithProviders } from '../../../../__tests__/helpers/testUtils'
import { LAYER_BACKGROUND, layerBackground, layerBackgroundCss } from '../Layer'
import { DialogOverlay, SheetOverlay } from '../../components/Overlay/overlays'
import { PopupContent } from '../../components/Confirm/styles'
import { PopoverBody as CartPopoverBody } from '../../components/CartPopover/styles'
import { PopoverPanel } from '../../design-system/components/Popover'
import { SidebarContent as CartSidebarContent } from '../../components/CartSidebar/styles'
import { SidebarContent as SidebarMenuContent } from '../../components/SidebarMenu/styles'
import { Container as SearchProductsLayer, SearchContainer, BusinessProductsListContainer } from '../../components/SearchProducts/styles'
import { ButtonWrapper as MomentButtons, TimeItem } from '../../components/MomentControl/styles'
import { Send as ReviewOrderSend } from '../../components/ReviewOrder/styles'
import { Send as ReviewDriverSend } from '../../components/ReviewDriver/styles'
import { ActionBlock as ReviewProductActions } from '../../components/ReviewProduct/styles'
import { ActionsForm } from '../../components/UserFormDetails/styles'
import { ButtonWrapper as ProfessionalButtons } from '../../components/ProfessionalProfile/styles'
import { BusinessContent } from '../../components/BusinessInformation/styles'

// The page canvas is the background; a floating layer is of the surface (or
// its component's background). A bar shown both on a page and in a floating
// layer is of the layer it is in.
const PAGE = '#FAFAFA'
const SURFACE = '#111111'
const MODAL = '#222222'
const theme = themeWithValues((values) => {
  values.tokens.color.background = PAGE
  values.tokens.color.surface = SURFACE
  values.components.menu.base.background = SURFACE
  values.components.cart.base.background = SURFACE
  values.components.modal.base.background = SURFACE
  values.components.sidebar_menu.base.background = SURFACE
  return values
})

const DECLARED = new RegExp(`${LAYER_BACKGROUND}:\\s*([^;}]+)`)
const PAINTED = new RegExp(`var\\(${LAYER_BACKGROUND},\\s*([^)]+)\\)`)
// The rules of every class of the element (the modal's dialog carries its
// own class names after the generated one)
const ownCss = (el) => {
  const rules = injectedCss().split('}')
  return Array.from(el.classList || [])
    .map((cls) => rules.filter((rule) => new RegExp(`\\.${cls.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')}(?![\\w-])`).test(rule)).join('}'))
    .join('}')
}

// What `var(--layer-background, …)` of the element paints, as a browser
// resolves it: the value of the nearest box (itself or up) that declares the
// property, else the var's fallback (the page background, which the body
// declares too: the global styles are not injected under jsdom).
const layerOf = (el) => {
  const painted = ownCss(el).match(PAINTED)
  if (!painted) return null
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const declared = ownCss(node).match(DECLARED)
    if (declared) return declared[1].trim()
    // a base piece's portal says it in its style, as a variable of its own (`var(--ui-modal-background)`)
    const inline = node.style?.getPropertyValue(LAYER_BACKGROUND)
    if (inline) return inline.replace(/^var\((--[\w-]+)\)$/, (_, name) => node.style.getPropertyValue(name)).trim()
  }
  return painted[1].trim()
}

const BARS = [
  ['the moment control actions', MomentButtons],
  ['a catering time', (props) => <TimeItem cateringPreorder {...props} />],
  ['the review order send bar', ReviewOrderSend],
  ['the review driver send bar', ReviewDriverSend],
  ['the review product actions', ReviewProductActions],
  ['the user form actions', ActionsForm],
  ['the professional profile actions', ProfessionalButtons],
  ['the business information content', BusinessContent]
]

describe('layerBackground', () => {
  it('the layer the element is in, the page background where none says it', () => {
    expect(layerBackground(theme)).toBe(`var(--layer-background, ${PAGE})`)
    expect(layerBackground(defaultTheme)).toBe('var(--layer-background, #FFFFFF)')
  })

  it('a layer declares its background; an unsafe value declares nothing', () => {
    expect(layerBackgroundCss(SURFACE)).toBe(`--layer-background: ${SURFACE};`)
    expect(layerBackgroundCss('red; } body { color: red')).toBe('')
    expect(layerBackgroundCss(undefined)).toBe('')
  })
})

describe('a bar shown on a page and in a floating layer', () => {
  it.each(BARS)('%s: on the page, of the page background', (_, Bar) => {
    const { getByTestId } = renderWith(theme, <main><Bar data-testid='bar' /></main>)
    expect(layerOf(getByTestId('bar'))).toBe(PAGE)
  })

  // implementation notesthe base Dialog and Sheet are layers as the legacy Modal was
  it.each(BARS)('%s: in a dialog, of the modal\'s background', async (_, Bar) => {
    renderWithProviders(<DialogOverlay open onClose={() => {}}><Bar data-testid='bar' /></DialogOverlay>, { theme })
    await waitFor(() => expect(document.querySelector('[data-testid="bar"]')).not.toBeNull())
    expect(layerOf(document.querySelector('[data-testid="bar"]'))).toBe(SURFACE)
  })

  it('in a sheet, of the modal\'s background', async () => {
    renderWithProviders(<SheetOverlay open onClose={() => {}}><ActionsForm data-testid='bar' /></SheetOverlay>, { theme })
    await waitFor(() => expect(document.querySelector('[data-testid="bar"]')).not.toBeNull())
    expect(layerOf(document.querySelector('[data-testid="bar"]'))).toBe(SURFACE)
  })

  it('in a dialog of a background of its own (components.modal), of that one', async () => {
    const own = themeWithValues((values) => {
      values.tokens.color.background = PAGE
      values.components.modal.base.background = MODAL
      return values
    })
    renderWithProviders(<DialogOverlay open onClose={() => {}}><ActionsForm data-testid='bar' /></DialogOverlay>, { theme: own })
    await waitFor(() => expect(document.querySelector('[data-testid="bar"]')).not.toBeNull())
    expect(layerOf(document.querySelector('[data-testid="bar"]'))).toBe(MODAL)
  })

  it.each([
    ['the confirm dialog', PopupContent],
    ['the cart popover', CartPopoverBody],
    ['the categories popover', (props) => <PopoverPanel variant='arrow' {...props} />],
    ['the cart side panel', CartSidebarContent],
    ['the side menu', SidebarMenuContent],
    ['the product search', SearchProductsLayer]
  ])('in %s, of the surface', (_, Layer) => {
    const { getByTestId } = renderWith(theme, <Layer><MomentButtons data-testid='bar' /></Layer>)
    expect(layerOf(getByTestId('bar'))).toBe(SURFACE)
  })
})

describe('the product search', () => {
  it('opens over the page: its bar and its results are of the surface', () => {
    const { getByTestId } = renderWith(theme, (
      <SearchProductsLayer>
        <SearchContainer data-testid='bar' />
        <BusinessProductsListContainer data-testid='results' />
      </SearchProductsLayer>
    ))
    expect(layerOf(getByTestId('bar'))).toBe(SURFACE)
    expect(layerOf(getByTestId('results'))).toBe(SURFACE)
  })
})
