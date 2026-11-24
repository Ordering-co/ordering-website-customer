import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { StaticMap } from '../index'

describe('StaticMap', () => {
  it('renders the first source, unchanged while it keeps working', () => {
    const { getByAltText, queryByAltText } = render(
      <StaticMap sources={['https://maps.test/google.png', 'https://maps.test/mapbox.png']} alt='Location map' id='google-maps-image' />
    )
    const img = getByAltText('Location map')
    expect(img).toHaveAttribute('src', 'https://maps.test/google.png')
    expect(img).toHaveAttribute('id', 'google-maps-image')
    fireEvent.error(img)
    // still the same element onError moved past, not a fresh broken one
    expect(queryByAltText('Location map')).toBe(img)
  })

  it('falls back to Mapbox once Google errors', () => {
    const { getByAltText } = render(
      <StaticMap sources={['https://maps.test/google.png', 'https://maps.test/mapbox.png']} alt='Location map' />
    )
    fireEvent.error(getByAltText('Location map'))
    expect(getByAltText('Location map')).toHaveAttribute('src', 'https://maps.test/mapbox.png')
  })

  it('renders nothing, not even the wrapper, once every source has failed', () => {
    const { container, queryByAltText } = render(
      <StaticMap
        sources={['https://maps.test/google.png', 'https://maps.test/mapbox.png']}
        alt='Location map'
        wrap={(img) => <div data-testid='map-wrapper'>{img}</div>}
      />
    )
    fireEvent.error(queryByAltText('Location map'))
    fireEvent.error(queryByAltText('Location map'))
    expect(queryByAltText('Location map')).toBeNull()
    expect(container.querySelector('[data-testid="map-wrapper"]')).toBeNull()
  })

  it('without a Mapbox token (a single source) one Google error empties the block', () => {
    const { queryByAltText } = render(
      <StaticMap sources={['https://maps.test/google.png', null]} alt='Location map' wrap={(img) => <div>{img}</div>} />
    )
    fireEvent.error(queryByAltText('Location map'))
    expect(queryByAltText('Location map')).toBeNull()
  })

  it('no sources at all renders nothing up front', () => {
    const { container } = render(<StaticMap sources={[null, undefined]} alt='Location map' wrap={(img) => <div>{img}</div>} />)
    expect(container).toBeEmptyDOMElement()
  })
})
