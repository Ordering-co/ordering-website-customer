import { afterEach, describe, expect, it } from 'vitest'
import { applyAppleTouchIcon } from '../applyAppleTouchIcon'

const ICON = 'https://cdn.test/app-icon.png'
const touchIcons = () => Array.from(document.head.querySelectorAll('link[rel="apple-touch-icon"]'))

const addLink = (href, sizes) => {
  const link = document.createElement('link')
  link.rel = 'apple-touch-icon'
  link.setAttribute('href', href)
  if (sizes) link.setAttribute('sizes', sizes)
  document.head.appendChild(link)
  return link
}

describe('applyAppleTouchIcon', () => {
  afterEach(() => touchIcons().forEach((link) => link.remove()))

  it('points every apple-touch-icon of the document at the app icon and restores them', () => {
    addLink('/touch-icon-iphone.png')
    addLink('/touch-icon-iphone-retina.png', '180x180')
    const restore = applyAppleTouchIcon(ICON)
    expect(touchIcons().map((link) => link.getAttribute('href'))).toEqual([ICON, ICON])
    restore()
    expect(touchIcons().map((link) => link.getAttribute('href'))).toEqual(['/touch-icon-iphone.png', '/touch-icon-iphone-retina.png'])
  })

  it('adds one (180x180) when the document has none, and removes it on cleanup', () => {
    const restore = applyAppleTouchIcon(ICON)
    expect(touchIcons()).toHaveLength(1)
    expect(touchIcons()[0]).toHaveAttribute('sizes', '180x180')
    expect(touchIcons()[0]).toHaveAttribute('href', ICON)
    restore()
    expect(touchIcons()).toHaveLength(0)
  })

  it('without an icon it changes nothing', () => {
    addLink('/touch-icon-iphone.png')
    applyAppleTouchIcon(null)()
    applyAppleTouchIcon('  ')
    expect(touchIcons().map((link) => link.getAttribute('href'))).toEqual(['/touch-icon-iphone.png'])
  })
})
