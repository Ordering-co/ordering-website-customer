import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/cartTestMocks'
import { useOrder } from '~components/contexts/OrderContext'
import { MomentContent } from '../index'

vi.mock('~ui/src/components/MomentControl', () => ({
  MomentControl: () => <div data-testid='moment-control' />
}))

// the loader reports its size, so what the screen asks for can be read (the global mock does not)
vi.mock('~ui/src/components/SpinnerLoader', () => ({
  SpinnerLoader: ({ size }) => <div data-testid='spinner' data-size={size}>loading</div>
}))

describe('MomentContent', () => {
  const [orderState] = useOrder()
  afterEach(() => { delete orderState.loading })

  it('while the order updates, its layer over the picker has the md spinner', () => {
    orderState.loading = true
    const { getByTestId } = renderWithProviders(<MomentContent business={businessFixture} onClose={vi.fn()} />)
    expect(getByTestId('spinner')).toHaveAttribute('data-size', 'md')
  })

  it('without a loading order there is no layer', () => {
    const { queryByTestId } = renderWithProviders(<MomentContent business={businessFixture} onClose={vi.fn()} />)
    expect(queryByTestId('spinner')).toBeNull()
  })

  it('renders moment control when config is loaded', () => {
    const { getByTestId } = renderWithProviders(
      <MomentContent business={businessFixture} onClose={vi.fn()} />
    )
    expect(getByTestId('moment-control')).toBeInTheDocument()
  })
})
