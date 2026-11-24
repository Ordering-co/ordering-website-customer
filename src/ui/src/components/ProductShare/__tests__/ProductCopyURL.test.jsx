import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeSize, themeSpace } from '~/utils/themeTokens'
import { ProductCopyURL } from '../ProductCopyURL'
import { CopyAction, ProductCopyURLContainer } from '../styles'

vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ optimizeImage: (url) => url }]
}))

const product = { id: 1, name: 'Burger', images: null }

describe('ProductCopyURL: the share preview\'s photo (visibility.product.dummy_image)', () => {
  it('no photo and no placeholder by default: no image, the name stays', () => {
    const { container, getByText } = renderWithProviders(
      <ProductCopyURL urlToShare='https://example.com/p/1' product={product} />,
      { theme: themeWithValues() }
    )
    expect(container.querySelector('img')).toBeNull()
    expect(getByText('Burger')).toBeInTheDocument()
  })

  it('shows the theme\'s placeholder when visibility.product.dummy_image is on', () => {
    const theme = themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, 'product.dummy_image': true } }))
    const placeholder = theme.values.images['placeholder.product']
    expect(placeholder).toBeTruthy()
    const { container } = renderWithProviders(
      <ProductCopyURL urlToShare='https://example.com/p/1' product={product} />,
      { theme }
    )
    expect(container.querySelector('img')).toHaveAttribute('src', placeholder)
  })

  it('a product\'s own photo always shows, switch or no switch', () => {
    const { container } = renderWithProviders(
      <ProductCopyURL urlToShare='https://example.com/p/1' product={{ ...product, images: 'burger.jpg' }} />,
      { theme: themeWithValues() }
    )
    expect(container.querySelector('img')).toHaveAttribute('src', 'burger.jpg')
  })
})

describe('ProductCopyURL: clipboard confirmation', () => {
  const open = (writeText) => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const onClose = vi.fn()
    const view = renderWithProviders(
      <ProductCopyURL urlToShare='https://example.com/p/1' product={product} onClose={onClose} />,
      { theme: themeWithValues() }
    )
    const click = () => fireEvent.click(view.getByRole('button', { name: 'Copy URL' }))
    return { ...view, click, onClose }
  }

  afterEach(() => {
    vi.useRealTimers()
    delete navigator.clipboard
  })

  it('waits for the write before announcing success, showing the check and scheduling closure', async () => {
    let resolve
    const writeText = vi.fn(() => new Promise(done => { resolve = done }))
    const view = open(writeText)
    view.click()
    expect(writeText).toHaveBeenCalledWith('https://example.com/p/1')
    expect(view.container.querySelector('.lucide-check')).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(view.onClose).not.toHaveBeenCalled()
    await act(async () => resolve())
    expect(view.getByRole('status')).toHaveTextContent('Link copied')
    expect(view.container.querySelector('svg.lucide-check')).toHaveAttribute('aria-hidden', 'true')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(view.onClose).toHaveBeenCalledTimes(1)
  })

  it('reports a denied write, keeps the preview open and lets the user retry', async () => {
    const denied = Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    denied.catch(() => {})
    const view = open(vi.fn().mockReturnValueOnce(denied).mockResolvedValue(undefined))
    await act(async () => view.click())
    expect(view.getByRole('alert')).toHaveTextContent('Could not copy the link. Try again.')
    expect(view.container.querySelector('.lucide-check')).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(view.onClose).not.toHaveBeenCalled()
    await act(async () => view.click())
    expect(view.queryByRole('alert')).toBeNull()
    expect(view.getByRole('status')).toHaveTextContent('Link copied')
  })

  it('cancels the automatic closure after the user closes the preview manually', async () => {
    const view = open(vi.fn().mockResolvedValue(undefined))
    await act(async () => view.click())
    view.unmount()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(view.onClose).not.toHaveBeenCalled()
  })
})

describe('ProductCopyURLContainer: its spaces are the theme\'s (tokens.space)', () => {
  const tight = (text) => text.replace(/\s+/g, '')
  const cssOf = (theme) => {
    const { getByTestId } = renderWith(theme, (
      <ProductCopyURLContainer data-testid='preview'>
        <CopyAction data-testid='action' />
      </ProductCopyURLContainer>
    ))
    return ['preview', 'action'].map((id) => tight(cssFor(getByTestId(id))))
  }
  const themes = {
    default: themeWithValues(),
    'another theme': themeWithValues((values) => {
      values.tokens.space.xxl = 36
      values.tokens.space.lg = 18
      values.tokens.space.xxxl = 52
      return values
    })
  }
  Object.entries(themes).forEach(([name, theme]) => {
    it(`${name}: the top padding is xxl, the name's top margin lg, the button's xxxl (2 x size.xl on desktop)`, () => {
      const [css, action] = cssOf(theme)
      expect(css).toContain(`padding-top:${themeSpace(theme, 'xxl')};`)
      expect(css).toContain(`margin-bottom:0;margin-top:${themeSpace(theme, 'lg')};`)
      expect(action).toContain(`margin-top:${themeSpace(theme, 'xxxl')};`)
      expect(action).toContain(`margin-top:calc(2*${themeSize(theme, 'xl')});`)
      expect(action).not.toContain('115px')
      ;['padding-top:30px', 'margin-top:15px', 'margin-top:50px'].forEach((literal) => expect(css + action).not.toContain(literal))
    })
  })
})
