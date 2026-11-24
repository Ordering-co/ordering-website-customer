// Adapted from shadcn/ui's Base UI dialog (apps/v4/registry/bases/base/ui/dialog.tsx,
// commit 7c9eaba1c0a6404c990c144a654792e3313c650d, MIT): the API and the parts are
// shadcn's, the look is the theme's (`components.modal`, its `close` slot's button).
import React, { createContext, forwardRef, useCallback, useContext, useLayoutEffect, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cva } from 'class-variance-authority'
import { useTheme } from 'styled-components'
import { X } from 'lucide-react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeRadius, themeSpace } from '~/utils/themeTokens'
import { LAYER_BACKGROUND } from '~ui/src/styles/Layer'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { useInertOutside } from '../lib/inertOutside'
import { ModalHostContext } from '../lib/modalHost'
import { Button } from './Button'
import { createIcon } from './createIcon'
import '../styles.css'

// The close glyph alone, not the whole icon registry (it would land in the entry chunk, implementation notes).
const CloseIcon = createIcon({ closeMd: X })

// Standalone dialogs share the legacy Popup layer (20002). The relative order
// follows the body portals: legacy Popups reuse #app-modals while it is open,
// and Base UI creates a portal per opening. Legacy outside-click handlers
// recognize both through isInsideOverlay. The layer classes are whole Tailwind utilities.
export const DIALOG_LAYER = 'ui:z-20002'
// Base UI mounts a nested modal's portal inside the parent portal, after the
// parent's viewport. A Sheet provides its effective layer, so Dialogs and
// Sheets using layer='dialog' stack above it at the same z-index.
export const DialogLayerContext = createContext(DIALOG_LAYER)

// What moves a dialog in and out: the modal's own speed and easing (0ms when the
// theme does not animate it), and nothing at all when the system reduces motion.
// Base UI marks the first and last frame with data-starting-style / data-ending-style.
export const MOTION = 'ui:motion-safe:duration-(--ui-modal-motion-duration) ui:motion-safe:ease-(--ui-modal-motion-easing)'
const FADE = `ui:motion-safe:transition-opacity ${MOTION} ui:data-starting-style:opacity-0 ui:data-ending-style:opacity-0`

// The group whose `slots.close` is the close button when the caller names none.
const MODAL_GROUP = 'modal'
// What the modal's close looks like when the theme has no slot for it. Another group
// (`product_modal`...) has its slot in the schema, with its own default: the theme gives it.
const MODAL_CLOSE_DEFAULTS = { size: 'md', color: 'neutral', appearance: 'ghost' }

/**
 * The close of a modal as the theme says (`components.<group>.slots.close`,
 * `modal` unless a group is named): the props of a `Button` (size, color,
 * appearance; the icon shape). It is a Button of its own, so its variables are
 * on it and not on the portal, where every other Button of the dialog would
 * inherit them.
 */
export const closeButtonProps = (theme, group = MODAL_GROUP) => ({
  ...slotButtonOptions(theme, group, 'close', group === MODAL_GROUP ? MODAL_CLOSE_DEFAULTS : {}),
  shape: 'icon'
})

// The caller's own width for the modal. A number is the theme's (a range in px, as
// `product_modal.base.width`); a string is a CSS width already (`80%`, or the view's `830px`).
// No design decision: the schema's unit for a theme number is px.
const modalWidth = (width) => (typeof width === 'number' ? `${width}px` : width)

/**
 * The variables of everything a modal draws, for the `style` of the portal
 * (Backdrop, Viewport and Popup read them): `components.modal` of the theme the
 * React context gives, the group's inside a `ComponentScope`, plus the room the
 * title leaves for the close button (its height and a gap; the button's own
 * variables are its own, see `closeButtonProps`). `closeGroup` is the group whose
 * close slot is that button; `width` the caller's own width, over the size's.
 * It is a layer (styles/Layer): what it holds that paints `var(--layer-background)` (a sticky bar
 * of actions) is of the modal's background, as in the legacy Modal.
 */
export const modalVars = (theme, { size, closeButton = true, closeGroup, width, closeTop = 'var(--ui-modal-padding)' } = {}) => {
  const closeHeight = closeButton && componentVars(theme, 'button', closeButtonProps(theme, closeGroup))['--ui-button-height']
  return {
    ...componentVars(theme, 'modal', { size }),
    [LAYER_BACKGROUND]: 'var(--ui-modal-background)',
    // the line the band's lower edge draws once the body has scrolled (BandEdge): the theme's item divider
    '--ui-dialog-band-line': componentVars(theme, 'divider', { variant: 'item' })['--ui-divider-line'],
    ...(width != null && { '--ui-modal-width': modalWidth(width) }),
    ...(closeButton && {
      '--ui-dialog-close-room': `calc(${closeHeight} + ${themeSpace(theme, 'md')})`,
      // the band the close owns: from the popup's top edge to the close's bottom edge
      '--ui-dialog-close-zone': `calc(${closeTop} + ${closeHeight})`
    })
  }
}

// The close (and a sheet's handle) sits over the scrolling body. Once the body has scrolled, the band
// they own is clipped off it (not painted, not hit-tested): a field or action never goes under the
// X or the grab bar, so a tap on it is the field's and a tap on the X closes only that layer. `scroll-padding`
// keeps a focused control out of the band. The band is ONE measure, `--ui-protected-zone`: the larger of the
// close's (unset without a close button) and the handle's grab zone (unset on a layer with no handle), so a
// sheet without an X still keeps its handle from taking the tap. With neither it is 0. Content reads it
// as `--layer-protected-zone`, never the piece's own variable.
export const SCROLL_BAND = [
  'ui:[--ui-protected-zone:max(var(--ui-dialog-close-zone,0px),var(--sheet-handle-target,0px))]',
  // published for the layer's content (like --sheet-handle-target): a sticky bar inside the body stays below the band
  'ui:[--layer-protected-zone:var(--ui-protected-zone)]',
  'ui:scroll-pt-(--ui-protected-zone) ui:data-scrolled:[clip-path:inset(var(--ui-protected-zone)_0_0_0)]'
].join(' ')
// The band is the popup's own surface once the body scrolls. Its lower edge is drawn with the theme's divider so
// the content that goes by ends at a line, not at nothing (the photo was cut off by a blank strip). It is the
// popup's sibling, not the body's child, so the clip does not take it and it adds no row to the scroll.
// It shows while the body before it is scrolled (data-scrolled), and repeats the band's measure (`--ui-protected-zone` is the scroller's own variable, not the popup's).
export const BandEdge = () => (
  <div
    aria-hidden='true'
    data-slot='band-edge'
    style={{ top: 'max(var(--ui-dialog-close-zone,0px),var(--sheet-handle-target,0px))' }}
    className='ui:pointer-events-none ui:absolute ui:inset-x-none ui:hidden ui:[[data-scrolled]~&]:block ui:[border-top:var(--ui-dialog-band-line,none)]'
  />
)
// `bandFree` (a flush sheet, implementation notes): while a `[data-band-free]` piece (the product's photo) still fills the
// band, nothing under the X or the handle can take a tap, so the band is not clipped and the photo keeps reaching the
// top edge; it is clipped once the photo's bottom has gone above the band.
export const useScrolled = ({ bandFree = false } = {}) => {
  const [scrolled, setScrolled] = useState(false)
  const onScroll = (e) => {
    const body = e.currentTarget
    let next = body.scrollTop > 0
    const free = next && bandFree && body.querySelector('[data-band-free]')
    if (free) {
      // the band's height resolved in px: SCROLL_BAND's scroll-padding is `--ui-protected-zone` (the variable itself is a max())
      const band = parseFloat(getComputedStyle(body).scrollPaddingTop) || 0
      next = free.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + band
    }
    setScrolled(next)
  }
  return { 'data-scrolled': scrolled ? '' : undefined, onScroll }
}

// The screen's radius, for a modal that is not full screen on a phone: the
// theme's phone override (`platforms.mobile_web`) squares the full-screen one.
export const screenRadius = (theme) => ({ '--ui-modal-radius': themeRadius(theme, 'xxl', 'modal') })

// A dialog opened over another one that fills the screen (a form over its list) covers it: the one below is
// hidden, not left showing its edges, title and close beside the one in front. Each dialog tells
// the one below it while it is open; an alert or a confirmation (`center`) is a card over its dialog, which stays.
const CoverContext = createContext(null)

// Rendered inside the popup, so it only exists while the dialog is open
const CoverBelow = ({ phone }) => {
  const coverBelow = useContext(CoverContext)
  useLayoutEffect(() => {
    if (!coverBelow || phone === 'center') return undefined
    coverBelow(1)
    return () => coverBelow(-1)
  }, [coverBelow, phone])
  return null
}

const Dialog = (props) => <DialogPrimitive.Root {...props} />
const DialogTrigger = (props) => <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />
const DialogClose = (props) => <DialogPrimitive.Close data-slot='dialog-close' {...props} />

const DialogOverlay = ({ className, ...props }) => (
  <DialogPrimitive.Backdrop
    data-slot='dialog-overlay'
    className={cn('ui:fixed ui:inset-none ui:bg-(--ui-modal-overlay)', FADE, className)}
    {...props}
  />
)

/**
 * The close of a modal: the button of the theme's `components.<group>.slots.close`
 * (`group`, `modal` by default; size, color, appearance; the icon shape), top end of
 * the dialog. Its name is translated here (`CLOSE`), as the legacy Modal does.
 */
const DialogCloseButton = ({ className, group }) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  return (
    <DialogPrimitive.Close
      data-slot='dialog-close-button'
      render={
        <Button
          {...closeButtonProps(theme, group)}
          aria-label={t('CLOSE', 'Close')}
          className={cn('ui:absolute ui:top-(--ui-modal-padding) ui:end-(--ui-modal-padding) ui:z-10', className)}
        />
      }
    >
      <CloseIcon name='closeMd' />
    </DialogPrimitive.Close>
  )
}

// Where the popup sits. `screen` (the default) is the legacy modal: centered
// with the theme's width, full screen below the phone cut. `sheet` presents the
// same dialog as a bottom sheet on a phone. `center` stays a centered card on a phone,
// `lg` from each side (the legacy Alert and Confirm, implementation notes).
// The phone's padding is each variant's: two utilities of the same property would be decided by the stylesheet's order.
const viewport = cva('ui:fixed ui:inset-none ui:flex ui:items-center ui:justify-center ui:overflow-hidden ui:p-xl', {
  variants: { phone: { screen: 'ui:max-mobile:p-none', sheet: 'ui:max-mobile:p-none ui:max-mobile:items-end', center: 'ui:max-mobile:p-lg' } },
  defaultVariants: { phone: 'screen' }
})
const popup = cva(
  [
    'ui:relative ui:flex ui:max-h-full ui:w-(--ui-modal-width) ui:max-w-full ui:flex-col ui:overflow-hidden ui:outline-none',
    'ui:rounded-(--ui-modal-radius) ui:bg-(--ui-modal-background) ui:text-popover-foreground ui:shadow-(--ui-modal-shadow)',
    FADE
  ],
  {
    variants: {
      phone: {
        screen: 'ui:max-mobile:h-full ui:max-mobile:w-full',
        sheet: 'ui:max-mobile:w-full ui:max-mobile:rounded-b-none ui:max-mobile:data-starting-style:translate-y-full ui:max-mobile:data-ending-style:translate-y-full ui:max-mobile:transition-transform',
        center: ''
      }
    },
    defaultVariants: { phone: 'screen' }
  }
)

// The scrolling part: the close stays put while the content scrolls under it.
const SCROLL = 'ui:flex ui:min-h-[0] ui:flex-1 ui:flex-col ui:overflow-y-auto ui:overscroll-contain'
// implementation notesa layer keeps its size while the keyboard is up (one global state, useKeyboardOpen): the body pads
// what the keyboard covers (`--keyboard-inset`, unset when it is not up) so its content scrolls above it.
// Whole utilities: Tailwind reads the class names as written.
// implementation notesa sticky bar at the bottom of the body (the cart's Checkout) is pinned inside the scroller's padding, not at its
// edge, so the padding left a strip of scrolling content under it and a hole at the end. The body publishes that padding for its
// content as `--layer-pad-bottom` (as `--layer-protected-zone` for the band): the bar reads it to reach the edge. It is the
// padding alone, not the keyboard's room: with the keyboard up the bar stays just above it. 0 where no layer says it.
// `--layer-end-gap` says the other half: after the content comes that padding and nothing else, so what ends the content (a
// container's own trailing padding and margin) reads it as its end space, with its usual one as the fallback where no layer says it.
const END_GAP = 'ui:[--layer-end-gap:0px]'
const PAD_BOTTOM = `ui:[--layer-pad-bottom:var(--ui-modal-padding)] ${END_GAP}`
export const BODY = `${SCROLL} ${PAD_BOTTOM} ui:px-(--ui-modal-padding) ui:pt-(--ui-modal-padding-top) ui:pb-[calc(var(--ui-modal-padding)_+_var(--keyboard-inset,0px))]`
// `flush`: the content reaches the edges (an image, a profile with its own cover); never both paddings in one class list.
const body = (flush) => (flush ? `${SCROLL} ui:[--layer-pad-bottom:0px] ${END_GAP} ui:px-none ui:pt-none ui:pb-[var(--keyboard-inset,0px)]` : BODY)

// The popup, with what surrounds its portal inert while it is open (see inertOutside). Base UI hands
// the render function the popup's props and state; the element is kept in state for the effect.
export const InertPopup = forwardRef(({ open, ...props }, ref) => {
  const [node, setNode] = useState(null)
  useInertOutside(node, open)
  const setRef = useCallback((el) => { setNode(el); if (typeof ref === 'function') ref(el); else if (ref) ref.current = el }, [ref])
  return <div {...props} ref={setRef} />
})
export const inertPopup = (props, state) => <InertPopup {...props} open={state.open} />

/**
 * `size`: the theme's modal size (`sm | md | lg | xl`, its width at 576px and up;
 * `md` without one). `width`: the caller's own width, over the size's: a number is
 * the theme's (px, `product_modal.base.width`), a string a CSS width (`'80%'`).
 * `phone`: `'screen'` (default) fills the screen on a phone,
 * `'sheet'` slides up from the bottom instead, `'center'` stays a centered card (`lg` from
 * each side; an alert, a confirmation). `showCloseButton` (default true);
 * `closeGroup` (default `'modal'`): the group of the theme whose `slots.close` is its
 * button (`'product_modal'`). `flush` (default false): a body without the modal's padding, the content
 * reaching the edges (an image viewer, a profile with its own cover; the legacy Modal's `padding='0'`).
 * `fullscreen` fills the viewport for a search surface with its own scrolling results.
 * `customSurface` leaves the popup and backdrop unpainted for content that supplies both.
 * Everything else (`initialFocus`, `finalFocus`, `aria-*`, `className`) goes to the popup.
 */
const DialogContent = ({ className, children, size, width, phone = 'screen', showCloseButton = true, closeGroup, flush = false, fullscreen = false, customSurface = false, ...props }) => {
  const theme = useTheme()
  const layer = useContext(DialogLayerContext)
  const scrolled = useScrolled()
  const [covers, setCovers] = useState(0)
  const cover = useCallback((delta) => setCovers((n) => n + delta), [])
  const style = { ...modalVars(theme, { size, width, closeButton: showCloseButton, closeGroup }), ...(phone !== 'screen' && screenRadius(theme)) }
  return (
    <DialogPrimitive.Portal style={style}>
      {!customSurface && <DialogOverlay className={layer} />}
      <DialogPrimitive.Viewport className={cn(viewport({ phone }), layer, fullscreen && 'ui:p-none')}>
        <DialogPrimitive.Popup data-slot='dialog-content' data-covered={covers > 0 ? '' : undefined} render={inertPopup} className={cn(popup({ phone }), fullscreen && 'ui:h-full ui:w-full ui:rounded-none',
          'ui:data-covered:pointer-events-none ui:data-covered:opacity-0', customSurface && 'ui:bg-transparent ui:shadow-none', className)} {...props}>
          <CoverBelow phone={phone} />
          {showCloseButton && <DialogCloseButton group={closeGroup} />}
          <div className={fullscreen ? 'ui:flex ui:min-h-[0] ui:flex-1 ui:flex-col' : cn(body(flush), SCROLL_BAND)} {...(!fullscreen && scrolled)}><CoverContext.Provider value={cover}><ModalHostContext.Provider value>{children}</ModalHostContext.Provider></CoverContext.Provider></div>
          {!fullscreen && <BandEdge />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

const DialogHeader = ({ className, ...props }) => (
  <div data-slot='dialog-header' className={cn('ui:mb-(--ui-modal-gap) ui:flex ui:flex-col ui:gap-xs ui:pe-(--ui-dialog-close-room,0px)', className)} {...props} />
)

// The actions: over the content by `actions_gap`, `actions_spacing` apart, sharing the row.
const DialogFooter = ({ className, ...props }) => (
  <div data-slot='dialog-footer' className={cn('ui:mt-(--ui-modal-actions-gap) ui:flex ui:gap-(--ui-modal-actions-spacing) ui:*:flex-1', className)} {...props} />
)

// The title is the modal's own text style (`components.modal.base.title`).
const DialogTitle = ({ className, visuallyHidden, ...props }) => (
  <DialogPrimitive.Title
    data-slot='dialog-title'
    className={cn(
      'ui:m-none ui:text-foreground ui:break-words',
      'ui:text-(length:--ui-modal-title-size) ui:leading-(--ui-modal-title-line) ui:font-(weight:--ui-modal-title-weight) ui:font-(family-name:--ui-modal-title-family)',
      'ui:tracking-(--ui-modal-title-letter-spacing) ui:[text-transform:var(--ui-modal-title-transform)]',
      visuallyHidden && 'ui:sr-only',
      className
    )}
    {...props}
  />
)

const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description data-slot='dialog-description' className={cn('ui:m-none ui:text-body ui:text-muted-foreground', className)} {...props} />
)

export {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger
}
