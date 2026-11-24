import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { FallbackImage, imageCandidates } from '../index'

describe('FallbackImage: never the broken image', () => {
  it('imageCandidates: its own source, then the placeholder, each once', () => {
    expect(imageCandidates('a.jpg', 'b.jpg')).toEqual(['a.jpg', 'b.jpg'])
    expect(imageCandidates('', 'b.jpg')).toEqual(['b.jpg'])
    expect(imageCandidates('a.jpg', 'a.jpg')).toEqual(['a.jpg'])
    expect(imageCandidates(null, undefined)).toEqual([])
  })

  it('shows its photo, with its alt', () => {
    const utils = render(<FallbackImage src='logo.png' fallback='dummy.png' alt='Store' />)
    expect(utils.getByRole('img', { name: 'Store' })).toHaveAttribute('src', 'logo.png')
  })

  it('a photo that fails: the placeholder, saying nothing (alt "")', () => {
    const utils = render(<FallbackImage src='logo.png' fallback='dummy.png' alt='Store' />)
    fireEvent.error(utils.container.querySelector('img'))
    const img = utils.container.querySelector('img')
    expect(img).toHaveAttribute('src', 'dummy.png')
    expect(img).toHaveAttribute('alt', '')
  })

  it('without a photo: the placeholder at once', () => {
    const utils = render(<FallbackImage src={null} fallback='dummy.png' alt='Store' />)
    expect(utils.container.querySelector('img')).toHaveAttribute('src', 'dummy.png')
  })

  it('both failing, or none: failedContent (nothing by default)', () => {
    const utils = render(<FallbackImage src='logo.png' fallback='dummy.png' failedContent={<span data-testid='initials'>AB</span>} />)
    fireEvent.error(utils.container.querySelector('img'))
    fireEvent.error(utils.container.querySelector('img'))
    expect(utils.container.querySelector('img')).toBeNull()
    expect(utils.getByTestId('initials')).toBeInTheDocument()

    const bare = render(<FallbackImage src='logo.png' />)
    fireEvent.error(bare.container.querySelector('img'))
    expect(bare.container.innerHTML).toBe('')
  })

  it('a new photo tries again from its own source', () => {
    const utils = render(<FallbackImage src='a.png' fallback='dummy.png' />)
    fireEvent.error(utils.container.querySelector('img'))
    utils.rerender(<FallbackImage src='b.png' fallback='dummy.png' />)
    expect(utils.container.querySelector('img')).toHaveAttribute('src', 'b.png')
  })
})
