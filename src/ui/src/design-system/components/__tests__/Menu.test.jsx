import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { THEMES } from '../../preview/themes'
import { MenuNavigationItem, MenuSurface } from '../Menu'

describe('Menu navigation sections', () => {
  it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('uses the $id menu without selecting a value', ({ theme }) => {
    const onClick = vi.fn()
    render(
      <ThemeProvider theme={theme}>
        <MenuNavigationItem current divider onClick={onClick}>Pantry</MenuNavigationItem>
      </ThemeProvider>
    )
    const button = screen.getByRole('button', { name: 'Pantry', current: true })
    const menu = getThemeCss(theme, 'menu').base
    expect(button.style.getPropertyValue('--ui-menu-item-height')).toBe(menu.item_height)
    expect(button.style.getPropertyValue('--ui-menu-item-hover')).toBe(menu.item_hover)
    expect(button.style.getPropertyValue('--ui-menu-item-selected')).toBe(menu.item_selected)
    expect(button.className).toContain('ui:aria-[current=true]:bg-(--ui-menu-item-selected)')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

it('preserves the pointer hover paint when a row is held down', () => {
  render(<ThemeProvider theme={defaultsTheme()}><MenuNavigationItem>Pantry</MenuNavigationItem></ThemeProvider>)
  expect(screen.getByRole('button', { name: 'Pantry' }).className).toContain('ui:hover:active:[box-shadow:none]')
})

const defaultsTheme = () => THEMES.find(({ id }) => id === 'defaults').theme

describe('MenuSurface: the box and scrollbar of a menu with no trigger of its own', () => {
  it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('paints components.menu and its scrollbar in $id', ({ theme }) => {
    render(<ThemeProvider theme={theme}><MenuSurface role='listbox' aria-label='Suggestions' className='extra'><button type='button'>One</button></MenuSurface></ThemeProvider>)
    const surface = screen.getByRole('listbox', { name: 'Suggestions' })
    const menu = getThemeCss(theme, 'menu').base
    expect(surface.getAttribute('data-slot')).toBe('menu-surface')
    expect(surface.style.getPropertyValue('--ui-menu-background')).toBe(menu.background)
    expect(surface.style.getPropertyValue('--ui-menu-radius')).toBe(menu.radius)
    expect(surface.style.getPropertyValue('--ui-select-scrollbar-size')).not.toBe('')
    expect(surface.className).toContain('ui:bg-(--ui-menu-background)')
    expect(surface.className).toContain('ui:overflow-y-auto')
    expect(surface.className).toContain('ui:[&::-webkit-scrollbar]:w-(--ui-select-scrollbar-size)')
    expect(surface.className).toContain('extra')
    expect(screen.getByRole('button', { name: 'One' })).toBeTruthy()
  })

  it('has no layout of its own: no position, width or layer', () => {
    render(<ThemeProvider theme={defaultsTheme()}><MenuSurface data-testid='box' /></ThemeProvider>)
    const { className } = screen.getByTestId('box')
    expect(className).not.toMatch(/ui:(absolute|relative|fixed|z-|w-)/)
  })
})
