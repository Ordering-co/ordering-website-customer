import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInertOutside } from '../inertOutside'

const portals = []
const portal = () => {
  const el = document.createElement('div')
  el.setAttribute('data-base-ui-portal', '')
  const popup = document.createElement('div')
  el.append(popup)
  document.body.append(el)
  portals.push(el)
  return { portal: el, popup }
}
afterEach(() => { portals.splice(0).forEach((el) => el.remove()) })
const inert = (el) => el.hasAttribute('inert')

describe('useInertOutside', () => {
  it('two sibling layers opened in the same render: the one in front stays operative, the other is inert', () => {
    const a = portal()
    const b = portal()
    const { rerender } = renderHook(({ open }) => {
      useInertOutside(a.popup, open.a)
      useInertOutside(b.popup, open.b)
    }, { initialProps: { open: { a: true, b: true } } })
    expect(inert(b.portal)).toBe(false)
    expect(inert(a.portal)).toBe(true)
    // closing the one in front gives the other back its operation, with the page still behind it
    rerender({ open: { a: true, b: false } })
    expect(inert(a.portal)).toBe(false)
    expect(inert(b.portal)).toBe(true)
    rerender({ open: { a: false, b: false } })
    expect(inert(a.portal) || inert(b.portal)).toBe(false)
  })

  it('a layer nested in another one isolates the parent and gives it back on closing', () => {
    const parent = portal()
    const child = document.createElement('div')
    child.setAttribute('data-base-ui-portal', '')
    const childPopup = document.createElement('div')
    child.append(childPopup)
    parent.portal.append(child)
    const page = document.createElement('main')
    document.body.append(page)
    portals.push(page)
    const { rerender } = renderHook(({ child: c }) => {
      useInertOutside(parent.popup, true)
      useInertOutside(childPopup, c)
    }, { initialProps: { child: true } })
    expect(inert(page)).toBe(true)
    expect(inert(parent.portal)).toBe(false)
    expect(inert(parent.popup)).toBe(true)
    expect(inert(child)).toBe(false)
    rerender({ child: false })
    expect(inert(parent.popup)).toBe(false)
    expect(inert(page)).toBe(true)
  })

  it('leaves alone what was inert before and the legacy popups root', () => {
    const own = document.createElement('aside')
    own.setAttribute('inert', '')
    const legacy = document.createElement('div')
    legacy.id = 'app-modals'
    document.body.append(own, legacy)
    portals.push(own, legacy)
    const a = portal()
    const { unmount } = renderHook(() => useInertOutside(a.popup, true))
    expect(inert(legacy)).toBe(false)
    unmount()
    expect(inert(own)).toBe(true)
  })
})
