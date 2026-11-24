import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder, sampleBusiness } from '../../__tests__/helpers/ordersTestMocks'
import { MultiOrdersDetails } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeMedia } from '~/utils/themeTokens'

vi.mock('~components/components/MultiOrdersDetails', () => ({
  MultiOrdersDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      ordersList={{ loading: false, error: null, orders: [pastOrder] }}
      customer={{ name: 'Jane', lastname: 'Doe', image: 'avatar.png' }}
      ordersSummary={{ total: 15.5 }}
      paymentEvents={[]}
      handleOrderRedirect={vi.fn()}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ order }) => <div>{order.business.name}</div>
}))

describe('MultiOrdersDetails', () => {
  it('renders order summary and payment total', () => {
    const { getByText } = renderWithProviders(<MultiOrdersDetails />)
    expect(getByText('Order summary')).toBeInTheDocument()
    expect(getByText(/Payment total/)).toBeInTheDocument()
    expect(getByText('Pizza Place')).toBeInTheDocument()
  })

  it('the page keeps most of the screen height in dvh, in no fixed px', () => {
    const theme = themeWithValues()
    const { container } = renderWithProviders(<MultiOrdersDetails />, { theme })
    const css = cssFor(container.querySelector('[data-doc-section="multi-order-details"]')).replace(/\s+/g, '')
    expect(css).toContain('min-height:70dvh;')
    expect(css).not.toContain('280px')
  })

  it('the customer photo is a square of the 3xs medium', () => {
    const theme = themeWithValues()
    const { container } = renderWithProviders(<MultiOrdersDetails />, { theme })
    const css = cssFor(container.querySelector('[data-doc-section="multi-order-customer"] svg').parentElement).replace(/\s+/g, '')
    expect(css).toContain(`width:${themeMedia(theme, '3xs')};aspect-ratio:1;`)
  })
})
