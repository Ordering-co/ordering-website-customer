import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessPreorder } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { useOrder } from '~components/contexts/OrderContext'

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({ Navigation: {}, Thumbs: {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: () => <div data-testid='preorder-steps' />
}))
vi.mock('~ui/src/components/BusinessMenuList', () => ({
  BusinessMenuList: () => <div data-testid='menu-list' />
}))

vi.mock('~components/components/MomentOption', () => ({
  MomentOption: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      datesList={['2026-07-15']}
      dateSelected='2026-07-15'
      timeSelected='12:00'
      hoursList={[]}
      timeList={['12:00']}
      handleChangeDate={vi.fn()}
      handleChangeTime={vi.fn()}
      showButton
      isAsap={false}
      handleAsap={vi.fn()}
      scheduleSelected={null}
      orderTypes={['Delivery', 'Pickup', 'Eat in', 'Curbside']}
      {...rest}
    />
  )
}))

// the loader reports its size, so what the screen asks for can be read (the global mock does not)
vi.mock('~ui/src/components/SpinnerLoader', () => ({
  SpinnerLoader: ({ size }) => <div data-testid='spinner' data-size={size}>loading</div>
}))

describe('BusinessPreorder', () => {
  const [orderState] = useOrder()
  afterEach(() => { delete orderState.loading })

  it('while the order updates, its layer over the picker has the md spinner', () => {
    orderState.loading = true
    const { getByTestId } = renderWithProviders(<BusinessPreorder />)
    expect(getByTestId('spinner')).toHaveAttribute('data-size', 'md')
  })

  it('without a loading order there is no layer', () => {
    const { queryByTestId } = renderWithProviders(<BusinessPreorder />)
    expect(queryByTestId('spinner')).toBeNull()
  })

  it('renders preorder steps', () => {
    const { getByTestId } = renderWithProviders(<BusinessPreorder />)
    expect(getByTestId('preorder-steps')).toBeInTheDocument()
  })

  it('without buttonText: "Go to menu" with its decorative arrow in the end slot', () => {
    const { getByRole } = renderWithProviders(<BusinessPreorder showButton />)
    const button = getByRole('button', { name: /Go to menu/ })
    expect(button).toHaveAttribute('data-doc-control', 'business-preorder-go-to-menu')
    const arrow = button.querySelector('[data-slot="button-icon-end"] .lucide-arrow-right')
    expect(arrow).toHaveAttribute('aria-hidden', 'true')
  })

  it('with buttonText: shows that text instead, no arrow, a different data-doc-control', () => {
    const { getByRole, queryByText } = renderWithProviders(<BusinessPreorder showButton buttonText='Save' />)
    const button = getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('data-doc-control', 'business-preorder-save')
    expect(button.querySelector('[data-slot="button-icon-end"]')).toBeNull()
    expect(queryByText('Go to menu')).not.toBeInTheDocument()
  })

  it('the store\'s logo and name under the title: off by default, shown by visibility business.preorder.logo', () => {
    const hidden = renderWithProviders(<BusinessPreorder business={businessFixture} />, { theme: themeWithValues() })
    expect(hidden.queryByText('Demo Store')).toBeNull()
    expect(hidden.container.querySelector('[style*="logo.png"]')).toBeNull()
    hidden.unmount()
    const shown = renderWithProviders(<BusinessPreorder business={businessFixture} />, {
      theme: themeWithValues((values) => {
        values.visibility['business.preorder.logo'] = true
        return values
      })
    })
    expect(shown.getByText('Demo Store')).toBeInTheDocument()
    expect(shown.container.querySelector('[style*="logo.png"]')).not.toBeNull()
  })
})
