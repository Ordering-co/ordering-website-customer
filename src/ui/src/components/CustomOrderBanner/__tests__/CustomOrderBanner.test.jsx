import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CustomOrderBanner } from '../index'

describe('CustomOrderBanner', () => {
  it('renders custom order banner copy and button', () => {
    const { getByText } = renderWithProviders(<CustomOrderBanner onCustomOrderClick={vi.fn()} />)
    expect(getByText('Do you need a special delivery?')).toBeInTheDocument()
    expect(getByText('Custom order')).toBeInTheDocument()
  })

  it('complete theme: the image is the theme\'s (images.custom_order_banner)', () => {
    const IMAGE = 'https://cdn.test/custom-order.jpg'
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, custom_order_banner: IMAGE } }))
    const { container } = renderWithProviders(<CustomOrderBanner onCustomOrderClick={vi.fn()} />, { theme })
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGE)
  })

  it('without it (an empty key), the current image', () => {
    ;[themeWithValues()].forEach((theme) => {
      const { container, unmount } = renderWithProviders(<CustomOrderBanner onCustomOrderClick={vi.fn()} />, { theme })
      expect(container.querySelector('img').getAttribute('src')).toMatch(/^https:\/\/cloud-assets\.orderingplus\.com\//)
      unmount()
    })
  })
})
