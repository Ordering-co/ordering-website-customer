import { describe, expect, it, vi } from 'vitest'

// (src/setupTests.js mocks ~ui/utils for the components)
const { getGoogleMapImage } = await vi.importActual('~ui/utils')

const LOCATION = { lat: 40.7, lng: -74 }
const sizeOf = (url) => new URL(url).searchParams.get('size')

describe('getGoogleMapImage: the size it is requested at', () => {
  it('a box height (a map_height): the widest Google serves and that height, at scale 2', () => {
    const url = getGoogleMapImage(LOCATION, 'key', { height: 300 })
    expect(sizeOf(url)).toBe('640x300')
    expect(new URL(url).searchParams.get('scale')).toBe('2')
  })

  it('a box taller than Google serves: 640 at most', () => {
    expect(sizeOf(getGoogleMapImage(LOCATION, 'key', { height: 900 }))).toBe('640x640')
  })

  it('without a height: the size it is given, else 500×190', () => {
    expect(sizeOf(getGoogleMapImage(LOCATION, 'key', { size: { w: 320, h: 120 } }))).toBe('320x120')
    expect(sizeOf(getGoogleMapImage(LOCATION, 'key', {}))).toBe('500x190')
    expect(sizeOf(getGoogleMapImage(LOCATION, 'key', { height: 0 }))).toBe('500x190')
  })
})
