import { afterEach, describe, expect, it } from 'vitest'
import { activeSection, containerTop, isPageScroll, pinnedTopInset, scrollParent, stickyTopBottom } from '../scrollContainer'

const rect = (top, height = 0) => () => ({ top, bottom: top + height, left: 0, right: 0, width: 0, height })

const el = (style = {}) => {
  const node = document.createElement('div')
  Object.assign(node.style, style)
  return node
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('scrollParent', () => {
  it('the nearest ancestor whose overflow scrolls', () => {
    const outer = el({ overflowY: 'auto' })
    const middle = el({ overflowY: 'visible' })
    const child = el()
    middle.appendChild(child)
    outer.appendChild(middle)
    document.body.appendChild(outer)
    expect(scrollParent(child)).toBe(outer)
  })

  it('the page without one', () => {
    const child = el()
    document.body.appendChild(child)
    const page = scrollParent(child)
    expect(isPageScroll(page)).toBe(true)
    expect(containerTop(page)).toBe(0)
  })
})

describe('pinnedTopInset', () => {
  it('the lowest edge of what is fixed at the container\'s top, not the own bar nor what floats lower', () => {
    const container = el({ overflowY: 'auto' })
    container.getBoundingClientRect = rect(100, 600)
    const row = el({ position: 'fixed' })
    row.getBoundingClientRect = rect(100, 70)
    const lower = el({ position: 'fixed' })
    lower.getBoundingClientRect = rect(400, 50)
    const still = el()
    still.getBoundingClientRect = rect(100, 300)
    const own = el({ position: 'fixed' })
    own.getBoundingClientRect = rect(100, 200)
    container.append(row, lower, still, own)
    document.body.appendChild(container)
    expect(pinnedTopInset(container, own)).toBe(70)
  })

  it('a fixed button near the top (the modal\'s close) counts to its bottom', () => {
    const container = el({ overflowY: 'auto' })
    container.getBoundingClientRect = rect(0, 600)
    const header = el()
    const close = el({ position: 'fixed' })
    close.getBoundingClientRect = rect(17, 40)
    header.appendChild(close)
    container.appendChild(header)
    document.body.appendChild(container)
    expect(pinnedTopInset(container)).toBe(57)
  })

  it('0 for the page or none', () => {
    expect(pinnedTopInset(document.scrollingElement || document.documentElement)).toBe(0)
    expect(pinnedTopInset(null)).toBe(0)
  })
})

describe('stickyTopBottom', () => {
  const bar = (height) => {
    const node = el()
    node.setAttribute('data-sticky-top', '')
    Object.defineProperty(node, 'offsetHeight', { configurable: true, value: height })
    return node
  }

  it('what the container pins plus its marked sticky bars, not a nested scroller\'s nor unmarked ones', () => {
    const container = el({ overflowY: 'auto' })
    container.getBoundingClientRect = rect(100, 600)
    const row = el({ position: 'fixed' })
    row.getBoundingClientRect = rect(100, 70)
    const wrapper = el()
    wrapper.appendChild(bar(48))
    const unmarked = el()
    Object.defineProperty(unmarked, 'offsetHeight', { configurable: true, value: 300 })
    const nested = el({ overflowY: 'auto' })
    nested.appendChild(bar(40))
    container.append(row, wrapper, unmarked, nested)
    document.body.appendChild(container)
    expect(stickyTopBottom(container)).toBe(70 + 48)
  })

  it('the bars alone without anything pinned; stacked bars add up', () => {
    const container = el({ overflowY: 'auto' })
    container.getBoundingClientRect = rect(0, 600)
    container.append(bar(48), bar(20))
    document.body.appendChild(container)
    expect(stickyTopBottom(container)).toBe(68)
  })

  it('a bar sticks at the container\'s padding plus its resolved top', () => {
    const container = el({ overflowY: 'auto', paddingTop: '30px' })
    const navigation = bar(48)
    navigation.style.top = '14px'
    container.appendChild(navigation)
    document.body.appendChild(container)
    expect(stickyTopBottom(container)).toBe(30 + 14 + 48)
  })

  it('reads the resolved top, not the custom property it is built from (unresolved calc reads back as text)', () => {
    const container = el({ overflowY: 'auto', paddingTop: '30px' })
    const navigation = bar(41)
    navigation.style.setProperty('--sticky-top-inset', 'max(calc(20px + 40px), 0px)')
    navigation.style.top = '30px'
    container.appendChild(navigation)
    document.body.appendChild(container)
    expect(stickyTopBottom(container)).toBe(30 + 30 + 41)
  })

  it('the page has no padding to add', () => {
    const navigation = bar(41)
    navigation.style.top = '12px'
    document.body.appendChild(navigation)
    expect(stickyTopBottom(document.scrollingElement || document.documentElement)).toBe(12 + 41)
  })

  it('0 without pinned chrome nor bars, for the page and none', () => {
    const container = el({ overflowY: 'auto' })
    container.getBoundingClientRect = rect(0, 600)
    container.appendChild(el())
    document.body.appendChild(container)
    expect(stickyTopBottom(container)).toBe(0)
    expect(stickyTopBottom(document.scrollingElement || document.documentElement)).toBe(0)
    expect(stickyTopBottom(null)).toBe(0)
  })
})

describe('activeSection', () => {
  const sections = (...tops) => tops.map((top) => {
    const node = el()
    node.getBoundingClientRect = rect(top)
    return node
  })
  const container = ({ scrollTop = 0, clientHeight = 500, scrollHeight = 2000 } = {}) => ({ scrollTop, clientHeight, scrollHeight })

  it('the last section whose top reached the line, the first before any', () => {
    const list = sections(-300, 120, 600)
    expect(activeSection(container(), list, 150)).toBe(list[1])
    const later = sections(200, 600)
    expect(activeSection(container(), later, 150)).toBe(later[0])
  })

  it('the last at the end of the scroll', () => {
    const list = sections(-300, 120, 600)
    expect(activeSection(container({ scrollTop: 1500 }), list, 150)).toBe(list[2])
  })

  it('null without sections', () => {
    expect(activeSection(container(), [], 150)).toBeNull()
  })
})
