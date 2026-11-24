import { useEffect } from 'react'
import { keyboardCovers } from '~ui/src/design-system/lib/keyboardViewport'

// implementation notes, implementation notesthe one place that knows the on-screen keyboard is up. On iOS Safari, and on Chrome for
// Android until the viewport meta says `interactive-widget=resizes-content` (index.html: there the layout shrinks
// and no keyboard shows here), it covers the layout viewport instead of shrinking it, so a `fixed` layer runs under
// it and the field being typed in can be behind it. Mounted once, in App, `useKeyboardOpen` follows the visual
// viewport and the focus (the threshold is the one of keyboardViewport.js) and publishes, while a text field has the
// focus and the keyboard covers the screen:
//   html[data-keyboard-open]      the attribute (KEYBOARD_OPEN_ATTRIBUTE) for styles: `html[data-keyboard-open] & {…}`
//   --keyboard-inset              what the keyboard covers, px, from the bottom of the layout viewport
//   --visual-viewport-height      the visible height, px (read it as `var(--visual-viewport-height, 100dvh)`)
// All three are gone when the keyboard is not up. Readers: the checkout's action bar and every sticky bar of a
// dialog (KEYBOARD_OPEN_IN_FLOW: in the flow, not fixed), the header (slides away), Dialog and Sheet (they keep their
// size and pad their body by the inset) and the field scroller below. A field inside the header never counts (the
// header would hide what is being typed in).
//
// implementation notesthe keyboard of iOS is not always told by the viewport (Chrome on iOS can shrink the layout viewport
// too, so `keyboardCovers` is false while the keyboard is up and the fixed bars sit right above it, over the field
// and its results). So the hook also publishes, whatever the viewport says, while a text field has the focus on a
// touch device (a coarse pointer; with a mouse nothing covers the screen):
//   html[data-text-entry]         the attribute (TEXT_ENTRY_ATTRIBUTE)
// It is the same field rule as above (TEXT_FIELD, never one in the header) and goes with the focus (the same
// afterBlur) and on cleanup. Its readers are the bars fixed at the bottom (the navigation, the store's cart bar, the
// floating cart): they hide while the person types and come back when the field loses the focus
// (HIDE_WHILE_TYPING, under either attribute). Nothing that read `data-keyboard-open` reads it.
export const KEYBOARD_OPEN_ATTRIBUTE = 'data-keyboard-open'
export const TEXT_ENTRY_ATTRIBUTE = 'data-text-entry'
const TOUCH_QUERY = '(pointer: coarse)'
/** Whether the screen is touched (a coarse pointer): the criterion of `data-text-entry`, for what else only a touch screen needs. */
export const touchInput = () => typeof window !== 'undefined' && !!window.matchMedia?.(TOUCH_QUERY)?.matches
export const KEYBOARD_INSET_VAR = '--keyboard-inset'
export const VISUAL_VIEWPORT_HEIGHT_VAR = '--visual-viewport-height'
/** For a styled-components rule of a sticky or fixed bar: while the keyboard is up it is the end of the content. */
export const KEYBOARD_OPEN_IN_FLOW = 'html[data-keyboard-open] & { position: static; }'
/** The selector of a bar that gives way while a text field is being typed in: the keyboard is up, or the person types on a touch screen. */
export const TYPING_SELECTOR = 'html[data-keyboard-open] &, html[data-text-entry] &'
/**
 * For a styled-components rule of a bar fixed at the bottom: while the person types it does not cover, receive
 * touches or stay in the accessibility tree, and it moves out of the screen. Its movement is the bar's business
 * (bottomBarTypingCss in NavigationBar/styles.js adds the theme's motion).
 */
export const HIDE_WHILE_TYPING = `${TYPING_SELECTOR} { visibility: hidden; pointer-events: none; transform: translateY(100%); }`

const TEXT_FIELD = 'textarea, [contenteditable=true], input:not([type=button], [type=checkbox], [type=radio], [type=submit], [type=reset], [type=file], [type=image], [type=range], [type=color], [type=hidden])'
const HEADER = '[data-app-header]'
// iOS scrolls the focused field itself while the keyboard slides in: ours waits for the visual viewport to rest
export const SETTLE_MS = 300

// The nearest ancestor that scrolls the field (a dialog's or a sheet's body), none when the page does
const scrollerOf = (field) => {
  for (let el = field.parentElement; el && el !== document.body; el = el.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el
  }
  return null
}

/**
 * Brings `field`, and the elements it points at with aria-describedby (its error), whole into the visible box
 * (the visual viewport: the header is away while the keyboard is up). Scrolls only when something is out; a block
 * taller than the box keeps its top in view. In a dialog or a sheet it is the body that scrolls and the box starts
 * under the band the close or the handle owns (the body's scroll-padding, `--layer-protected-zone`). The one scroller
 * of the page, the dialogs and the sheets; the hook calls it.
 */
export const scrollFieldIntoView = (field, visual = window.visualViewport) => {
  if (!field || !visual) return
  const scroller = scrollerOf(field)
  const box = scroller?.getBoundingClientRect()
  const top = Math.max(visual.offsetTop, box ? box.top + (parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0) : 0)
  const bottom = Math.min(visual.offsetTop + visual.height, box ? box.bottom : Infinity)
  const described = (field.getAttribute('aria-describedby') || '').split(' ').map((id) => id && document.getElementById(id)).filter(Boolean)
  const start = field.getBoundingClientRect().top
  const end = Math.max(...[field, ...described].map((el) => el.getBoundingClientRect().bottom))
  const delta = start < top ? start - top : Math.min(Math.max(end - bottom, 0), start - top)
  // whole pixels, away from zero: WebKit rounds a fraction down and the field would stay a hair out
  if (delta) (scroller || window).scrollBy({ top: Math.sign(delta) * Math.ceil(Math.abs(delta)), behavior: 'instant' })
}

export const useKeyboardOpen = () => {
  useEffect(() => {
    const visual = window.visualViewport
    const root = document.documentElement
    const touch = window.matchMedia?.(TOUCH_QUERY)
    let settle = 0
    const publish = (open) => {
      root.toggleAttribute(KEYBOARD_OPEN_ATTRIBUTE, open)
      if (open) {
        root.style.setProperty(KEYBOARD_INSET_VAR, `${Math.max(0, window.innerHeight - visual.height - visual.offsetTop)}px`)
        root.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, `${visual.height}px`)
      } else {
        root.style.removeProperty(KEYBOARD_INSET_VAR)
        root.style.removeProperty(VISUAL_VIEWPORT_HEIGHT_VAR)
      }
    }
    const update = () => {
      const field = document.activeElement
      const typing = !!field?.matches?.(TEXT_FIELD) && !field.closest(HEADER)
      // the focus alone, on a touch device: the viewport may not have moved (see the header comment)
      root.toggleAttribute(TEXT_ENTRY_ATTRIBUTE, typing && !!touch?.matches)
      const open = typing && !!visual && keyboardCovers(visual)
      publish(open)
      clearTimeout(settle)
      if (open) settle = setTimeout(() => scrollFieldIntoView(field, visual), SETTLE_MS)
    }
    // moving from one field to the next blurs before it focuses: read the focus once that has settled
    const afterBlur = () => setTimeout(update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', afterBlur)
    document.addEventListener('input', update)
    visual?.addEventListener('resize', update)
    visual?.addEventListener('scroll', update)
    return () => {
      clearTimeout(settle)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', afterBlur)
      document.removeEventListener('input', update)
      visual?.removeEventListener('resize', update)
      visual?.removeEventListener('scroll', update)
      root.removeAttribute(TEXT_ENTRY_ATTRIBUTE)
      publish(false)
    }
  }, [])
}
