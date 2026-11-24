import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const directory = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(directory, '../index.css'), 'utf8')

describe('mobile form typography', () => {
  let stylesheet
  let mobileRule

  beforeEach(() => {
    stylesheet = document.createElement('style')
    stylesheet.textContent = css
    document.head.appendChild(stylesheet)
    mobileRule = Array.from(stylesheet.sheet.cssRules).find(rule =>
      rule.media?.mediaText === '(max-width: 1024px), (pointer: coarse)'
    )
  })

  afterEach(() => {
    stylesheet.remove()
  })

  const getFieldRule = () => {
    expect(mobileRule).toBeDefined()
    return mobileRule.cssRules[0]
  }

  it('sets a 16px minimum while respecting a larger root font size', () => {
    const rule = getFieldRule()
    expect(rule.style.getPropertyValue('font-size')).toBe('max(16px, 1rem)')
    expect(rule.style.getPropertyPriority('font-size')).toBe('important')
  })

  it.each([undefined, 'text', 'search', 'email', 'password', 'tel', 'url', 'number', 'date', 'time', 'datetime-local', 'month', 'week'])(
    'covers input type %s, including inputs without an explicit type', type => {
      const input = document.createElement('input')
      if (type) input.type = type
      document.body.appendChild(input)
      expect(input.matches(getFieldRule().selectorText)).toBe(true)
      input.remove()
    }
  )

  it.each(['textarea', 'select'])('covers %s fields in portals outside the app root', tag => {
    const field = document.createElement(tag)
    document.body.appendChild(field)
    expect(field.matches(getFieldRule().selectorText)).toBe(true)
    field.remove()
  })

  it.each(['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'hidden', 'image'])(
    'does not resize non-text input type %s', type => {
      const input = document.createElement('input')
      input.type = type
      document.body.appendChild(input)
      expect(input.matches(getFieldRule().selectorText)).toBe(false)
      input.remove()
    }
  )

  it('keeps the override scoped to small viewports or coarse-pointer devices', () => {
    getFieldRule()
    const unscopedRules = Array.from(stylesheet.sheet.cssRules).filter(rule => !rule.media)
    expect(unscopedRules.some(rule => rule.style?.getPropertyValue('font-size'))).toBe(false)
  })

  it('preserves user-controlled viewport zoom', () => {
    const html = readFileSync(resolve(directory, '../../index.html'), 'utf8')
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)[1]
    // interactive-widget: Chrome for Android resizes the layout with the keyboard; zoom stays the person's
    expect(viewport).toBe('width=device-width, initial-scale=1, interactive-widget=resizes-content')
  })
})
