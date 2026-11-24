import { afterEach, describe, expect, it } from 'vitest'
import { IN_OVERLAY, isInsideOverlay } from '../overlay'

const add = (html) => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  return host
}
afterEach(() => { document.body.innerHTML = '' })

describe('isInsideOverlay', () => {
  it('is true on the legacy Popup\'s root and on a Base UI portal, and for what is inside them', () => {
    const host = add('<div id="app-modals"><button id="legacy"></button></div><div data-base-ui-portal><span><b id="portal"></b></span></div>')
    expect(isInsideOverlay(host.querySelector('#legacy'))).toBe(true)
    expect(isInsideOverlay(host.querySelector('#app-modals'))).toBe(true)
    expect(isInsideOverlay(host.querySelector('#portal'))).toBe(true)
  })

  it('is false on the page, with no overlay open, and for what is not an element', () => {
    const host = add('<main><button id="page"></button></main>')
    expect(isInsideOverlay(host.querySelector('#page'))).toBe(false)
    expect(isInsideOverlay(document.body)).toBe(false)
    expect(isInsideOverlay(document)).toBe(false)
    expect(isInsideOverlay(null)).toBe(false)
  })
})

describe('IN_OVERLAY', () => {
  it('is the overlay layers as the ancestor of the rule (`&`)', () => {
    expect(IN_OVERLAY).toBe('#app-modals &, [data-base-ui-portal] &')
  })
})
