import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { sampleGiftCard } from '../../../__tests__/helpers/giftCardStudentTestMocks'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'
import { THEME_IMAGE_DEFAULTS } from '../../../../../../utils/bundledImages'
import { SingleGiftCard } from '../index'

const emit = vi.hoisted(() => vi.fn())

vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))

describe('SingleGiftCard', () => {
  it('renders gift card details', () => {
    const { getByText } = renderWithProviders(
      <SingleGiftCard card={sampleGiftCard} />
    )
    expect(getByText('$25 Gift Card')).toBeInTheDocument()
    expect(getByText('$25')).toBeInTheDocument()
    expect(getByText('Pending')).toBeInTheDocument()
  })

  it('emits order detail navigation on click', () => {
    const { getByText } = renderWithProviders(
      <SingleGiftCard card={sampleGiftCard} />
    )
    fireEvent.click(getByText('$25 Gift Card'))
    expect(emit).toHaveBeenCalledWith('go_to_page', {
      page: 'order_detail',
      params: { orderId: 10 }
    })
  })

  it('its title is the button that opens its order (a stretched link), in an h3', () => {
    emit.mockClear()
    const { getByRole, container } = renderWithProviders(
      <SingleGiftCard card={sampleGiftCard} />
    )
    const open = getByRole('button', { name: '$25 Gift Card' })
    expect(open).toHaveAttribute('data-card-link')
    expect(open.closest('h3')).not.toBeNull()
    expect(container.querySelector('[role="link"]')).toBeNull()
    fireEvent.click(open)
    expect(emit).toHaveBeenCalledWith('go_to_page', {
      page: 'order_detail',
      params: { orderId: 10 }
    })
  })

  it('its texts are the order card\'s (name, meta, total)', () => {
    const theme = themeWithValues((values) => {
      values.components.order_card.base.name_color = '#101010'
      values.components.order_card.base.meta_color = '#202020'
      values.components.order_card.base.total_color = '#303030'
      return values
    })
    const { getByText, container } = renderWithProviders(<SingleGiftCard card={sampleGiftCard} />, { theme })
    expect(container.querySelector('h3')).toHaveStyle({ color: '#101010' })
    expect(container.querySelector('p.date')).toHaveStyle({ color: '#202020' })
    expect(getByText('$25')).toHaveStyle({ color: '#303030' })
  })

  it('renders skeleton placeholder when loading', () => {
    const { getAllByTestId } = renderWithProviders(<SingleGiftCard isSkeleton />)
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  describe('without an image of its own', () => {
    const noImage = { ...sampleGiftCard, order_product: { ...sampleGiftCard.order_product, images: null } }
    const bg = (theme) => {
      const { container, unmount } = renderWithProviders(<SingleGiftCard card={noImage} />, { theme })
      const styled = Array.from(container.querySelectorAll('[style]')).find((el) => el.style.backgroundImage)
      const value = styled?.style.backgroundImage
      unmount()
      return value
    }

    it('the theme\'s placeholder (images.placeholder.gift_card)', () => {
      const IMAGE = 'https://cdn.test/gift.png'
      const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'placeholder.gift_card': IMAGE } }))
      expect(bg(theme)).toBe(`url("${IMAGE}")`)
    })

    it('without one in the theme, the bundle\'s placeholder', () => {
      expect(bg(themeWithValues())).toBe(`url("${THEME_IMAGE_DEFAULTS['placeholder.gift_card']}")`)
    })
  })
})
