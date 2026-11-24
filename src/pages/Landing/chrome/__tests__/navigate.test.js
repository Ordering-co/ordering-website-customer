import { afterEach, describe, expect, it, vi } from 'vitest'
import { goTo, jumpTo } from '../navigate'

const click = (init = {}) => ({ button: 0, defaultPrevented: false, preventDefault: vi.fn(), ...init })

describe('goTo / jumpTo (the page chrome\'s links)', () => {
  afterEach(() => document.body.replaceChildren())

  it('a plain click goes to the path inside the app', () => {
    const history = { push: vi.fn() }
    const event = click()
    goTo(history, '/order')(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(history.push).toHaveBeenCalledWith('/order')
  })

  it.each([['ctrl', { ctrlKey: true }], ['meta', { metaKey: true }], ['shift', { shiftKey: true }], ['alt', { altKey: true }], ['middle button', { button: 1 }], ['already handled', { defaultPrevented: true }]])('%s: left to the browser', (_, init) => {
    const history = { push: vi.fn() }
    const event = click(init)
    goTo(history, '/order')(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(history.push).not.toHaveBeenCalled()
  })

  it('jumpTo scrolls to the section, smooth unless the user asks for reduced motion', () => {
    const target = document.createElement('section')
    target.id = 'landing-about'
    target.scrollIntoView = vi.fn()
    document.body.append(target)
    window.matchMedia = vi.fn().mockReturnValueOnce({ matches: false }).mockReturnValueOnce({ matches: true })
    const event = click()
    jumpTo('landing-about')(event)
    jumpTo('landing-about')(click())
    expect(event.preventDefault).toHaveBeenCalled()
    expect(target.scrollIntoView).toHaveBeenNthCalledWith(1, { behavior: 'smooth', block: 'start' })
    expect(target.scrollIntoView).toHaveBeenNthCalledWith(2, { behavior: 'auto', block: 'start' })
  })

  it('a section that is not on the page: nothing happens', () => {
    expect(() => jumpTo('landing-missing')(click())).not.toThrow()
  })
})
