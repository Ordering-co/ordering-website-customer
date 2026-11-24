// Adapted from shadcn/ui base button (Base UI primitive + cva), commit
// 7c9eaba1c0a6404c990c144a654792e3313c650d. MIT notice and source hash:
// docs/third-party/shadcn-ui/provenance.json.
import React, { useEffect, useRef } from 'react'
import { useTheme } from 'styled-components'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { useRender } from '@base-ui/react/use-render'
import { cva } from 'class-variance-authority'
import { getThemeComponent, getThemeCss, getThemeMobileOverrides, hasOwnFocusBorder } from '~/utils/themeCss'
import { scopedTheme, slotSize, themeSlot } from '~/utils/themeGroups'
import { isTransparent } from '~/utils/themeColors'
import { themeBorderWidth, themeIconSize } from '~/utils/themeTokens'
import { LINK_VARIANTS } from '~ui/src/styles/Link'
import { SPINNER_SLOW_TURN_MS, SPINNER_TURN_MS } from '~ui/src/styles/Rules'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import '../styles.css'

// The touch target expands outside the painted box without changing its size.
const TOUCH_AREA = [
  'ui:after:absolute ui:after:left-1/2 ui:after:top-1/2 ui:after:size-full ui:after:-translate-x-1/2 ui:after:-translate-y-1/2',
  /* touch-target */ 'ui:pointer-coarse:after:min-h-[44px] ui:pointer-coarse:after:min-w-[44px]'
]

// Every value is `components.button` (or `components.spinner`), written on the
// element by `componentVars`; a class only says which property reads which
// variable. A state the theme leaves null declares nothing, so each state
// falls back along the chain: hover → pressed → the resting look (the
// variable of a state that does not exist would void the property). The text
// color is `!important`: the app's global link color (`:where(a)`, unlayered)
// would otherwise beat a utility on a button rendered as a link.
const BASE = [
  'ui:relative ui:box-border ui:inline-flex ui:min-w-[0] ui:max-w-full ui:shrink-0 ui:items-center ui:justify-center ui:m-none ui:py-none ui:cursor-pointer ui:select-none ui:whitespace-nowrap ui:text-center ui:no-underline ui:outline-none',
  'ui:h-(--ui-button-height) ui:gap-(--ui-button-icon-gap) ui:rounded-(--ui-button-radius)',
  'ui:bg-(--ui-button-background) ui:text-(--ui-button-color)! ui:[border:var(--ui-button-border)] ui:[box-shadow:var(--ui-button-shadow)]',
  'ui:font-(family-name:--ui-button-text-family) ui:text-(length:--ui-button-text-size) ui:leading-(--ui-button-text-line) ui:font-(weight:--ui-button-text-weight)',
  'ui:[letter-spacing:var(--ui-button-text-letter-spacing,normal)] ui:[text-transform:var(--ui-button-text-transform,none)]',
  // the icon is of the size's icon, drawn in the button's color
  'ui:[&_svg]:pointer-events-none ui:[&_svg]:shrink-0',
  // only a theme with animation moves (its duration is 0ms otherwise) and never with reduced motion
  'ui:motion-safe:transition-[color,background-color,border-color,box-shadow] ui:motion-safe:duration-(--ui-button-motion-duration) ui:motion-safe:ease-(--ui-button-motion-easing)',
  // hover and pressed answer only an enabled button
  'ui:not-data-disabled:hover:bg-[color:var(--ui-button-hover-background,var(--ui-button-pressed-background,var(--ui-button-background)))]',
  'ui:not-data-disabled:hover:text-[color:var(--ui-button-hover-color,var(--ui-button-pressed-color,var(--ui-button-color)))]!',
  'ui:not-data-disabled:hover:[border:var(--ui-button-hover-border,var(--ui-button-pressed-border,var(--ui-button-border)))]',
  'ui:not-data-disabled:hover:[box-shadow:var(--ui-button-hover-shadow,var(--ui-button-pressed-shadow,var(--ui-button-shadow)))]',
  'ui:not-data-disabled:active:bg-[color:var(--ui-button-pressed-background,var(--ui-button-background))]',
  'ui:not-data-disabled:active:text-[color:var(--ui-button-pressed-color,var(--ui-button-color))]!',
  'ui:not-data-disabled:active:[border:var(--ui-button-pressed-border,var(--ui-button-border))]',
  'ui:not-data-disabled:active:[box-shadow:var(--ui-button-pressed-shadow,var(--ui-button-shadow))]',
  // disabled is the theme's colors (no opacity), the resting look where it says nothing
  'ui:data-disabled:bg-[color:var(--ui-button-disabled-background,var(--ui-button-background))]',
  'ui:data-disabled:text-[color:var(--ui-button-disabled-color,var(--ui-button-color))]!',
  'ui:data-disabled:[border:var(--ui-button-disabled-border,var(--ui-button-border))]',
  'ui:data-disabled:[box-shadow:var(--ui-button-disabled-shadow,var(--ui-button-shadow))]',
  ...TOUCH_AREA
]

const MOBILE_TOUCH = /* touch-target */ 'ui:max-mobile:after:min-h-[44px] ui:max-mobile:after:min-w-[44px]'
const naturalVariants = cva([
  ...TOUCH_AREA,
  'ui:relative ui:m-none ui:p-none ui:border-none ui:bg-transparent ui:cursor-pointer ui:data-disabled:not-aria-busy:cursor-not-allowed'
], {
  variants: {
    appearance: {
      link: [
        'ui:inline ui:h-auto ui:min-h-[0] ui:rounded-none ui:[box-shadow:none] ui:text-start',
        'ui:button-link-style'
      ],
      'bottom-nav-item': [
        'ui:flex ui:flex-col ui:items-center ui:[font:inherit]',
        'ui:button-nav-label'
      ],
      'capsule-item': [
        'ui:flex ui:items-center',
        'ui:[&_svg]:size-(--ui-tabs-icon-size) ui:[&_svg]:shrink-0 ui:[&_svg]:text-text-muted'
      ],
      'input-trigger': [
        'ui:box-border ui:flex ui:items-center ui:whitespace-nowrap ui:text-start ui:h-(--ui-input-height) ui:px-(--ui-input-padding-x)',
        'ui:rounded-(--ui-input-radius) ui:bg-(--ui-input-background) ui:text-(--ui-input-text-color) ui:[box-shadow:var(--ui-input-shadow)]',
        'ui:button-input-type'
      ],
      brand: 'ui:flex ui:items-center ui:min-w-[0] ui:[font-family:inherit]',
      plain: 'ui:flex ui:items-center ui:[font:inherit] ui:text-inherit'
    },
    underline: {
      always: 'ui:underline',
      hover: 'ui:no-underline ui:not-data-disabled:hover:underline',
      none: 'ui:no-underline'
    },
    coarseTouch: { true: '', false: MOBILE_TOUCH },
    capsuleItem: {
      address: [
        'ui:button-capsule-text',
        'ui:flex-auto ui:min-w-[0] ui:px-xs ui:text-text',
        'ui:[&>span]:min-w-[0] ui:[&>span]:overflow-hidden ui:[&_p]:m-none ui:[&_p]:p-none ui:[&_p]:truncate'
      ],
      moment: [
        'ui:shrink-0 ui:self-center ui:[font:inherit] ui:text-inherit ui:data-disabled:cursor-default',
        'ui:[&>div]:flex ui:[&>div]:h-full ui:[&>div]:items-center ui:[&>div]:text-center ui:[&>div]:whitespace-nowrap ui:[&>div]:gap-xs ui:[&>div]:px-xs ui:[&>div]:cursor-[inherit]',
        'ui:button-capsule-label'
      ]
    },
    inputTrigger: {
      context: [
        'ui:flex-1 ui:min-w-[0] ui:gap-xs',
        'ui:button-context-layout'
      ],
      header: 'ui:[&_svg]:me-xs ui:data-disabled:not-aria-busy:cursor-default'
    },
    inputSides: {
      all: 'ui:[border:var(--ui-input-border)] ui:not-data-disabled:[&:not([data-input-trigger=header]:focus)]:hover:[border:var(--ui-input-hover-border,var(--ui-input-border))]',
      bottom: 'ui:rounded-b-none ui:[border-bottom:var(--ui-input-border)] ui:not-data-disabled:[&:not([data-input-trigger=header]:focus)]:hover:[border-bottom:var(--ui-input-hover-border,var(--ui-input-border))]'
    },
    inputFocus: {
      all: 'ui:focus:[border:var(--ui-input-focus-border,var(--ui-input-border))]',
      bottom: 'ui:focus:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))]'
    },
    ownInputFocus: { true: 'ui:focus-visible:outline-none!', false: '' }
  }
})

export const buttonVariants = cva(BASE, {
  variants: {
    shape: {
      text: 'ui:px-(--ui-button-padding-x)',
      // a square of the size's height with the icon alone
      icon: 'ui:w-(--ui-button-height) ui:p-none'
    },
    coarseTouch: {
      true: '',
      false: MOBILE_TOUCH
    },
    iconSize: {
      button: 'ui:[&_svg]:size-(--ui-button-icon-size)',
      content: ''
    },
    layout: {
      row: 'ui:flex',
      inline: 'ui:inline-block',
      multiline: 'ui:h-auto ui:min-h-(--ui-button-height) ui:py-xs'
    },
    loading: {
      true: 'ui:cursor-progress',
      false: 'ui:data-disabled:cursor-not-allowed'
    }
  },
  defaultVariants: { shape: 'text', loading: false, coarseTouch: false, iconSize: 'button' }
})

// The favorite toggle (the heart), `components.favorite`: a neutral ghost icon button of
// `favorite.base.size` whose heart is `favorite.base.color` in every state and
// `favorite.base.icon_size` big, and whose shadow is `favorite.base.shadow` in every state
// (the bare heart a card had), not the ghost button's. Its variables are written on the
// element (`--ui-favorite-*`). `z-1` is not a design value: it sits the toggle over a
// card's stretched link so it gets its own clicks.
const FAVORITE = 'ui:z-1 ui:[&_svg]:size-(--ui-favorite-icon-size) ui:[&_svg]:text-(color:--ui-favorite-color)'
const FAVORITE_SHADOW = 'ui:[box-shadow:var(--ui-favorite-shadow)] ui:not-data-disabled:hover:[box-shadow:var(--ui-favorite-shadow)] ui:not-data-disabled:active:[box-shadow:var(--ui-favorite-shadow)] ui:data-disabled:[box-shadow:var(--ui-favorite-shadow)]'
// A background of its own paints in every state (a transparent one leaves the ghost's own; the
// legacy toggle gave the ghost's back to a disabled button under the pointer, a cascade accident)
const FAVORITE_BACKGROUND = 'ui:bg-(--ui-favorite-background) ui:not-data-disabled:hover:bg-[color:var(--ui-favorite-background)] ui:not-data-disabled:active:bg-[color:var(--ui-favorite-background)] ui:data-disabled:bg-[color:var(--ui-favorite-background)]'
// In a row of text the box reaches out above and below by the room around the heart
// (half of the height beyond the icon), so the row keeps the height it has with the bare
// heart; never sideways, where it would reach the card's edge. The height is the phone's
// below the phone cut (`--ui-button-height`).
const FAVORITE_BLEED = 'ui:my-[calc(-1_*_max(0px,(var(--ui-button-height)_-_var(--ui-favorite-icon-size))_/_2))]'

// The social login's icon (`socialIcon`): a slot of `components.auth_form.base.social_icon_size`
// (`--ui-auth-form-social-icon-size`, written on the element) before the label, the button's
// `icon_gap` apart; its icon is that size over the button's own icon size (`!`: both are a
// descendant `svg` rule), and a sending button shows its spinner there, in the slot's box.
const SOCIAL_SLOT = 'ui:inline-flex ui:shrink-0 ui:items-center ui:justify-center ui:size-(--ui-auth-form-social-icon-size) ui:[&_svg]:size-(--ui-auth-form-social-icon-size)!'

// The icon at the end edge (`iconEnd`, the arrow of Continue): the button's padding from the end
// (the right, the left in RTL), centered in the height, while the label stays centered; the
// button keeps that room free on both sides so a long label never runs under it.
const END_ROOM = 'ui:px-[calc(var(--ui-button-padding-x)_+_var(--ui-button-icon-size)_+_var(--ui-button-icon-gap))]'
// (content at the start: the room only at the end, the start keeps the theme's padding)
const END_ROOM_END = 'ui:pe-[calc(var(--ui-button-padding-x)_+_var(--ui-button-icon-size)_+_var(--ui-button-icon-gap))]'
const OFFSET_END_SLOT = 'ui:absolute ui:end-lg ui:top-md ui:inline-flex ui:items-center ui:rtl:rotate-180 ui:[&_svg]:size-(--ui-button-offset-icon-size)!'
const END_SLOT = 'ui:absolute ui:end-(--ui-button-padding-x) ui:top-1/2 ui:-translate-y-1/2 ui:inline-flex ui:items-center'

// (not `ui:max-w-none`: this sheet maps `none` to the spacing scale, so it paints `max-width: 0` and
// the button collapses; BASE's `max-w-full` is the cap a full width button wants)
const FULL_WIDTH = 'ui:w-full'
// the keyboard ring inside the button's edge, for one that fills a box that clips (Tabs' own inset focus)
const INSET_FOCUS = 'ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!'

// `components.button.base.cta_full_width`, the phone's value over the screen's
const ctaFullWidth = (theme) => {
  const phone = theme.platform ? getThemeMobileOverrides(theme, 'button')?.base?.cta_full_width : undefined
  return phone ?? getThemeComponent(theme, 'button')?.base?.cta_full_width
}

// Slots store a shape, but the caller supplies the content. A square must not
// shrink a text action, including a label nested in a span or fragment.
const hasTextLabel = (children) => React.Children.toArray(children).some(child => {
  if (typeof child === 'string') return !!child.trim()
  if (typeof child === 'number') return true
  if (!React.isValidElement(child) || child.type === 'svg') return false
  if ([true, 'true'].includes(child.props['aria-hidden'])) return false
  return hasTextLabel(child.props.children)
})

// A label that does not fit ends in … (the button keeps its height)
const withEllipsis = (children) => React.Children.map(children, (child) => (
  typeof child === 'string' || typeof child === 'number' ? <span className='ui:min-w-[0] ui:truncate'>{child}</span> : child
))

// Bare text needs an element to hide visually while leaving its accessible name.
const wrapText = (children) => React.Children.map(children, (child) => {
  if (child?.type === React.Fragment) return wrapText(child.props.children)
  return typeof child === 'string' || typeof child === 'number' ? <span>{child}</span> : child
})

// One turn (SPINNER_TURN_MS), or the slow one with reduced motion so it still reads as loading.
// (the Web Animations API: the sheet has no keyframes, and jsdom no `animate`)
// A ring of `components.spinner` (sm: its diameter and thickness) in the
// button's own text color, which is legible on every fill; the theme's spinner
// color is the primary and would vanish on a primary button.
// `inline` (a busy button's, the legacy `$busy` ring): in the row before the label, its arc
// `spinner.base.color` over its `base.track` (what the store saved, as the legacy spinner paints
// it), and still with reduced motion (the label and `aria-busy` say it sends).
const Spinner = ({ inline = false }) => {
  const theme = useTheme()
  const ref = useRef(null)
  useEffect(() => {
    const ring = ref.current
    if (typeof ring?.animate !== 'function') return undefined
    const slow = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (inline && slow) return undefined
    const turn = ring.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: slow ? SPINNER_SLOW_TURN_MS : SPINNER_TURN_MS, iterations: Infinity })
    return () => turn.cancel()
  }, [inline])
  return (
    <span
      ref={ref}
      aria-hidden='true'
      data-slot='button-spinner'
      style={componentVars(theme, 'spinner', { size: 'sm' })}
      className={cn(
        'ui:box-border ui:size-(--ui-spinner-diameter) ui:rounded-full ui:border-solid ui:[border-width:var(--ui-spinner-thickness)]',
        // over the label (loading), or in the row before it (busy, apart by the button's icon_gap)
        inline
          ? 'ui:inline-block ui:shrink-0 ui:border-(color:--ui-spinner-track) ui:border-t-(color:--ui-spinner-color)'
          : 'ui:absolute ui:inset-none ui:m-auto ui:border-transparent ui:border-t-current'
      )}
    />
  )
}

// Keep the anchor's default keyboard and navigation behavior when it has an href.
const NativeButtonLink = React.forwardRef(({ render, nativeButton, disabled, focusableWhenDisabled, onClickCapture, ...props }, ref) => useRender({
  render,
  ref,
  defaultTagName: 'a',
  props: {
    ...props,
    ...(disabled && { 'aria-disabled': true, 'data-disabled': '', tabIndex: focusableWhenDisabled ? 0 : -1 }),
    onClickCapture: disabled ? (event) => {
      event.preventDefault()
      event.stopPropagation()
    } : onClickCapture
  }
}))
NativeButtonLink.displayName = 'NativeButtonLink'

/**
 * The theme's button. Its look is `components.button` of the theme in scope
 * (a `ComponentScope` group's, in a portal too), through `componentVars`.
 *
 * - `color`: a color of the theme (`primary` by default, `secondary`, `danger`,
 *   `success`, `neutral`, `inverse`) and `appearance`: `solid` (default),
 *   `outline`, `tonal`, `ghost` or `link`. A `link` is an inline text action
 *   from `components.link`. It takes `linkVariant` (default, muted or danger)
 *   and the link's `size`, without the regular button's painted box.
 * - `InlineDisclosureButton` places a disclosure alongside the
 *   surrounding text with the extra-small gap and no painted box. With
 *   `shape='icon'` it keeps the surrounding row's cursor.
 * - `iconSize='content'` preserves the icon's own themed sizing, as on map toggles.
 * - `srOnly` is a submit nobody sees (the form's own button is not the one on screen): the
 *   native button with its name, out of sight and with no paint, size or touch area. Pass
 *   `type='submit'`, and `tabIndex={-1}` and `aria-hidden` when another button is the action.
 * - `decorative` paints a regular button surface as an inert, hidden span
 *   for the visual label of an existing action (such as a stretched card link).
 * - `iconLine` sets an icon button's line height to its box height.
 *   `inlineInfo` uses an extra-small ghost button at the text baseline,
 *   separated from the label by the extra-small space.
 * - `layout='row'` makes the regular button a flex block and
 *   `layout='inline'` makes it an inline block. `borderInset` reserves the
 *   theme's thin transparent border when the selected surface has no border.
 * - `cartFab` uses the cart's `fab_radius` on a floating cart button.
 * - `MenuItemButton` paints an action with `components.menu` when
 *   it does not belong to a menu widget. `menuSelected` paints the selected row.
 * - `appearance='capsule-item'` uses the scoped header tabs' typography and
 *   icons with no box of its own. `capsuleItem='moment'` also takes the tabs'
 *   inactive color. The default is `address`.
 * - `appearance='input-trigger'` opens a dialog or chooser while using
 *   `components.input` for the field box. `inputTrigger='header'` uses the
 *   input's base text and its focus border. Use `size` for the saved slot size.
 * - Import the feature-specific buttons below from `ButtonAppearances`. They accept the same loading and busy props.
 * - `HeroLocationButton` uses the hero's saved card surface and the
 *   search slot height. `heroWide` changes the side padding at the mobile cut.
 * - `appearance='brand'` lays out an inline brand mark without a separate
 *   control surface. The header or search frame handles responsive visibility.
 * - `appearance='plain'` keeps the content's natural geometry and inherited
 *   typography. It paints no separate control surface.
 * - `OrderCardButton` uses `components.order_card` for a wrapping
 *   summary button. The caller arranges the order details and the total.
 *   `cardActive` uses the primary border color at rest.
 * - `CardButton` is a wrapping action painted by `components.card`.
 *   `cardLayout='column'` stacks details (default). `cardLayout='row'` puts
 *   a help topic's label and chevron at opposing ends.
 * - `CheckoutGuestButton` is the underlined sign-in and sign-up
 *   action in checkout's guest row, with the body size and primary color.
 * - `PaymentDisclosureButton` aligns two ends of an accordion
 *   heading, using its header backgrounds and the small Identity radius.
 * - `appearance='bottom-nav-item'` stacks an icon and a span label using
 *   `components.bottom_nav`. `aria-current='page'` selects the active color.
 * - `CollapsibleHeadingButton` inherits the heading typography and
 *   stacks the heading label and metadata without a painted control box.
 *   With `busy`, the spinner sits beside the first child, with later children
 *   spanning the rows below it.
 * - `SliderStopButton` is one stop of a slider (a distance, a time), the `components.slider`
 *   mark with no box. `sliderActive` paints the chosen one in the slider's active color and
 *   bold; set `aria-pressed` too.
 * - `ChartLabelButton` fills one lane of the five-point ratings chart.
 *   `chartIndex` aligns its span label with the mark. Set `aria-pressed` to indicate selection.
 * - `ChatAttachmentButton` wraps an attachment at its intrinsic height
 *   with the small Identity radius, so the focus ring follows the picture.
 * - `BusinessTypeTileButton` wraps a category tile (image on top, name below) at its box's width
 *   with the small Identity radius, so the focus ring follows the picture.
 * - `size`: a size of the theme (`xs`, `sm`, `md` by default, `lg`).
 * - `shape='icon'`: a square of the size's height with the icon alone; it needs
 *   an `aria-label` (it warns without one). Text labels keep the text shape.
 * - `loading`: shows the spinner over the label (the button keeps its size and
 *   its name), `aria-busy`, answers no click and stays focusable.
 * - `busy`: a button that is sending (place order, add to cart): the spinner (sm) in the
 *   row before the label, apart by the button's `icon_gap`, its arc and track the theme's
 *   (`spinner.base.color` and `base.track`) and still with reduced motion, and the label stays visible;
 *   `aria-busy`, answers no click, stays focusable and keeps its resting look (not
 *   disabled). `aria-disabled` is `true` unless the caller passes its own. It is the
 *   legacy `$busy` (it keeps the pointer cursor); `loading` hides the label under the
 *   spinner instead (and shows the progress cursor).
 * - `favorite`: the favorite toggle, `components.favorite` over a neutral ghost icon
 *   button of its size: `color`, `appearance`, `size` and `shape` are ignored. The caller
 *   passes `aria-pressed` and the name (`aria-label`, it warns without one). `bleed`
 *   (only with `favorite`) lets its box reach out above and below the heart's room, for a
 *   row of text. `favorite='solid'` uses the neutral solid surface, including
 *   its resting shadow, with the favorite icon and interactive shadow.
 * - `fullWidth`: the button takes its container's width (`cta` does when the theme says so);
 *   `align='start'` puts the icon and the label at the start (left, right in RTL), the
 *   label ending in … when it does not fit (`center` by default).
 * - `focusInset`: the keyboard ring is drawn inside the button's edge, for a button that fills a box which clips it (a card with
 *   `overflow: hidden`), where the ring outside would be cut.
 * - `layout='multiline'` lets rich children wrap while keeping the themed height as a minimum.
 * - `coarseTouch`: size the touch target only on coarse pointers when its parent reserves a lane on those pointers.
 * - `socialIcon`: a social login's brand icon, in a slot before the label of
 *   `components.auth_form.base.social_icon_size` (its phone value below the phone cut), the
 *   button's `icon_gap` apart; with `busy` the spinner takes the slot (the label stays).
 * - `iconEnd`: an icon at the end edge (right, left in RTL), the button's `padding_x` from it,
 *   with the label still centered. `iconEndOffset` keeps the Continue arrow
 *   at the theme's medium top and large end offsets and mirrors it in RTL.
 * - `cta`: a main action, full width when the theme says so
 *   (`cta_full_width`); `type='submit'` is one unless `cta={false}`.
 * - `render` and `nativeButton={false}` make it a link: `<Button render={<a
 *   href='…' />} nativeButton={false}>` keeps the anchor's keyboard behavior.
 * - Base UI's `type` is `button` unless set: a submit button says `type='submit'`.
 * - Anything else goes to the element; `className` wins over the piece's classes,
 *   except the text color, which is `!important` (a legacy `:where(a)` rule paints links).
 */
export const Button = React.forwardRef(({
  className, style, children, color = 'primary', appearance = 'solid', size = 'md', shape = 'text',
  loading = false, busy = false, cta, disabled = false, nativeButton,
  favorite = false, bleed = false, fullWidth = false, focusInset = false, align = 'center', socialIcon, iconEnd,
  iconEndOffset = false, coarseTouch = false, linkVariant = 'default',
  cartFab = false, layout, borderInset = false, iconSize = 'button', iconLine = false,
  inlineInfo = false, decorative = false, srOnly = false, capsuleItem = 'address', inputTrigger = 'context',
  resolveAppearance, ...props
}, ref) => {
  const theme = useTheme()
  const link = nativeButton === false && props.render?.type === 'a' && props.render.props.href !== undefined
  const Root = link ? NativeButtonLink : ButtonPrimitive
  if (srOnly) {
    // a control nobody sees (a form's submit while another button is the one on screen): it keeps
    // the semantics, Enter in a field still reaches it, and it has no paint, size or touch area.
    // `!`: the app's own `button` rules sit outside the layers and would otherwise show it.
    return (
      <Root
        ref={ref}
        data-slot='button'
        disabled={disabled}
        {...(nativeButton !== undefined && { nativeButton })}
        {...props}
        className={cn('ui:sr-only! ui:min-h-[0]!', className)}
      >
        {children}
      </Root>
    )
  }
  const sending = loading || busy
  const sendingProps = {
    'data-loading': loading ? '' : undefined,
    'data-busy': busy ? '' : undefined,
    'aria-busy': sending || undefined,
    disabled: disabled || sending,
    focusableWhenDisabled: sending || undefined
  }
  const spinner = sending && <Spinner inline={!loading} />
  if ((resolveAppearance || ['link', 'bottom-nav-item', 'plain', 'brand', 'capsule-item', 'input-trigger'].includes(appearance)) && !favorite) {
    const vars = appearance === 'link'
      ? componentVars(theme, 'link', { size, variant: LINK_VARIANTS.includes(linkVariant) ? linkVariant : 'default' })
      : {}
    if (appearance === 'bottom-nav-item') {
      Object.assign(vars, componentVars(theme, 'bottom_nav'))
      vars['--ui-bottom-nav-item-color'] = vars[props['aria-current'] === 'page' ? '--ui-bottom-nav-active' : '--ui-bottom-nav-inactive']
    }
    if (appearance === 'capsule-item') {
      const scoped = scopedTheme(theme, 'header')
      const tabs = getThemeCss(scoped, 'tabs')
      const slotVariant = themeSlot(theme, 'header', 'order_type')?.variant
      const variant = tabs.variants[slotVariant] ? slotVariant : getThemeComponent(scoped, 'tabs').base.variant
      Object.assign(vars, componentVars(scoped, 'tabs', { size: slotSize(theme, 'header', 'order_type') }))
      vars['--ui-capsule-inactive-color'] = tabs.variants[variant].inactive
    }
    const field = appearance === 'input-trigger'
    if (field) {
      Object.assign(vars, componentVars(theme, 'input', { variant: 'default', size }))
      vars['--ui-input-trigger-icon'] = themeIconSize(theme, 'md')
      if (inputTrigger === 'header') {
        const input = getThemeCss(theme, 'input').base
        const { family, size, weight, line, letter_spacing: spacing, transform } = input.text
        Object.assign(vars, {
          '--ui-input-text-family': family,
          '--ui-input-text-size': size,
          '--ui-input-text-weight': weight,
          '--ui-input-text-line': line,
          '--ui-input-text-letter-spacing': spacing,
          '--ui-input-text-transform': transform,
          '--ui-input-text-color': input.text_color
        })
      }
    }
    const sides = field ? (vars['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all') : undefined
    const headerField = field && inputTrigger === 'header'
    const fieldClasses = field
      ? {
          inputTrigger,
          inputSides: sides,
          inputFocus: headerField ? sides : undefined,
          ownInputFocus: headerField && hasOwnFocusBorder(vars['--ui-input-border'], vars['--ui-input-focus-border'])
        }
      : {}
    const themed = resolveAppearance?.(theme, shape)
    if (busy && !loading) vars['--ui-button-icon-gap'] = getThemeCss(theme, 'button').base.icon_gap
    return (
      <Root
        ref={ref}
        data-slot='button'
        data-selected={themed?.selected ? '' : undefined}
        data-input-trigger={field ? inputTrigger : undefined}
        {...sendingProps}
        {...(nativeButton !== undefined && { nativeButton })}
        {...props}
        className={cn(
          naturalVariants({
            appearance,
            underline: vars['--ui-link-underline'],
            coarseTouch,
            ...fieldClasses,
            capsuleItem: appearance === 'capsule-item' ? capsuleItem : undefined
          }),
          themed?.classes,
          loading && 'ui:cursor-progress ui:[&>:not([data-slot=button-spinner])]:opacity-0',
          busy && !loading && 'ui:[&>[data-slot=button-spinner]]:me-(--ui-button-icon-gap) ui:[&>[data-slot=button-spinner]]:align-middle',
          className
        )}
        style={{ ...vars, ...themed?.vars, ...style }}
      >
        {busy && !loading && spinner}
        {loading || (busy && appearance === 'collapsible-heading') ? wrapText(children) : children}
        {loading && spinner}
      </Root>
    )
  }
  const solidFavorite = favorite === 'solid'
  const favorites = favorite ? getThemeComponent(theme, 'favorite').base : null
  if (favorite) {
    color = 'neutral'
    appearance = solidFavorite ? 'solid' : 'ghost'
    shape = 'icon'
    size = solidFavorite ? 'md' : favorites.size
  } else if (shape === 'icon' && hasTextLabel(children)) {
    shape = 'text'
  }
  if (inlineInfo) {
    size = 'xs'
    shape = 'icon'
    appearance = 'ghost'
  }
  const vars = { ...componentVars(theme, 'button', { size, shape: shape === 'icon' ? 'icon' : undefined, color, appearance }), ...(favorite && componentVars(theme, 'favorite')) }
  if (iconEndOffset) vars['--ui-button-offset-icon-size'] = themeIconSize(theme, 'lg')
  if (cartFab) vars['--ui-button-radius'] = getThemeCss(theme, 'cart').base.fab_radius
  if ((borderInset || cartFab || inlineInfo) && vars['--ui-button-border'] === 'none') {
    vars['--ui-button-border'] = `${themeBorderWidth(theme, 'thin', { fixed: true })} solid transparent`
  }
  if (solidFavorite) {
    vars['--ui-button-hover-shadow'] = vars['--ui-favorite-shadow']
    vars['--ui-button-pressed-shadow'] = vars['--ui-favorite-shadow']
  }
  if (socialIcon) vars['--ui-auth-form-social-icon-size'] = componentVars(theme, 'auth_form')['--ui-auth-form-social-icon-size']
  // A loading or busy button keeps its own look: it is not disabled, only busy.
  if (sending) Object.keys(vars).filter((name) => name.startsWith('--ui-button-disabled-')).forEach((name) => delete vars[name])
  if (!decorative && shape === 'icon' && process.env.NODE_ENV !== 'production' && !props['aria-label'] && !props['aria-labelledby']) {
    console.warn('Button: an icon button needs an aria-label')
  }
  const main = typeof cta === 'boolean' ? cta : props.type === 'submit'
  const classes = cn(
    buttonVariants({ shape, loading, coarseTouch, iconSize, layout: cartFab ? 'row' : layout }),
    (iconLine || inlineInfo) && shape === 'icon' && 'ui:leading-(--ui-button-height) ui:whitespace-normal',
    inlineInfo && 'ui:ms-xs ui:align-middle',
    // an icon button (the favorite too) keeps its square
    shape !== 'icon' && (fullWidth || (main && ctaFullWidth(theme))) && FULL_WIDTH,
    focusInset && INSET_FOCUS,
    align === 'start' && 'ui:justify-start ui:text-start',
    (decorative || link) && iconLine && shape === 'icon' && 'ui:text-start',
    link && iconLine && shape === 'icon' && 'ui:underline',
    // a sending button keeps the pointer it had (the legacy `$busy` did), not the disabled one
    busy && 'ui:data-disabled:cursor-pointer',
    iconEnd && !iconEndOffset && shape !== 'icon' && (align === 'start' ? END_ROOM_END : END_ROOM),
    favorite && [FAVORITE, !solidFavorite && FAVORITE_SHADOW, !solidFavorite && !isTransparent(favorites.background) && FAVORITE_BACKGROUND, bleed && FAVORITE_BLEED],
    decorative && 'ui:pointer-events-none',
    className
  )
  const buttonStyle = { ...vars, ...style }
  const content = (
    <>
      {busy && !loading && !socialIcon && spinner}
      <span className={cn('ui:inline-flex ui:min-w-[0] ui:items-center ui:justify-center ui:gap-(--ui-button-icon-gap)', align === 'start' && 'ui:flex-1 ui:justify-start', loading && 'ui:opacity-0')}>
        {socialIcon && <span data-slot='button-social-icon' className={SOCIAL_SLOT}>{busy && !loading ? spinner : socialIcon}</span>}
        {withEllipsis(children)}
      </span>
      {/* (an icon button has no edge to put it at; a loading one hides it with its label) */}
      {iconEnd && shape !== 'icon' && <span data-slot='button-icon-end' className={cn(iconEndOffset ? OFFSET_END_SLOT : END_SLOT, loading && 'ui:opacity-0')}>{iconEnd}</span>}
      {loading && spinner}
    </>
  )
  if (decorative) {
    return (
      <span ref={ref} data-slot='button-decoration' aria-hidden='true' data-disabled={disabled ? '' : undefined} className={classes} style={buttonStyle}>
        {content}
      </span>
    )
  }
  return (
    <Root
      ref={ref}
      data-slot='button'
      {...sendingProps}
      {...(nativeButton !== undefined && { nativeButton })}
      {...props}
      style={buttonStyle}
      className={classes}
    >
      {content}
    </Root>
  )
})
Button.displayName = 'Button'
