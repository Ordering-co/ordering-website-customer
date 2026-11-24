import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { scrollFieldIntoView, useKeyboardOpen } from '../useKeyboardOpen'

const visual = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 })
const Harness = () => {
  useKeyboardOpen()
  return (
    <div>
      <header data-app-header=''><input data-testid='search' /></header>
      <input data-testid='name' />
      <input type='checkbox' data-testid='check' />
    </div>
  )
}
const keyboard = (px) => act(() => { visual.height = 800 - px; visual.dispatchEvent(new Event('resize')) })

// the body that scrolls: jsdom has no layout, so its measures are given
const dialogBody = (field, { top = 0, bottom = 800 } = {}) => {
  const body = document.createElement('div')
  body.style.overflowY = 'auto'
  Object.defineProperty(body, 'scrollHeight', { value: 900 })
  Object.defineProperty(body, 'clientHeight', { value: 600 })
  body.getBoundingClientRect = () => ({ top, bottom })
  body.scrollBy = vi.fn()
  const input = document.createElement('input')
  input.getBoundingClientRect = () => field
  body.append(input)
  document.body.append(body)
  return { body, input }
}

describe('useKeyboardOpen', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'visualViewport', { value: visual, configurable: true })
    window.innerHeight = 800
    Object.assign(visual, { height: 800, offsetTop: 0, scale: 1 })
    window.scrollBy = vi.fn()
  })
  afterEach(() => {
    vi.useRealTimers()
    if (original) Object.defineProperty(window, 'visualViewport', original)
    else delete window.visualViewport
  })
  const open = () => document.documentElement.hasAttribute('data-keyboard-open')

  it('publishes the attribute and the variables while a text field has the focus and the keyboard covers the screen', () => {
    const { getByTestId, unmount } = render(<Harness />)
    getByTestId('name').focus()
    expect(open()).toBe(false)
    keyboard(300)
    expect(open()).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('300px')
    expect(document.documentElement.style.getPropertyValue('--visual-viewport-height')).toBe('500px')
    act(() => getByTestId('name').blur())
    act(() => { vi.runOnlyPendingTimers() })
    expect(open()).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('')
    unmount()
  })

  it('a checkbox, a field in the header or a browser bar sliding away are not the keyboard', () => {
    const { getByTestId } = render(<Harness />)
    getByTestId('check').focus()
    keyboard(300)
    expect(open()).toBe(false)
    getByTestId('search').focus()
    expect(open()).toBe(false)
    getByTestId('name').focus()
    keyboard(60)
    expect(open()).toBe(false)
  })

  it('waits for the visual viewport to rest before it scrolls', () => {
    const { getByTestId } = render(<Harness />)
    const field = getByTestId('name')
    field.getBoundingClientRect = () => ({ top: 600, bottom: 640 })
    field.focus()
    keyboard(300)
    act(() => { vi.advanceTimersByTime(299) })
    expect(window.scrollBy).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(2) })
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 140, behavior: 'instant' })
  })

  it('a field in a dialog is scrolled by the hook once the visual viewport rests', () => {
    const { body, input } = dialogBody({ top: 700, bottom: 740 })
    render(<Harness />)
    input.focus()
    keyboard(300)
    act(() => { vi.advanceTimersByTime(301) })
    expect(body.scrollBy).toHaveBeenCalledWith({ top: 240, behavior: 'instant' })
  })
})

describe('useKeyboardOpen: text entry', () => {
  const originalVisual = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  const root = document.documentElement
  const entry = () => root.hasAttribute('data-text-entry')
  const keyboardOpen = () => root.hasAttribute('data-keyboard-open')
  const pointer = (coarse) => Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query) => ({ matches: coarse && query === '(pointer: coarse)', media: query, addEventListener () {}, removeEventListener () {} })
  })
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'visualViewport', { value: visual, configurable: true })
    window.innerHeight = 800
    Object.assign(visual, { height: 800, offsetTop: 0, scale: 1 })
    window.scrollBy = vi.fn()
    pointer(true)
  })
  afterEach(() => {
    vi.useRealTimers()
    if (originalVisual) Object.defineProperty(window, 'visualViewport', originalVisual)
    else delete window.visualViewport
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
    else delete window.matchMedia
  })

  it('is on while a text field has the focus on a touch device, even when the viewport did not move', () => {
    const { getByTestId, unmount } = render(<Harness />)
    expect(entry()).toBe(false)
    getByTestId('name').focus()
    expect(entry()).toBe(true)
    // the layout viewport shrank with the keyboard: keyboardCovers is false, the focus alone tells
    expect(keyboardOpen()).toBe(false)
    unmount()
  })

  it('goes with the focus: off after the blur, and when the hook unmounts', () => {
    const { getByTestId, unmount } = render(<Harness />)
    act(() => getByTestId('name').focus())
    expect(entry()).toBe(true)
    act(() => getByTestId('name').blur())
    act(() => { vi.runOnlyPendingTimers() })
    expect(entry()).toBe(false)
    act(() => getByTestId('name').focus())
    expect(entry()).toBe(true)
    unmount()
    expect(entry()).toBe(false)
  })

  it('moving from a field to the next keeps it on', () => {
    const { getByTestId } = render(<Harness />)
    getByTestId('name').focus()
    act(() => getByTestId('name').blur())
    getByTestId('name').focus()
    act(() => { vi.runOnlyPendingTimers() })
    expect(entry()).toBe(true)
  })

  it('is not on for a field in the header or a checkbox', () => {
    const { getByTestId } = render(<Harness />)
    getByTestId('search').focus()
    expect(entry()).toBe(false)
    getByTestId('check').focus()
    expect(entry()).toBe(false)
  })

  it('is not on without a coarse pointer (a mouse: nothing covers the screen)', () => {
    pointer(false)
    const { getByTestId } = render(<Harness />)
    getByTestId('name').focus()
    expect(entry()).toBe(false)
    keyboard(300)
    expect(keyboardOpen()).toBe(true)
    expect(entry()).toBe(false)
  })

  it('is not on where the browser cannot answer the media query', () => {
    delete window.matchMedia
    const { getByTestId } = render(<Harness />)
    getByTestId('name').focus()
    expect(entry()).toBe(false)
  })

  it('works where there is no visual viewport, and the keyboard attribute stays off', () => {
    delete window.visualViewport
    const { getByTestId } = render(<Harness />)
    getByTestId('name').focus()
    expect(entry()).toBe(true)
    expect(keyboardOpen()).toBe(false)
  })

  it('both attributes can be on together: the keyboard attribute is the one it always was', () => {
    const { getByTestId } = render(<Harness />)
    getByTestId('name').focus()
    keyboard(300)
    expect(entry()).toBe(true)
    expect(keyboardOpen()).toBe(true)
  })
})

describe('scrollFieldIntoView', () => {
  const box = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }), getAttribute: () => null })
  beforeEach(() => { window.scrollBy = vi.fn() })

  it('scrolls only when the field is not whole in the visible box', () => {
    scrollFieldIntoView(box(100, 140), { offsetTop: 0, height: 500 })
    expect(window.scrollBy).not.toHaveBeenCalled()
    scrollFieldIntoView(box(480, 540), { offsetTop: 0, height: 500 })
    expect(window.scrollBy).toHaveBeenLastCalledWith({ top: 40, behavior: 'instant' })
    scrollFieldIntoView(box(-30, 10), { offsetTop: 0, height: 500 })
    expect(window.scrollBy).toHaveBeenLastCalledWith({ top: -30, behavior: 'instant' })
  })

  it('scrolls whole pixels, away from zero', () => {
    scrollFieldIntoView(box(480, 540.2), { offsetTop: 0, height: 500 })
    expect(window.scrollBy).toHaveBeenLastCalledWith({ top: 41, behavior: 'instant' })
  })

  it('a block taller than the box keeps its top in view', () => {
    scrollFieldIntoView(box(300, 900), { offsetTop: 0, height: 500 })
    expect(window.scrollBy).toHaveBeenLastCalledWith({ top: 300, behavior: 'instant' })
  })

  describe('inside a dialog or a sheet', () => {
    afterEach(() => { document.body.innerHTML = '' })

    it('scrolls the body, not the page, and only when the field is out of the box above the keyboard', () => {
      const out = dialogBody({ top: 420, bottom: 480 })
      scrollFieldIntoView(out.input, { offsetTop: 0, height: 450 })
      expect(out.body.scrollBy).toHaveBeenCalledWith({ top: 30, behavior: 'instant' })
      expect(window.scrollBy).not.toHaveBeenCalled()
      const inside = dialogBody({ top: 100, bottom: 160 })
      scrollFieldIntoView(inside.input, { offsetTop: 0, height: 450 })
      expect(inside.body.scrollBy).not.toHaveBeenCalled()
    })

    it('the box ends where the body does, and starts where the panned visual viewport does', () => {
      const low = dialogBody({ top: 300, bottom: 340 }, { bottom: 320 })
      scrollFieldIntoView(low.input, { offsetTop: 0, height: 450 })
      expect(low.body.scrollBy).toHaveBeenCalledWith({ top: 20, behavior: 'instant' })
      const panned = dialogBody({ top: 10, bottom: 50 })
      scrollFieldIntoView(panned.input, { offsetTop: 40, height: 450 })
      expect(panned.body.scrollBy).toHaveBeenCalledWith({ top: -30, behavior: 'instant' })
    })
  })
})
