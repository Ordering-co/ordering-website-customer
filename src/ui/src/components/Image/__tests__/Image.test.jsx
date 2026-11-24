import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Image } from '../index'

describe('Image', () => {
  it('renders the source image when provided, decorative by default (the name is beside it)', () => {
    const { container } = render(<Image src='https://example.com/photo.jpg' />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', '32')
    expect(img).toHaveAttribute('height', '32')
  })

  it('reserves the themed square for the source and honors the consumer style', () => {
    const theme = themeWithValues(values => { values.tokens.size.sm = 36; return values })
    const { getByAltText } = render(
      <ThemeProvider theme={theme}>
        <Image src='https://example.com/photo.jpg' alt='Demo Store' style={{ width: '100%' }} fallback='https://example.com/fallback.jpg' />
      </ThemeProvider>
    )
    const img = getByAltText('Demo Store')
    expect(img).toHaveAttribute('width', '36')
    expect(img).toHaveAttribute('height', '36')
    expect(img.style.width).toBe('100%')
    fireEvent.load(img)
    expect(img).toHaveAttribute('width', '36')
    fireEvent.error(img)
    const fallback = getByAltText('Demo Store')
    expect(fallback).toHaveAttribute('src', 'https://example.com/fallback.jpg')
    expect(fallback).not.toHaveAttribute('width')
    expect(fallback.style.width).toBe('100%')
  })

  it('takes the alt of a caller where the image carries meaning', () => {
    const { getByAltText } = render(<Image src='https://example.com/photo.jpg' alt='Demo Store' />)
    expect(getByAltText('Demo Store')).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('renders fallback content when src is missing', () => {
    const { getByText } = render(<Image fallback={<span>fallback avatar</span>} />)
    expect(getByText('fallback avatar')).toBeInTheDocument()
  })

  it('swaps to fallback content after image error', () => {
    const { container, getByText } = render(
      <Image src='https://example.com/broken.jpg' fallback={<span>broken fallback</span>} />
    )
    fireEvent.error(container.querySelector('img'))
    expect(getByText('broken fallback')).toBeInTheDocument()
  })
})
