import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { Avatar, avatarBoxCss, avatarTheme } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

afterEach(cleanup)

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const avatar = values.components.avatar
  avatar.base = { radius: 9999, background: '#2C7BE5', color: '#FFFFFF', border: null, shadow: null }
  avatar.sizes = {
    sm: { size: 36, icon_size: 16 },
    md: { size: 44, icon_size: 20 },
    lg: { size: 65, icon_size: 24 },
    xl: { size: 100, icon_size: 24 }
  }
  mutate(avatar)
  return values
})

describe('components.avatar', () => {
  it('the schema defaults: today\'s sizes 36 / 44 / 65 / 100, a circle on the primary', () => {
    const themed = themeWithValues()
    expect(avatarTheme(themed, 'sm').size).toBe(36)
    expect(avatarTheme(themed, 'md').size).toBe(44)
    expect(avatarTheme(themed, 'lg').size).toBe(65)
    expect(avatarTheme(themed, 'xl').size).toBe(100)
    expect(avatarTheme(themed).radius).toBe(9999)
    expect(avatarTheme(themed).background).toBe(themed.values.tokens.color.primary)
    expect(avatarTheme(themed).color).toBe(themed.values.tokens.color.on_primary)
    expect(avatarTheme(themed, 'md').icon_size).toBe(themed.values.tokens.icon.md)
  })

  it('each size takes its box; md by default; a size the theme lacks is md', () => {
    const { getAllByRole } = renderWith(theme(), (
      <>
        <Avatar src='/a.jpg' alt='Ana' size='sm' />
        <Avatar src='/a.jpg' alt='Ana' />
        <Avatar src='/a.jpg' alt='Ana' size='xl' />
        <Avatar src='/a.jpg' alt='Ana' size='huge' />
      </>
    ))
    const [sm, md, xl, unknown] = getAllByRole('img', { name: 'Ana' })
    expect(cssFor(sm)).toContain('width:36px;height:36px')
    expect(cssFor(md)).toContain('width:44px;height:44px')
    expect(cssFor(xl)).toContain('width:100px;height:100px')
    expect(cssFor(unknown)).toContain('width:44px;height:44px')
  })

  it('the photo covers the box: no fallback colors', () => {
    const { getByRole } = renderWith(theme(), <Avatar src='/a.jpg' alt='Ana' size='lg' />)
    const box = getByRole('img', { name: 'Ana' })
    expect(box.querySelector('img')).toHaveAttribute('src', '/a.jpg')
    expect(box.querySelector('img')).toHaveAttribute('alt', '')
    expect(cssFor(box)).not.toContain('background:#2C7BE5')
    expect(cssFor(box)).toContain('border-radius:9999px')
  })

  it('without a photo: the user icon at the size\'s icon, on the background in its color', () => {
    const { container } = renderWith(theme(), <Avatar size='md' />)
    const box = container.firstChild
    expect(box.querySelector('img')).toBeNull()
    expect(box.querySelector('svg.lucide-user[aria-hidden="true"]')).toBeTruthy()
    const css = cssFor(box)
    expect(css).toContain('background:#2C7BE5')
    expect(css).toContain('color:#FFFFFF')
    expect(css).toMatch(/svg\{width:20px;height:20px/)
  })

  it('a photo that fails to load falls back to the user icon', () => {
    const { container } = renderWith(theme(), <Avatar src='/broken.jpg' />)
    fireEvent.error(container.querySelector('img'))
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg.lucide-user[aria-hidden="true"]')).toBeTruthy()
  })

  it('named (alt) it is an image; without a name it is decorative', () => {
    const named = renderWith(theme(), <Avatar src='/a.jpg' alt='Driver' />)
    expect(named.getByRole('img', { name: 'Driver' })).toBeInTheDocument()
    named.unmount()
    const { container, queryByRole } = renderWith(theme(), <Avatar src='/a.jpg' alt='' />)
    expect(queryByRole('img')).toBeNull()
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('border and shadow of the theme; none when null', () => {
    const { container } = renderWith(theme((a) => {
      a.base.border = { width: 2, style: 'solid', color: '#FFFFFF' }
      a.base.shadow = { x: 0, y: 1, blur: 4, spread: 0, color: '#000000', opacity: 0.1 }
    }), <Avatar src='/a.jpg' />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('border:2px solid #FFFFFF')
    expect(css).toContain('box-shadow:0px 1px 4px 0px rgba(0,0,0,0.1)')
    cleanup()
    const flat = renderWith(theme(), <Avatar src='/a.jpg' />)
    expect(cssFor(flat.container.firstChild)).toContain('border:none')
    expect(cssFor(flat.container.firstChild)).toContain('box-shadow:none')
  })

  it('avatarBoxCss: the box a screen draws takes the size of the theme', () => {
    const look = avatarTheme(themeWithValues(), 'md')
    expect(avatarBoxCss(themeWithValues(), 'md').replace(/\s+/g, '')).toContain(`width:${look.size}px;`)
  })
})
