// Adapted from shadcn/ui's Base UI popover (apps/v4/registry/bases/base/ui/popover.tsx,
// commit 7c9eaba1c0a6404c990c144a654792e3313c650d, MIT): the API and the parts are
// shadcn's, the look is the theme's.
import React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cva } from 'class-variance-authority'
import { useTheme } from 'styled-components'
import { POPOVER_ARROW_HEIGHT } from '~ui/src/styles/Rules'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { MENU_SCROLLBAR, menuScrollbarVars } from './menuScrollbar'
import '../styles.css'

// TOKEN-GAP(implementation notes): the schema has no `components.popover`; a popover is a
// floating box like the menu, so it reads `components.menu` (background, radius,
// border, shadow, max width, motion, and the text of its items).

// Layering is not a theme value. A popover of the page (the header's cart, address
// and moment) sits where the legacy popovers and lists do (10002), below the legacy
// Popup and the Dialog (20002) and the Sheet (20601): a modal opened after it, or
// from it, covers it whatever the order they were added to the body. One that opens
// from inside a dialog or a sheet is `layer='modal'`, above both: Base UI appends
// each portal to the body at its opening, so at that level the later one is on top.
// Each class is spelled whole so Tailwind sees it.
export const POPOVER_LAYER = 'ui:z-10002'
export const POPOVER_MODAL_LAYER = 'ui:z-20602'

// The portal is the lowest common ancestor of the positioner and the popup, so it
// carries `components.menu`, in the theme in scope (a `ComponentScope` group's).
// Base UI marks it `data-base-ui-portal`: `isInsideOverlay` (src/utils/overlay.js)
// counts a click inside the popover as inside a layer, as it does for a dialog.
export const popoverVars = (theme) => componentVars(theme, 'menu', { radius: 'md' })

const positioner = cva('ui:isolate', {
  variants: { layer: { page: POPOVER_LAYER, modal: POPOVER_MODAL_LAYER } },
  defaultVariants: { layer: 'page' }
})

// `content` fits what is inside up to the menu's maximum width, `menu` is always that
// width (the cart's), `anchor` is the width of what it opens from. Never wider than
// what the screen leaves (`--available-width` is Base UI's).
const popup = cva(
  [
    'ui:flex ui:max-h-(--available-height) ui:flex-col ui:overflow-hidden ui:outline-none ui:box-border',
    'ui:max-w-[min(var(--ui-menu-max-width),var(--available-width))]',
    'ui:bg-(--ui-menu-background) ui:text-popover-foreground ui:rounded-(--ui-menu-radius) ui:[border:var(--ui-menu-border,none)] ui:[box-shadow:var(--ui-menu-shadow,none)]',
    // TOKEN-GAP(implementation notes): the room between the trigger and the popover has no property
    // (legacy: 12px the cart, 7px the lists, both off the scale); a space level, on the side it opens
    'ui:data-[side=bottom]:mt-xs ui:data-[side=top]:mb-xs ui:data-[side=left]:mr-xs ui:data-[side=right]:ml-xs',
    // fades in and out with the menu's own speed (0ms when the theme does not animate it), never with reduced motion;
    // Base UI marks the first and last frame with data-starting-style / data-ending-style
    'ui:motion-safe:transition-opacity ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing)',
    'ui:data-starting-style:opacity-0 ui:data-ending-style:opacity-0'
  ],
  {
    variants: {
      width: {
        content: 'ui:w-max',
        menu: 'ui:w-(--ui-menu-max-width)',
        anchor: 'ui:w-(--anchor-width)'
      }
    },
    defaultVariants: { width: 'content' }
  }
)

// `modal`, `open`, `defaultOpen`, `onOpenChange(open, details)` (`details.reason` says why: 'outside-press',
// 'escape-key', 'trigger-press', 'close-press'…), `actionsRef` and `handle` are Base UI's.
const Popover = (props) => <PopoverPrimitive.Root {...props} />

// What opens it, a `button`; `render={<Button … />}` makes it the theme's button.
const PopoverTrigger = (props) => <PopoverPrimitive.Trigger data-slot='popover-trigger' {...props} />

const PopoverClose = (props) => <PopoverPrimitive.Close data-slot='popover-close' {...props} />

/**
 * The floating box, in a portal. Its look is `components.menu` of the theme in scope.
 *
 * - `side` (`bottom` default, `top`, `left`, `right`) and `align` (`center` default, `start`,
 *   `end`): where it opens from; it flips to the other side when the screen has no room.
 *   `anchor`: an element to place it against instead of the trigger (the header's capsule).
 *   `positionMethod='fixed'` for an anchor in a fixed header; it follows the anchor when the
 *   page scrolls, the window changes or the header moves away (Base UI keeps it anchored).
 * - `width`: `'content'` (default), `'menu'` or `'anchor'`. `layer`: `'page'` (default) or
 *   `'modal'` for one opened inside a dialog or a sheet.
 * - It closes with Escape, a press outside, or `PopoverClose`; focus goes in (the first
 *   control, or the popup when opened by touch; `initialFocus` changes it) and returns to what
 *   opened it (`finalFocus`). It has no padding: its content has its own.
 * - Name it with `PopoverTitle` (it labels the popup) and `PopoverDescription`, or `aria-label`.
 * - Anything else (`collisionPadding`, `sideOffset`…) goes to the positioner; `initialFocus`,
 *   `finalFocus`, `aria-*` and `className` to the popup. `onOpenChange` of the root can read
 *   `details.event` with `isInsideOverlay` to keep it open over a legacy modal.
 */
const PopoverContent = ({
  className, children, side = 'bottom', align = 'center', layer = 'page', width = 'content', initialFocus, finalFocus,
  anchor, positionMethod, sideOffset, alignOffset, collisionPadding, collisionAvoidance, ...props
}) => {
  const theme = useTheme()
  const placement = { side, align, anchor, positionMethod, sideOffset, alignOffset, collisionPadding, collisionAvoidance }
  Object.keys(placement).forEach((name) => placement[name] === undefined && delete placement[name])
  return (
    <PopoverPrimitive.Portal style={popoverVars(theme)}>
      <PopoverPrimitive.Positioner data-slot='popover-positioner' className={positioner({ layer })} {...placement}>
        <PopoverPrimitive.Popup
          data-slot='popover-content'
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          className={cn(popup({ width }), className)}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

/**
 * The pointer of a popover that something else places (Popper's `arrow` modifier): a decorative
 * triangle that sits above the panel's top edge, so the panel must be `position: absolute`
 * or `relative`. Pass the engine's `ref` and `style`. It points from the menu's background;
 * `background` (a CSS color) is for a panel painted with another surface (the cart's).
 * The geometry is fixed artwork, 14 by 8 px (`POPOVER_ARROW_HEIGHT`), and follows no store spacing.
 */
const PopoverArrow = React.forwardRef(({ className, style, background, ...props }, ref) => (
  <div
    {...props}
    ref={ref}
    aria-hidden='true'
    data-slot='popover-arrow'
    className={cn(
      // The same height shifts it above the panel and gives its width (7:4).
      'ui:absolute ui:top-[calc(-1*var(--ui-popover-arrow-height))] ui:h-(--ui-popover-arrow-height) ui:aspect-[7/4]',
      'ui:bg-(--ui-popover-arrow-background,var(--ui-menu-background)) ui:[clip-path:polygon(50%_0,100%_100%,0_100%)]',
      className
    )}
    style={{ '--ui-popover-arrow-height': POPOVER_ARROW_HEIGHT, ...(background && { '--ui-popover-arrow-background': background }), ...style }}
  />
))
PopoverArrow.displayName = 'PopoverArrow'

/**
 * `variant='arrow'` paints an externally positioned menu. The caller owns
 * anchor placement and dismissal, and passes the placement engine's arrow
 * ref and style through `arrow`. Its panel and scrollbar use the menu theme.
 */
const PopoverPanel = React.forwardRef(({ variant, arrow, children, className, style, ...props }, ref) => {
  const theme = useTheme()
  const vars = popoverVars(theme)
  const pointed = variant === 'arrow'
  return (
    <div
      {...props}
      ref={ref}
      data-slot='popover-content'
      className={cn(
        'ui:bg-(--ui-menu-background) ui:text-text ui:rounded-(--ui-menu-radius) ui:[border:var(--ui-menu-border,none)] ui:[box-shadow:var(--ui-menu-shadow,none)]',
        pointed && [
          // it still trims the store's menu `max_width` (the width below), as the 500px it replaces did
          'ui:max-w-[min(100%,62ch)]',
          'ui:max-h-[70vh] ui:w-(--ui-menu-max-width) ui:z-10002 ui:p-none',
          'ui:motion-safe:animate-[theme-fade-in_var(--ui-menu-motion-duration)_var(--ui-menu-motion-easing)_both]'
        ],
        className
      )}
      style={{ ...vars, ...menuScrollbarVars(theme, vars['--ui-menu-radius']), '--layer-background': vars['--ui-menu-background'], ...style }}
    >
      {pointed
        ? <div data-slot='popover-scroll' className={cn('ui:[max-height:inherit] ui:overflow-y-auto ui:[border-radius:inherit]', MENU_SCROLLBAR)}>{children}</div>
        : children}
      {pointed && <PopoverArrow {...arrow} />}
    </div>
  )
})
PopoverPanel.displayName = 'PopoverPanel'

// The menu's own text style (`components.menu.base.item_text`), in the popover's text color.
const TITLE = [
  'ui:m-none ui:text-foreground ui:break-words',
  'ui:text-(length:--ui-menu-item-text-size) ui:leading-(--ui-menu-item-text-line) ui:font-(weight:--ui-menu-item-text-weight) ui:font-(family-name:--ui-menu-item-text-family)'
]

const PopoverTitle = ({ className, ...props }) => (
  <PopoverPrimitive.Title data-slot='popover-title' className={cn(TITLE, className)} {...props} />
)

const PopoverDescription = ({ className, ...props }) => (
  <PopoverPrimitive.Description
    data-slot='popover-description'
    className={cn(TITLE, 'ui:text-muted-foreground', className)}
    {...props}
  />
)

export { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverPanel, PopoverDescription, PopoverTitle, PopoverTrigger }
