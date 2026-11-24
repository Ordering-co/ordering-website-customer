import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { UpsellingPage } from '../index'
import { CloseAction, CloseUpselling, Container, Details, HorizontalDetails, HorizontalUpsellingContainer, Image, Item } from '../styles'

// implementation notesno fixed px in the layout. The product window is the store's
// (product_modal.base.width), the card's measures are ch and a multiple of the
// theme's xl size, the thumbnail reserves a square.
const modalProps = vi.hoisted(() => ({ last: null }))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div /> }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => <div /> }))
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: (props) => { modalProps.last = props; return <div data-testid='product-modal' /> }
}))
vi.mock('~ui/src/components/AutoScroll', () => ({ AutoScroll: ({ children }) => <div>{children}</div> }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: ({ children }) => <div>{children}</div> }))
vi.mock('~components/components/UpsellingPage', () => ({
  UpsellingPage: ({ UIComponent, ...rest }) => (
    <UIComponent
      upsellingProducts={{ products: [{ id: 1, name: 'Burger', price: 9, images: 'b.jpg' }], loading: false, error: null }}
      handleUpsellingPage={() => {}}
      openUpselling
      canOpenUpselling
      business={{ id: 1, slug: 'x' }}
      {...rest}
    />
  )
}))

const flat = (css) => css.replace(/\s+/g, '')

describe('UpsellingPage fluid layout', () => {
  it('the product window takes no width of its own: it is the store\'s', () => {
    const { getByRole } = renderWithProviders(<UpsellingPage />, { theme: themeWithValues() })
    fireEvent.click(getByRole('button', { name: 'Add' }))
    expect(modalProps.last).not.toBeNull()
    expect(modalProps.last.width).toBeUndefined()
  })

  it('the thumbnail has no fixed pixel attributes', () => {
    const { container } = renderWithProviders(<UpsellingPage />, { theme: themeWithValues() })
    const img = container.querySelector('img')
    expect(img).not.toHaveAttribute('width')
    expect(img).not.toHaveAttribute('height')
  })

  it('the vertical card, the rail and the details are in ch and theme multiples', () => {
    const item = renderWith(themeWithValues(), <Item>card</Item>)
    expect(flat(cssFor(item.getByText('card')))).toContain('min-width:min(100%,19ch)')
    const image = renderWith(themeWithValues(), <Image><img alt='' /></Image>)
    expect(flat(cssFor(image.container.firstChild))).toContain('aspect-ratio:1/1')
    const rail = renderWith(themeWithValues(), <HorizontalUpsellingContainer>rail</HorizontalUpsellingContainer>)
    expect(flat(cssFor(rail.getByText('rail')))).toContain('min-height:calc(3.4*56px)')
    const details = renderWith(themeWithValues(), <HorizontalDetails fromCartPopover>det</HorizontalDetails>)
    const css = flat(cssFor(details.getByText('det')))
    expect(css).toContain('min-width:12ch')
    expect(css).toContain('max-width:16ch')
  })
})

// implementation notesthe actions are sized by their slot (or by the Button's own props); no rule of a container reaches a Button
describe('UpsellingPage: no container writes a size over a Button', () => {
  const css = (ui) => {
    const view = renderWith(themeWithValues(), ui)
    const text = cssFor(view.getByTestId('x')).replace(/\s+/g, '')
    view.unmount()
    return text
  }

  it('"No, Thanks" takes 90% of the dialog (40% from 720px) in its slot, which centers it', () => {
    const slot = css(<CloseAction data-testid='x' />)
    expect(slot).toMatch(/width:90%;/)
    expect(slot).toMatch(/@media\(min-width:720px\)\{[^}]*width:40%;/)
    expect(css(<CloseUpselling data-testid='x' />)).not.toMatch(/button|width:(90|40)%/)
  })

  it('the cards and the page container leave the Add Button its own width', () => {
    expect(css(<Container data-testid='x' />)).not.toMatch(/button|46%/)
    expect(css(<Details data-testid='x' />)).toMatch(/button\{margin:[^}]*;\}/)
    expect(css(<Details data-testid='x' />)).not.toMatch(/button\{[^}]*width/)
  })
})
