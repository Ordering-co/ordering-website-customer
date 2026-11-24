import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder, orderListFixture } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { OrderProgress } from '../index'

const listState = vi.hoisted(() => ({ order: null, props: null }))

vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => {
    listState.props = rest
    return <UIComponent orderList={{ ...orderListFixture, orders: [listState.order] }} {...rest} />
  }
}))

// the statuses of the order: its text and percentage
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getStatusPrefix: ({ status }) => ({ 9: { value: 'On the way', percentage: 70 }, 11: { value: 'Delivered', percentage: 100 } })[status]
  })
}))

const completeTheme = themeWithValues()
const progress = completeTheme.values.components.progress

describe('OrderProgress', () => {
  it('renders in-progress order banner', () => {
    listState.order = activeOrder
    const { getByText } = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    expect(getByText('Order in progress')).toBeInTheDocument()
    expect(getByText('View Order')).toBeInTheDocument()
  })

  it('the bar is components.progress md, active while in progress', () => {
    listState.order = activeOrder
    const { getByRole } = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    const bar = getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '70')
    expect(bar).toHaveAccessibleName('On the way')
    expect(cssFor(bar)).toContain(`height:${progress.sizes.md.height}px`)
    expect(cssFor(bar)).toContain(`background:${progress.base.track}`)
    expect(cssFor(bar.firstChild)).toContain(`background:${progress.base.fill}`)
    expect(cssFor(bar.firstChild)).toMatch(/animation:\S+ 1600ms/)
  })

  it('the business of the order: an h2 (a section of the page)', () => {
    listState.order = activeOrder
    const themed = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    expect(themed.getByRole('heading', { level: 2, name: activeOrder.business.name })).toBeInTheDocument()
    expect(themed.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('complete at 100%', () => {
    listState.order = { ...activeOrder, status: 11 }
    const { getByRole } = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    const bar = getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(cssFor(bar.firstChild)).toContain(`background:${progress.variants.default.states.complete.fill}`)
  })

  it('its button opens the order shown (or the multi order page of its group)', () => {
    listState.order = activeOrder
    const { getByText, unmount } = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    expect(getByText('View Order').closest('a')).toHaveAttribute('href', '/orders/order-uuid-43')
    unmount()
    listState.order = { ...activeOrder, cart_group_id: 7 }
    const { getByText: getGrouped } = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    expect(getGrouped('View Order').closest('a')).toHaveAttribute('href', '/multi-orders/7')
  })

  it('its button is the base Button as a link: secondary solid md, named, and it opens the order without leaving the page', () => {
    listState.order = activeOrder
    const { getByRole } = renderWithProviders(<OrderProgress />, { theme: completeTheme })
    const link = getByRole('link', { name: 'View Order' })
    expect(link).toHaveAttribute('data-slot', 'button')
    const vars = Object.fromEntries(Array.from({ length: link.style.length }, (_, i) => link.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, link.style.getPropertyValue(name)]))
    expect(vars).toEqual(componentVars(completeTheme, 'button', { size: 'md', color: 'secondary', appearance: 'solid' }))
    // handleOpenOrder prevents the navigation and emits go_to_page
    expect(fireEvent.click(link)).toBe(false)
  })

  it('asks for created_at with the delivery time and the ETA fields', () => {
    listState.order = activeOrder
    renderWithProviders(<OrderProgress />, { theme: completeTheme })
    expect(listState.props.propsToFetch).toEqual(expect.arrayContaining(['delivery_datetime_utc', 'created_at', 'eta_time']))
  })
})
