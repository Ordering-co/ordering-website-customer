// Adapted from shadcn/ui's Base UI tooltip (apps/v4/registry/bases/base/ui/tooltip.tsx,
// commit 7c9eaba1c0a6404c990c144a654792e3313c650d, MIT): the parts are shadcn's, the look is
// the theme's (`components.tooltip`: its surface, text, radius, border, shadow, padding, widest
// width, distance from its control and fade).
import React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { cva } from 'class-variance-authority'
import { useTheme } from 'styled-components'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { ModalHostContext } from '../lib/modalHost'
import '../styles.css'

// Layering is not a theme value: the same two levels as Popover (a tip of the page, and one over a
// dialog or a sheet). Each class is spelled whole so Tailwind sees it.
const positioner = cva('ui:isolate', {
  variants: { layer: { page: 'ui:z-10002', modal: 'ui:z-20602' } },
  defaultVariants: { layer: 'page' }
})

// The room between the control and the tip is the theme's `offset`, on the side it opens;
// it fades in and out at the tooltip's own speed (0ms when the theme does not animate it), never with reduced motion.
const popup = cva([
  'ui:box-border ui:w-max ui:max-w-[min(var(--ui-tooltip-max-width),calc(100vw-2*var(--ot-space-lg)))] ui:text-start ui:whitespace-normal ui:[overflow-wrap:anywhere] ui:[unicode-bidi:plaintext]',
  'ui:bg-(--ui-tooltip-background) ui:text-(--ui-tooltip-color) ui:rounded-(--ui-tooltip-radius) ui:p-(--ui-tooltip-padding)',
  'ui:[border:var(--ui-tooltip-border,none)] ui:[box-shadow:var(--ui-tooltip-shadow,none)]',
  'ui:font-(family-name:--ui-tooltip-text-family) ui:text-(length:--ui-tooltip-text-size) ui:leading-(--ui-tooltip-text-line) ui:font-(weight:--ui-tooltip-text-weight)',
  'ui:data-[side=top]:mb-(--ui-tooltip-offset) ui:data-[side=bottom]:mt-(--ui-tooltip-offset) ui:data-[side=left]:mr-(--ui-tooltip-offset) ui:data-[side=right]:ml-(--ui-tooltip-offset)',
  'ui:motion-safe:transition-opacity ui:motion-safe:duration-(--ui-tooltip-motion-duration) ui:motion-safe:ease-(--ui-tooltip-motion-easing)',
  'ui:data-starting-style:opacity-0 ui:data-ending-style:opacity-0'
])

// Base UI's popup has no role and its trigger no description: the tip is `role='tooltip'` and
// describes the trigger by this id, as the legacy tip did.
const TipId = React.createContext(undefined)

/** Shares the opening delay of the tips under it (once one is open, the next opens at once): `delay`, `closeDelay`, `timeout`. */
const TooltipProvider = (props) => <TooltipPrimitive.Provider {...props} />

/**
 * A short text about a control. `open`, `defaultOpen`, `onOpenChange(open, details)`, `disabled`
 * are Base UI's; the tip is hoverable (the pointer can cross to it) unless `disableHoverablePopup`.
 */
const Tooltip = (props) => {
  const id = React.useId()
  return <TipId.Provider value={id}><TooltipPrimitive.Root {...props} /></TipId.Provider>
}

/**
 * What the tip describes: a `button` (or the element `render` gives, `render={<Button … />}`).
 * It opens with the pointer (after `delay`, 600 ms; `closeDelay` to leave) and with the keyboard
 * focus; Escape or pressing it closes it. `closeOnClick={false}` keeps it open on a press.
 * While open it describes the trigger (`aria-describedby`): the text is not its name.
 */
const TooltipTrigger = (props) => {
  const id = React.useContext(TipId)
  return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} aria-describedby={[props['aria-describedby'], id].filter(Boolean).join(' ')} />
}

/**
 * The tip, in a portal that carries `components.tooltip` of the theme in scope.
 *
 * - `side` (`top` default, `bottom`, `left`, `right`) and `align` (`center` default, `start`, `end`):
 *   where it opens from; it flips when the screen has no room. `layer`: `'page'` or `'modal'` (over a
 *   dialog or a sheet); by default the tip takes the one of where it is (a Dialog or Sheet above it: `'modal'`).
 * - Text only: no controls inside (a tip is not interactive content; use a `Popover`).
 * - Anything else (`sideOffset`, `collisionPadding`, `anchor`…) goes to the positioner; `className`
 *   and `aria-*` to the popup.
 */
const TooltipContent = ({ className, children, side = 'top', align = 'center', layer, anchor, sideOffset, alignOffset, collisionPadding, ...props }) => {
  const theme = useTheme()
  const id = React.useContext(TipId)
  const inModal = React.useContext(ModalHostContext)
  const placement = { side, align, anchor, sideOffset, alignOffset, collisionPadding }
  Object.keys(placement).forEach((name) => placement[name] === undefined && delete placement[name])
  return (
    <TooltipPrimitive.Portal style={componentVars(theme, 'tooltip')}>
      <TooltipPrimitive.Positioner data-slot='tooltip-positioner' className={positioner({ layer: layer ?? (inModal ? 'modal' : 'page') })} {...placement}>
        <TooltipPrimitive.Popup id={id} role='tooltip' data-slot='tooltip-content' className={cn(popup(), className)} {...props}>
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
