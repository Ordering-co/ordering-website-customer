import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { HeaderOption } from '../index'
import { HeaderCartButton } from '../HeaderCartButton'
import { scopedTheme } from '~/utils/themeGroups'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

const varsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

describe('HeaderOption', () => {
  it('renders cart count badge', () => {
    const onClick = vi.fn()
    const { getByText, container } = renderWithProviders(
      <HeaderOption variant='cart' totalCarts={2} onClick={onClick} />
    )
    expect(getByText('2')).toBeInTheDocument()
    fireEvent.click(container.firstChild)
    expect(onClick).toHaveBeenCalledWith('cart')
  })

  it('renders default address prompt when address state is empty', () => {
    const { getByText } = renderWithProviders(
      <HeaderOption variant='address' addressState='' onClick={vi.fn()} />
    )
    expect(getByText("What's your address?")).toBeInTheDocument()
  })

  it('the address keeps its full text as the title when "…" cuts it', () => {
    const { container } = renderWithProviders(
      <HeaderOption variant='address' addressState='316 West Washington Street, Apt 4B' onClick={vi.fn()} />
    )
    expect(container.firstChild.getAttribute('title')).toBe('316 West Washington Street, Apt 4B')
  })

  it('the address keeps its pin as a decorative Lucide glyph', () => {
    const { container } = renderWithProviders(<HeaderOption variant='address' addressState='Main St' onClick={vi.fn()} />)
    expect(container.querySelector('svg')).toHaveClass('lucide-map-pin')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('header.cart_count: the theme hides the count, the icon stays; the default shows it', () => {
    const theme = themeWithValues((values) => {
      values.visibility['header.cart_count'] = false
      return values
    })
    const hidden = renderWithProviders(<HeaderOption variant='cart' totalCarts={2} onClick={vi.fn()} />, { theme })
    expect(hidden.queryByText('2')).toBeNull()
    expect(hidden.container.querySelector('svg')).toHaveClass('lucide-shopping-basket')
    hidden.unmount()
    const shown = renderWithProviders(<HeaderOption variant='cart' totalCarts={2} onClick={vi.fn()} />, { theme: themeWithValues() })
    expect(shown.getByText('2')).toBeInTheDocument()
  })

  describe('the cart count is a badge on the icon', () => {
    const badgeOf = (container) => container.querySelector('button > span > span')

    it('shows the number as a badge, hidden from assistive technology, and the button\'s name carries it', () => {
      const { getByRole, container } = renderWithProviders(<HeaderOption variant='cart' totalCarts={3} onClick={vi.fn()} />)
      expect(badgeOf(container)).toHaveTextContent('3')
      expect(badgeOf(container)).toHaveAttribute('aria-hidden', 'true')
      expect(getByRole('button', { name: 'My cart (3)' })).toBeInTheDocument()
      expect(getByRole('button')).toHaveAttribute('data-slot', 'button')
      expect(getByRole('button').className).toContain('ui:w-(--ui-button-height)')
    })

    it('reads 99+ from 100 units, and its name keeps the real number', () => {
      const { getByRole, container, rerender } = renderWithProviders(<HeaderOption variant='cart' totalCarts={99} onClick={vi.fn()} />)
      expect(badgeOf(container)).toHaveTextContent(/^99$/)
      rerender(<HeaderOption variant='cart' totalCarts={100} onClick={vi.fn()} />)
      expect(badgeOf(container)).toHaveTextContent(/^99\+$/)
      expect(getByRole('button', { name: 'My cart (100)' })).toBeInTheDocument()
    })

    // implementation notesthe badge hung 4px past the button, so the group's end edge sat 16px from the page's side, not 20px
    it('hangs above the button but never past its end edge', () => {
      const { container } = renderWithProviders(<HeaderOption variant='cart' totalCarts={3} onClick={vi.fn()} />)
      const style = getComputedStyle(badgeOf(container))
      expect(parseFloat(style.insetInlineEnd)).toBe(0)
      expect(style.top).not.toMatch(/^0(px)?$/)
    })

    it('without units there is no badge and the name is plain', () => {
      const { getByRole, container } = renderWithProviders(<HeaderOption variant='cart' totalCarts={0} onClick={vi.fn()} />)
      expect(badgeOf(container)).toBeNull()
      expect(getByRole('button', { name: 'My cart' })).toBeInTheDocument()
    })

    it('paints with the theme: the primary fill, its on_primary text and the count shape\'s radius, in each theme', () => {
      const themes = [themeWithValues(), themeWithValues((values) => {
        // (the stored theme comes resolved: the component says what its token holds)
        values.tokens.color.primary = values.components.badge.variants.primary.background = '#0b5d3b'
        values.tokens.color.on_primary = values.components.badge.variants.primary.color = '#fefefe'
        return values
      })]
      themes.forEach((theme) => {
        const { container, unmount } = renderWithProviders(<HeaderOption variant='cart' totalCarts={3} onClick={vi.fn()} />, { theme })
        const style = getComputedStyle(badgeOf(container))
        const probe = document.createElement('span')
        probe.style.cssText = `background: ${theme.values.tokens.color.primary}; color: ${theme.values.tokens.color.on_primary};`
        document.body.appendChild(probe)
        expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor)
        expect(style.color).toBe(getComputedStyle(probe).color)
        expect(style.position).toBe('absolute')
        expect(style.borderRadius).toBe(theme.css.components.badge.shapes.count.radius)
        probe.remove()
        unmount()
      })
    })
  })

  describe('the cart is a base icon Button of header.slots.cart', () => {
    const slotTheme = themeWithValues((values) => {
      values.components.header.slots = { ...values.components.header.slots, cart: { component: 'button', size: 'lg', color: 'primary', appearance: 'solid' } }
      return values
    })

    it('is named, keeps data-doc-control and its action, and its basket is decorative', () => {
      const onClick = vi.fn()
      const { getByRole } = renderWithProviders(<HeaderOption variant='cart' totalCarts={0} onClick={onClick} />, { theme: slotTheme })
      const cart = getByRole('button', { name: 'My cart' })
      expect(cart).toHaveAttribute('data-slot', 'button')
      expect(cart).toHaveAttribute('data-doc-control', 'cart-open')
      expect(cart.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      fireEvent.click(cart)
      expect(onClick).toHaveBeenCalledWith('cart')
    })

    it('takes the slot\'s color, appearance and size; the icon shape with and without a count', () => {
      const none = renderWithProviders(<HeaderOption variant='cart' totalCarts={0} onClick={vi.fn()} />, { theme: slotTheme })
      expect(varsOf(none.getByRole('button'))).toEqual(componentVars(scopedTheme(slotTheme, 'header'), 'button', { size: 'lg', shape: 'icon', color: 'primary', appearance: 'solid' }))
      expect(none.getByRole('button').className).toContain('ui:w-(--ui-button-height)')
      none.unmount()
      const counted = renderWithProviders(<HeaderOption variant='cart' totalCarts={3} onClick={vi.fn()} />, { theme: slotTheme })
      expect(varsOf(counted.getByRole('button'))).toEqual(componentVars(scopedTheme(slotTheme, 'header'), 'button', { size: 'lg', shape: 'icon', color: 'primary', appearance: 'solid' }))
      expect(counted.getByRole('button').className).toContain('ui:w-(--ui-button-height)')
      expect(counted.getByText('3')).toBeInTheDocument()
    })

    it('without a slot it is the neutral ghost md button; without an action it is disabled', () => {
      const bare = themeWithValues((values) => { delete values.components.header.slots; return values })
      const { getByRole } = renderWithProviders(<HeaderOption variant='cart' totalCarts={0} />, { theme: bare })
      expect(varsOf(getByRole('button'))).toEqual(componentVars(scopedTheme(bare, 'header'), 'button', { size: 'md', shape: 'icon', color: 'neutral', appearance: 'ghost' }))
      expect(getByRole('button')).toBeDisabled()
    })

    it('HeaderCartButton passes the preload handlers, the id and the ref to the button', () => {
      const onPointerEnter = vi.fn()
      const ref = React.createRef()
      const { getByRole } = renderWithProviders(<HeaderCartButton id='x' ref={ref} aria-label='Cart' onPointerEnter={onPointerEnter} />)
      fireEvent.pointerEnter(getByRole('button'))
      expect(onPointerEnter).toHaveBeenCalled()
      expect(ref.current).toBe(getByRole('button'))
      expect(ref.current.id).toBe('x')
    })
  })
})
