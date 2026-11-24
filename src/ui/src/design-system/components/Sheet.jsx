// Adapted from shadcn/ui's Base UI sheet (apps/v4/registry/bases/base/ui/sheet.tsx,
// commit 7c9eaba1c0a6404c990c144a654792e3313c650d, MIT): the API and the parts are
// shadcn's. A sheet is the same dialog and the same look (`components.modal`)
// anchored to an edge, so it reuses the dialog's parts and only adds the anchoring.
// Unlike shadcn's (a plain Dialog), it is Base UI's Drawer (a Dialog with swipe to
// dismiss: same store, same Title / Description / Close / Trigger), chosen over
// gestures of our own on the Dialog: it already arbitrates the swipe
// with a scrolling content, velocity, axis lock, touch and text selection.
import React, { createContext, useContext, useLayoutEffect, useState } from 'react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { cva } from 'class-variance-authority'
import { useTheme } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { cn } from '../lib/cn'
import { ModalHostContext } from '../lib/modalHost'
import {
  BODY, DialogClose, DialogCloseButton, DialogDescription, DialogFooter, DialogHeader, DialogOverlay,
  BandEdge, DialogLayerContext, DialogTitle, DialogTrigger, MOTION, SCROLL_BAND, inertPopup, modalVars, screenRadius, useScrolled
} from './Dialog'
import { themeSpace } from '~/utils/themeTokens'
import '../styles.css'

// The legacy BottomSheet's panel layer, above standalone dialogs and the legacy Popup.
const SHEET_LAYER = 'ui:z-20601'

// The shadow of the modal that falls on the page, as the edge the sheet sits on.
const SHADOW_SIDE = { bottom: 'up', right: 'left', left: 'right' }

// `right` and `left` are physical, also in a right-to-left language: the popup's own margin (`ml-auto`,
// `mr-auto`) pushes it to the edge, where `justify-end` and `justify-start` would follow the direction.
const viewport = cva('ui:fixed ui:inset-none ui:flex ui:overflow-hidden', {
  variants: { side: { bottom: 'ui:items-end ui:justify-center ui:pt-xxxl', right: '', left: '' } }
})

// The popup slides in from its edge; the first and last frames are Base UI's.
// While a finger or the mouse drags it, Base UI writes the displacement as an inline
// `transform` (and `transition: none`): it is the pointer's position, not a theme
// value. At rest and on release the same displacement is the `--drawer-swipe-movement-*`
// variable, which this `transform` reads so that letting go slides it back (or out) with
// the modal's motion. It is the `transform` property, not Tailwind's `translate`, so the
// inline one replaces it instead of adding to it. With reduced motion there is no
// transition (MOTION is `motion-safe`): the drag still follows and the release is instant.
const popup = cva(
  [
    'ui:relative ui:flex ui:max-h-full ui:flex-col ui:overflow-hidden ui:outline-none',
    'ui:bg-(--ui-modal-background) ui:text-popover-foreground ui:shadow-(--ui-modal-shadow)',
    `ui:motion-safe:transition-transform ${MOTION}`
  ],
  {
    variants: {
      side: {
        bottom: /* touch-target */ 'ui:w-full ui:max-mobile:[--sheet-handle-target:44px] ui:pointer-coarse:[--sheet-handle-target:44px] ui:rounded-t-(--ui-modal-radius) ui:[transform:translateY(var(--drawer-swipe-movement-y))] ui:data-starting-style:translate-y-full ui:data-ending-style:translate-y-full',
        right: 'ui:ml-auto ui:h-full ui:w-(--ui-modal-width) ui:max-w-full ui:rounded-l-(--ui-modal-radius) ui:max-mobile:w-full ui:max-mobile:rounded-none ui:[transform:translateX(var(--drawer-swipe-movement-x))] ui:data-starting-style:translate-x-full ui:data-ending-style:translate-x-full',
        left: 'ui:mr-auto ui:h-full ui:w-(--ui-modal-width) ui:max-w-full ui:rounded-r-(--ui-modal-radius) ui:max-mobile:w-full ui:max-mobile:rounded-none ui:[transform:translateX(var(--drawer-swipe-movement-x))] ui:data-starting-style:-translate-x-full ui:data-ending-style:-translate-x-full'
      }
    }
  }
)

// The overlay lightens as the sheet is dragged away (Base UI's `--drawer-swipe-progress`, 0 to 1)
// and follows it with no delay while dragging.
const OVERLAY_SWIPE = 'ui:opacity-[calc(1_-_var(--drawer-swipe-progress,0))] ui:data-swiping:transition-none'

// The grab bar of a bottom sheet, as the legacy BottomSheet's `Handle` (its colour is the strong border).
// Decorative: dragging is a pointer gesture; the keyboard and reduced motion have the close button and Escape.
// TOKEN-GAP(implementation notes): the bar is 36px wide in the legacy sheet, no token, uso `size-sm` (32px);
// its padding is 10px above and 6px below, no level: uso `sm` (8px) above and `xs` (4px) below.
// The grab zone is 44px high on a phone or with a touch screen (an accessibility floor, as the Button's):
// it starts at the popup's top edge and goes down, because the popup clips what sticks out above it.
// Above the content (as the close button), which may reach the top edge (the product's gallery,
// whose swipe is ignored): otherwise the content covers the bar and takes the finger.
const HANDLE = [
  'ui:absolute ui:inset-x-none ui:top-none ui:z-10 ui:flex ui:cursor-grab ui:touch-none ui:justify-center ui:pt-sm ui:pb-xs',
  'ui:after:absolute ui:after:left-1/2 ui:after:top-none ui:after:size-full ui:after:-translate-x-1/2',
  'ui:after:min-h-(--sheet-handle-target)'
].join(' ')
const GRAB_BAR = 'ui:h-xs ui:w-size-sm ui:rounded-full ui:bg-border-strong'
// `flush`: a content that opens with its own image reaches the popup's top edge, so the handle floats over
// it instead of keeping a blank strip above it, and a long content rises higher (`xl`, not `xxxl`, from the top; a short
// one keeps its own height, its actions low). Over a photo the bar is a small hint: narrower (`icon-lg`), closer to the
// edge, half see-through.
const FLUSH_TOP = 'ui:pt-xl'
const FLUSH_HANDLE = 'ui:pt-xs'
const FLUSH_GRAB_BAR = 'ui:h-xs ui:w-icon-lg ui:rounded-full ui:bg-border-strong/70'

// A drawer swipes toward one edge, set on its root; the sheet's edge is a prop of its content,
// which reports it to the root (before any gesture: it renders when it opens).
const SWIPE_DIRECTION = { bottom: 'down', right: 'right', left: 'left' }
const SideContext = createContext(() => {})

// A trigger outside the root can use the same handle as the Sheet.
const createSheetHandle = DrawerPrimitive.createHandle

const Sheet = (props) => {
  const [side, setSide] = useState('bottom')
  return (
    <SideContext.Provider value={setSide}>
      <DrawerPrimitive.Root swipeDirection={SWIPE_DIRECTION[side]} {...props} />
    </SideContext.Provider>
  )
}

/**
 * `side`: the edge it opens from, `'bottom'` (default, the phone's), `'right'` or
 * `'left'` (the physical side, also in a right-to-left language). `size`: the theme's
 * modal size, the width of a side sheet (a bottom one is as wide as the screen).
 * `width`: the caller's own width for a side sheet, over the size's (a number is the
 * theme's, in px; a string a CSS width, `'80%'`); a bottom sheet ignores it.
 * `layer`: `'sheet'` (default) uses the legacy BottomSheet's level. `'dialog'` inherits the
 * containing modal's level, or uses the standalone Dialog/legacy Popup level when opened
 * from the page. The nested portal follows the parent's viewport at that level.
 * `flush` (default false, bottom only): the content reaches the top edge (the product's photo), the handle and the
 * close float over it, and the sheet opens higher. `showCloseButton` (default true); `closeGroup` (default `'modal'`): the group of the
 * theme whose `slots.close` is its button (`'product_modal'`). The rest (`initialFocus`, `finalFocus`, `aria-*`,
 * `className`) goes to the popup. Dragging it toward its edge closes it (down for a
 * bottom sheet, from its handle or anywhere with a finger; a mouse drags by the handle, not
 * the content, which keeps its text selectable): past half of its size, or fast enough. A
 * scrolling content scrolls first. The close button, Escape and a press outside close it too.
 */
const SheetContent = ({ className, children, side = 'bottom', size = 'sm', width, layer = 'sheet', flush = false, showCloseButton = true, closeGroup, ...props }) => {
  const theme = useTheme()
  const setSide = useContext(SideContext)
  const inheritedLayer = useContext(DialogLayerContext)
  useLayoutEffect(() => setSide(side), [setSide, side])
  const shadow = getThemeCss(theme, 'modal').base.shadow?.[SHADOW_SIDE[side]]
  const effectiveLayer = layer === 'dialog' ? inheritedLayer : SHEET_LAYER
  const flushTop = flush && side === 'bottom'
  const scrolled = useScrolled({ bandFree: flushTop })
  // a sheet is not full screen: the modal's own radius, not the phone's
  const style = { ...modalVars(theme, { size, width: side === 'bottom' ? undefined : width, closeButton: showCloseButton, closeGroup, ...(side === 'bottom' && { closeTop: themeSpace(theme, 'sm') }) }), ...screenRadius(theme), ...(shadow && { '--ui-modal-shadow': shadow }) }
  return (
    <DrawerPrimitive.Portal style={style}>
      <DialogOverlay className={cn(effectiveLayer, OVERLAY_SWIPE)} />
      <DrawerPrimitive.Viewport className={cn(viewport({ side }), flushTop && FLUSH_TOP, effectiveLayer)}>
        <DrawerPrimitive.Popup data-slot='sheet-content' data-side={side} render={inertPopup} className={cn(popup({ side }), className)} {...props}>
          {side === 'bottom' && <div data-slot='sheet-handle' aria-hidden='true' className={cn(HANDLE, flushTop && FLUSH_HANDLE)}><span className={flushTop ? FLUSH_GRAB_BAR : GRAB_BAR} /></div>}
          {/* on a bottom sheet the close sits at the handle's height, on the right */}
          {showCloseButton && <DialogCloseButton group={closeGroup} className={side === 'bottom' ? 'ui:top-sm' : undefined} />}
          {/* implementation notesthe first row starts below the handle's grab zone (not when `flush`: the image is under it); once scrolled, the band is clipped (SCROLL_BAND) */}
          <DrawerPrimitive.Content {...scrolled} className={cn(BODY, SCROLL_BAND, side === 'bottom' && !flush && 'ui:pt-[max(var(--ui-modal-padding-top),var(--sheet-handle-target,0px))]', side === 'bottom' && 'ui:[--layer-pad-bottom:max(var(--ui-modal-padding),env(safe-area-inset-bottom))] ui:pb-[calc(max(var(--ui-modal-padding),env(safe-area-inset-bottom))_+_var(--keyboard-inset,0px))]')}>
            <ModalHostContext.Provider value><DialogLayerContext.Provider value={effectiveLayer}>{children}</DialogLayerContext.Provider></ModalHostContext.Provider>
          </DrawerPrimitive.Content>
          <BandEdge />
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )
}

export {
  createSheetHandle,
  Sheet,
  DialogClose as SheetClose,
  SheetContent,
  DialogDescription as SheetDescription,
  DialogFooter as SheetFooter,
  DialogHeader as SheetHeader,
  DialogTitle as SheetTitle,
  DialogTrigger as SheetTrigger
}
