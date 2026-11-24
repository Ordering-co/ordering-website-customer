import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Avatar } from '../Avatar'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

// Base UI preloads the photo with `new Image()` and shows its `<img>` once it loaded: jsdom never loads one
beforeEach(() => {
  vi.stubGlobal('Image', function FakeImage () {
    this.complete = false
    this.naturalWidth = 0
    Object.defineProperty(this, 'src', {
      get: () => this.url,
      set: (value) => {
        this.url = value
        queueMicrotask(() => (/broken/.test(value) ? this.onerror : this.onload)?.())
      }
    })
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('Avatar: the photo and its fallback', () => {
  it('shows the photo once it loads, covering the avatar, and no fallback', async () => {
    const { container } = draw(<Avatar src='/driver.jpg' alt='Ana' />)
    const img = await waitFor(() => {
      const found = container.querySelector('img')
      expect(found).toBeTruthy()
      return found
    })
    expect(img.getAttribute('src')).toBe('/driver.jpg')
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('data-slot')).toBe('avatar-image')
    expect(img.getAttribute('class')).toContain('ui:object-cover')
    // this sheet paints `ui:max-w-none` as `max-width: 0`: the photo would collapse
    expect(img.getAttribute('class')).not.toContain('max-w-none')
    expect(container.querySelector('[data-slot=avatar-fallback]')).toBeNull()
  })

  it('without a photo, the user icon at the size\'s icon, on the theme\'s background and color', () => {
    const { container } = draw(<Avatar alt='Ana' />)
    const fallback = container.querySelector('[data-slot=avatar-fallback]')
    expect(fallback).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
    expect(fallback.querySelector('svg')).toBeTruthy()
    const classes = fallback.getAttribute('class')
    expect(classes).toContain('ui:bg-(--ui-avatar-background)')
    expect(classes).toContain('ui:text-(--ui-avatar-color)')
    expect(classes).toContain('ui:[&_svg]:size-(--ui-avatar-icon-size)')
  })

  it('an empty or blank photo is no photo, and a photo that fails to load falls back', async () => {
    const empty = draw(<Avatar src='   ' alt='Ana' />)
    expect(empty.container.querySelector('img')).toBeNull()
    expect(empty.container.querySelector('[data-slot=avatar-fallback]')).toBeTruthy()
    empty.unmount()
    const broken = draw(<Avatar src='/broken.jpg' alt='Ana' />)
    await waitFor(() => expect(broken.container.querySelector('[data-slot=avatar-image]')).toBeNull())
    expect(broken.container.querySelector('[data-slot=avatar-fallback] svg')).toBeTruthy()
  })

  it('a fallback of the caller replaces the icon: the initials, in the avatar\'s color', () => {
    const { container, getByRole } = draw(<Avatar alt='Ana Díaz' fallback='AD' />)
    const fallback = container.querySelector('[data-slot=avatar-fallback]')
    expect(fallback.textContent).toBe('AD')
    expect(fallback.querySelector('svg')).toBeNull()
    expect(fallback.getAttribute('class')).toContain('ui:text-(length:--ui-avatar-icon-size)')
    // the initials are not read twice: the avatar is named by its alt
    expect(getByRole('img', { name: 'Ana Díaz' })).toBeTruthy()
  })
})

describe('Avatar: accessibility', () => {
  it('with an alt it is an image with that name; the glyph inside adds nothing', () => {
    const { getByRole } = draw(<Avatar alt='Ana, your driver' />)
    const avatar = getByRole('img', { name: 'Ana, your driver' })
    expect(avatar.tagName).toBe('SPAN')
    expect(avatar.getAttribute('data-slot')).toBe('avatar')
    expect(avatar.hasAttribute('aria-hidden')).toBe(false)
  })

  it('without an alt (or a blank one) it is decoration: hidden from assistive technology', () => {
    const { container, queryByRole, rerender } = draw(<Avatar />)
    const root = () => container.querySelector('[data-slot=avatar]')
    expect(root().getAttribute('aria-hidden')).toBe('true')
    expect(root().hasAttribute('role')).toBe(false)
    expect(queryByRole('img')).toBeNull()
    rerender(<ThemeProvider theme={defaults}><Avatar alt='  ' /></ThemeProvider>)
    expect(root().getAttribute('aria-hidden')).toBe('true')
  })
})

describe('Avatar: the theme', () => {
  it('writes components.avatar on its own root: the default is md', () => {
    const { container } = draw(<Avatar alt='Ana' />)
    const root = container.querySelector('[data-slot=avatar]')
    expect(vars(root)).toEqual(componentVars(defaults, 'avatar', { size: 'md' }))
    const view = getThemeCss(defaults, 'avatar')
    expect(vars(root)).toMatchObject({
      '--ui-avatar-size': view.sizes.md.size,
      '--ui-avatar-icon-size': view.sizes.md.icon_size,
      '--ui-avatar-radius': view.base.radius,
      '--ui-avatar-background': view.base.background,
      '--ui-avatar-color': view.base.color,
      '--ui-avatar-border': 'none',
      '--ui-avatar-shadow': view.base.shadow.css
    })
  })

  it.each([['defaults', defaults], ['grill', grill], ['cafe', cafe]])('every size is the theme\'s in %s, a length it gives ready', (name, theme) => {
    ;['sm', 'md', 'lg', 'xl'].forEach((size) => {
      const { container, unmount } = draw(<Avatar size={size} alt='Ana' />, theme)
      const root = vars(container.querySelector('[data-slot=avatar]'))
      expect(root).toEqual(componentVars(theme, 'avatar', { size }))
      expect(root['--ui-avatar-size']).toBe(getThemeCss(theme, 'avatar').sizes[size].size)
      expect(root['--ui-avatar-icon-size']).toBe(getThemeCss(theme, 'avatar').sizes[size].icon_size)
      unmount()
    })
  })

  it('a size the theme lacks is md; a store\'s border and background are the theme\'s', () => {
    const unknown = draw(<Avatar size='huge' alt='Ana' />, cafe)
    expect(vars(unknown.container.querySelector('[data-slot=avatar]'))['--ui-avatar-size']).toBe(getThemeCss(cafe, 'avatar').sizes.md.size)
    expect(vars(unknown.container.querySelector('[data-slot=avatar]'))['--ui-avatar-border']).toBe(getThemeCss(cafe, 'avatar').base.border)
    expect(vars(unknown.container.querySelector('[data-slot=avatar]'))['--ui-avatar-background']).toBe(getThemeCss(cafe, 'avatar').base.background)
  })

  it('no value is written in its classes: only variables of the theme; the box does not shrink in a row', () => {
    const { container } = draw(<Avatar alt='Ana' />)
    const classes = container.querySelector('[data-slot=avatar]').getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms|\d+px/i)
    ;['ui:size-(--ui-avatar-size)', 'ui:rounded-(--ui-avatar-radius)', 'ui:[border:var(--ui-avatar-border)]', 'ui:[box-shadow:var(--ui-avatar-shadow)]', 'ui:shrink-0', 'ui:overflow-hidden']
      .forEach((name) => expect(classes).toContain(name))
  })

  it('reads the theme of its context: a nested provider\'s over the outer one (no group of the schema scopes the avatar today)', () => {
    const { getByTestId } = draw(
      <>
        <Avatar data-testid='outer' alt='Ana' />
        <ThemeProvider theme={cafe}><Avatar data-testid='nested' alt='Ana' /></ThemeProvider>
      </>,
      grill
    )
    expect(vars(getByTestId('outer'))).toEqual(componentVars(grill, 'avatar', { size: 'md' }))
    expect(vars(getByTestId('nested'))).toEqual(componentVars(cafe, 'avatar', { size: 'md' }))
    expect(vars(getByTestId('nested'))['--ui-avatar-background']).not.toBe(vars(getByTestId('outer'))['--ui-avatar-background'])
  })

  it('the caller\'s class wins over the piece\'s, its style over the variables, and the ref and native props reach the root', () => {
    const ref = React.createRef()
    const { container } = draw(<Avatar ref={ref} alt='Ana' className='ui:rounded-none' style={{ '--ui-avatar-size': '10px' }} data-testid='who' />)
    const root = container.querySelector('[data-slot=avatar]')
    expect(ref.current).toBe(root)
    expect(root.getAttribute('data-testid')).toBe('who')
    expect(root.getAttribute('class')).toContain('ui:rounded-none')
    expect(root.getAttribute('class')).not.toContain('ui:rounded-(--ui-avatar-radius)')
    expect(root.style.getPropertyValue('--ui-avatar-size')).toBe('10px')
  })
})

it.each([['defaults', defaults], ['grill', grill]])('keeps the native photo available immediately and falls back on error in %s', (name, theme) => {
  const { container } = draw(<Avatar variant='photo' size='lg' src='/driver.jpg' />, theme)
  const image = container.querySelector('img')
  expect(image.getAttribute('src')).toBe('/driver.jpg')
  expect(container.querySelector('[data-slot=avatar-fallback]')).toBeNull()
  expect(vars(container.firstChild)['--ui-avatar-size']).toBe(getThemeCss(theme, 'avatar').sizes.lg.size)
  fireEvent.error(image)
  expect(container.querySelector('[data-slot=avatar-fallback] svg')).toBeTruthy()
})

it.each([['defaults', defaults], ['grill', grill]])('uses the theme space at the logical end of a driver row in %s', (name, theme) => {
  const { container } = draw(<Avatar size='md' endSpace='md' />, theme)
  expect(container.querySelector('[data-slot=avatar]').className).toContain('ui:me-md')
})

it.each([['defaults', defaults], ['grill', grill]])('uses the theme typography for review initials in %s', (name, theme) => {
  const { container, rerender } = draw(<Avatar size='lg' fallback='A' initialsText='display' />, theme)
  const root = () => container.firstChild
  expect(root().style.fontSize).toBe(theme.css.tokens.typography.display.size)
  expect(root().style.fontWeight).toBeTruthy()
  expect(root().className).toContain('ui:mr-lg')
  rerender(<ThemeProvider theme={theme}><Avatar size='md' fallback='A' initialsText='h2' /></ThemeProvider>)
  expect(root().style.fontSize).toBe(theme.css.tokens.typography.h2.size)
})
