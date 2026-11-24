import React from 'react'
import { useTheme } from 'styled-components'
import { cva } from 'class-variance-authority'
import { themeBorderWidth, themeShadow } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { MENU_SCROLLBAR, menuScrollbarVars } from './menuScrollbar'
import '../styles.css'

const navigationItem = cva(
  [
    'ui:relative ui:box-content ui:flex ui:items-center ui:justify-between ui:appearance-none ui:cursor-pointer',
    'ui:m-none ui:px-(--ui-menu-padding-x) ui:py-none ui:min-h-(--ui-menu-item-height) ui:text-start ui:text-inherit',
    'ui:[width:calc(100%-var(--ui-menu-indent)-2*var(--ui-menu-padding-x))] ui:ml-(--ui-menu-indent)',
    'ui:[border:none] ui:rounded-none ui:bg-transparent ui:hover:bg-(--ui-menu-item-hover)',
    'ui:aria-[current=true]:bg-(--ui-menu-item-selected) ui:aria-[current=true]:hover:bg-(--ui-menu-item-selected)',
    'ui:active:[box-shadow:var(--ui-menu-navigation-pressed-shadow)] ui:hover:active:[box-shadow:none] ui:[&[hidden]]:hidden',
    'ui:font-(family-name:--ui-menu-item-text-family) ui:text-(length:--ui-menu-item-text-size) ui:leading-(--ui-menu-item-text-line) ui:font-(weight:--ui-menu-item-text-weight)',
    'ui:[letter-spacing:var(--ui-menu-item-text-letter-spacing,normal)] ui:[text-transform:var(--ui-menu-item-text-transform,none)]',
    'ui:[&>span:first-child]:min-w-[0] ui:[&>span:first-child]:flex-1 ui:[&>span:first-child]:line-clamp-2 ui:[&>span:first-child]:[overflow-wrap:anywhere]',
    /* touch-target */ 'ui:pointer-coarse:before:absolute ui:pointer-coarse:before:inset-x-none ui:pointer-coarse:before:top-none ui:pointer-coarse:before:h-full ui:pointer-coarse:before:min-h-[44px]'
  ],
  {
    variants: {
      divider: { true: 'ui:[border-bottom:var(--ui-menu-navigation-divider,none)]!' },
      popover: {
        true: /* touch-target */ 'ui:max-mobile:min-h-[max(var(--ui-menu-item-height),44px)] ui:pointer-coarse:min-h-[max(var(--ui-menu-item-height),44px)]'
      }
    }
  }
)

/**
 * A navigation-sections row. Activating it may enter a nested menu or jump to
 * an already mounted section. The caller owns those actions and focus return.
 * - `current`: marks the current section and takes the menu's selected color.
 * - `divider`: draws the item divider between top-level sections.
 * - `popover`: retains the existing touch floor inside a scrolling popover.
 *   A sidebar row reserves a transparent touch area between its neighbors.
 * - `indent`: the layout offset of the current depth.
 */
const MenuNavigationItem = React.forwardRef(({ current, divider, popover, hidden, indent = 0, className, style, ...props }, ref) => {
  const theme = useTheme()
  const button = (
    <button
      ref={ref}
      hidden={hidden}
      type='button'
      data-slot='menu-navigation-item'
      aria-current={current || undefined}
      className={cn(navigationItem({ divider, popover }), className)}
      style={{
        ...componentVars(theme, 'menu'),
        '--ui-menu-indent': `${indent}px`,
        '--ui-menu-navigation-divider': componentVars(theme, 'divider', { variant: 'item' })['--ui-divider-line'],
        '--ui-menu-navigation-pressed-shadow': themeShadow(theme, 'md', { fixed: true }),
        ...style
      }}
      {...props}
    />
  )
  if (popover) return button
  return (
    <div
      data-slot='menu-navigation-cell'
      hidden={hidden}
      className={/* touch-target */ 'ui:pointer-coarse:min-h-[calc(44px+var(--ui-menu-touch-gap))] ui:[&[hidden]]:hidden'}
      style={{ '--ui-menu-touch-gap': themeBorderWidth(theme, 'thin', { fixed: true }) }}
    >
      {button}
    </div>
  )
})
MenuNavigationItem.displayName = 'MenuNavigationItem'

/**
 * The box of a menu with no trigger of its own (a list of suggestions that hangs from a field):
 * `components.menu` background, radius, border and shadow, its fade in (the menu's own motion),
 * and the scrollbar of a menu list. It scrolls vertically when the caller caps its height.
 * It has no layout: the caller places it (position, width, layer) and names it
 * (`role='listbox'`, `aria-label`). Its rows are `MenuNavigationItem`s or the caller's.
 * A list opened from a button is a `Popover` or a `Select`.
 */
const MenuSurface = React.forwardRef(({ className, style, ...props }, ref) => {
  const theme = useTheme()
  const vars = componentVars(theme, 'menu', { radius: 'md' })
  return (
    <div
      ref={ref}
      data-slot='menu-surface'
      className={cn(
        'ui:box-border ui:overflow-y-auto ui:overflow-x-hidden ui:rounded-(--ui-menu-radius) ui:bg-(--ui-menu-background) ui:[border:var(--ui-menu-border,none)] ui:[box-shadow:var(--ui-menu-shadow,none)]',
        'ui:motion-safe:animate-[theme-fade-in_var(--ui-menu-motion-duration)_var(--ui-menu-motion-easing)_both]',
        MENU_SCROLLBAR,
        className
      )}
      style={{ ...vars, ...menuScrollbarVars(theme, vars['--ui-menu-radius']), ...style }}
      {...props}
    />
  )
})
MenuSurface.displayName = 'MenuSurface'

export { MenuNavigationItem, MenuSurface }
