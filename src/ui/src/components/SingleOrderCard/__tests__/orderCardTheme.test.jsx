import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder, pastOrder, getOrderStatus } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { SingleOrderCard } from '../index'

// The texts and the actions of an order card from components.order_card
vi.mock('~components/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={pastOrder}
      pastOrders
      getOrderStatus={getOrderStatus}
      handleReorder={vi.fn()}
      onRedirectPage={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('../../OrderDetails/OrderEta', () => ({ OrderEta: () => 'in 20 min' }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({ DialogOverlay: ({ open, title, children }) => open ? <div>{title}{children}</div> : null }))
vi.mock('~ui/src/components/Confirm', () => ({ Confirm: () => null }))
vi.mock('~ui/src/components/ReviewOrder', () => ({ ReviewOrder: () => null }))
vi.mock('~ui/src/components/ReviewProduct', () => ({ ReviewProduct: () => null }))
vi.mock('~ui/src/components/ReviewDriver', () => ({ ReviewDriver: () => null }))

const THEMED = {
  name: { size: 23, line: 1.43, weight: 700 },
  name_color: '#101112',
  meta: { size: 17, line: 1.47, weight: 400 },
  meta_color: '#202122',
  status_color: '#303132',
  total: { size: 19, line: 1.42, weight: 400 },
  total_color: '#404142'
}
const themed = (mutate = (values) => values) => themeWithValues((values) => {
  values.components.order_card.base = { ...values.components.order_card.base, ...THEMED }
  return mutate(values)
})

const render = (theme, props = {}) => renderWithProviders(<SingleOrderCard {...props} />, { theme })
const flat = (el) => cssFor(el).replace(/\s+/g, '')
// the piece writes components.button on its own element (jsdom does not compile Tailwind)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

describe('SingleOrderCard: components.order_card', () => {
  it('the name, the facts and the status of its texts and colors', () => {
    const { container, getByRole } = render(themed())
    const card = container.querySelector('#order-card')
    const css = flat(card)
    expect(css).toMatch(/h3\{(?:font-family:[^;]*;)?font-size:23px;line-height:1\.43;font-weight:700;color:#101112;\}/)
    expect(css).toMatch(/\.orders-detailp,[^{]+p\{(?:font-family:[^;]*;)?font-size:17px;line-height:1\.47;font-weight:400;color:#202122;\}/)
    expect(css).toMatch(/\.order-status\{color:#303132;\}/)
    // (jsdom cascades by source order only: the rules are read, and these
    // elements are the ones they reach)
    expect(card.querySelector('h3')).toBe(getByRole('heading', { name: 'Pizza Place' }))
    expect(container.querySelector('.orders-detail p')).toHaveClass('order-number')
  })

  it('the facts take platforms.mobile_web.meta below 576px', () => {
    const theme = themed((values) => {
      values.platforms.mobile_web.components.order_card = { base: { meta: { size: 11, line: 1.36 } } }
      return values
    })
    const { container } = render(theme)
    expect(flat(container.querySelector('#order-card'))).toMatch(/@media\(max-width:575px\)\{[^@{]*\.orders-detailp[^{]*\{(?:font-family:[^;]*;)?font-size:11px;line-height:1\.36;/)
  })

  it('the total of its text (its weight kept) and color', () => {
    const { container } = render(themed(), { order: activeOrder, pastOrders: false })
    expect(container.querySelector('.total')).not.toBeNull()
    expect(flat(container.querySelector('#order-card'))).toMatch(/\.total\{(?:font-family:[^;]*;)?font-size:19px;line-height:1\.42;font-weight:600;color:#404142;\}/)
  })

  it('review and reorder are its slots', () => {
    const theme = themed((values) => {
      values.components.order_card.slots.review = { component: 'button', size: 'sm', appearance: 'outline', color: 'primary', shape: null }
      values.components.order_card.slots.reorder = { component: 'button', size: 'lg', appearance: 'solid', color: 'danger', shape: null }
      return values
    })
    const { getByRole } = render(theme)
    expect(vars(getByRole('button', { name: 'Review' }))).toEqual(componentVars(theme, 'button', { size: 'sm', color: 'primary', appearance: 'outline' }))
    expect(vars(getByRole('button', { name: 'Reorder' }))).toEqual(componentVars(theme, 'button', { size: 'lg', color: 'danger', appearance: 'solid' }))
  })

  it('the slots are the secondary solid md buttons of today, the base Button', () => {
    const theme = themeWithValues()
    const { getByRole } = render(theme)
    ;['Review', 'Reorder'].forEach((name) => {
      const button = getByRole('button', { name })
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(vars(button)).toEqual(componentVars(theme, 'button', { size: 'md', color: 'secondary', appearance: 'solid' }))
    })
  })

  it('review and reorder are never narrower than 13ch, and sit over the title\'s cover, by their container', () => {
    const { getByRole } = render(themeWithValues())
    const reorder = getByRole('button', { name: 'Reorder' })
    const css = flat(reorder.parentElement)
    expect(css).toContain('minmax(13ch,max-content)')
    expect(css).toContain('position:relative;z-index:1;')
    // no CSS of the container targets the piece, and the piece carries no style of its own beyond the theme's
    expect(css).not.toMatch(/button\{/)
    expect(reorder.style.zIndex).toBe('')
    expect(reorder.style.minWidth).toBe('')
  })

  it('reorder keeps its name while it loads: busy and inert', () => {
    const { getByRole } = render(themeWithValues(), { reorderLoading: true })
    const reorder = getByRole('button', { name: 'Reorder' })
    expect(reorder).toHaveAttribute('aria-busy', 'true')
    expect(reorder).toHaveAttribute('aria-disabled', 'true')
  })
})
