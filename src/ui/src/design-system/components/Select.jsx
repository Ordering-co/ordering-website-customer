// Adapted from shadcn/ui's Base UI select (apps/v4/registry/bases/base/ui/select.tsx,
// commit 7c9eaba1c0a6404c990c144a654792e3313c650d, MIT): the parts are shadcn's, the
// look is the theme's (the trigger is `components.input`, the list `components.menu`,
// the header's capsule `components.tabs` of the header group).
import React from 'react'
import loadable from '@loadable/component'
import { DirectionProvider } from '@base-ui/react/direction-provider'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { useTheme } from 'styled-components'
import { getThemeComponent, getThemeCss, hasOwnFocusBorder } from '~/utils/themeCss'
import { scopedTheme, slotSize, themeSlot } from '~/utils/themeGroups'
import { themeSpace } from '~/utils/themeTokens'
import { CHEVRON_GLYPHS } from '~ui/src/components/Icon/chevronGlyphs'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { Check } from 'lucide-react'
import { createIcon } from './createIcon'
import { SegmentContext, segmentIndicatorLength, segmentTab } from './Radio'
import { MENU_SCROLLBAR, menuScrollbarVars } from './menuScrollbar'
import { inputVariants } from './input-variants'
import '../styles.css'

// The popper-based surfaces (`mobile-sheet`, `anchored-professional`) are for forms that open after the first load: they load when one is first drawn, out of the entry (like lazyOverlay)
const SelectSurface = loadable(() => import('./SelectSurface').then((m) => m.SelectSurface))

// The same three glyphs as the app's chevron, not the whole icon registry.
const Chevron = createIcon(CHEVRON_GLYPHS)
const Tick = createIcon({ check: Check })

// Layering is not a theme value. The list is a transient layer a select opens from a page, a dialog or a
// sheet, so it takes the level Popover's `layer='modal'` has (POPOVER_MODAL_LAYER, 20602), above the Sheet's
// (20601): Base UI appends each portal to the body at its opening, so of two layers at this level the later
// one is on top, and a list closes on any press outside it, so it never covers a dialog opened after it.
// (The legacy list was 10002 inside its own container, which a portal no longer is.) Spelled whole so Tailwind sees it.
const LIST_LAYER = 'ui:z-20602'

// The touch target is at least 44 px on a phone or with a touch screen, whatever the theme's
// height: it grows around the trigger and changes nothing of its box (an accessibility floor,
// the same technique and value as Button).
const TOUCH = [
  'ui:after:absolute ui:after:left-1/2 ui:after:top-1/2 ui:after:size-full ui:after:-translate-x-1/2 ui:after:-translate-y-1/2',
  /* touch-target */ 'ui:max-mobile:after:min-h-[44px] ui:max-mobile:after:min-w-[44px]',
  /* touch-target */ 'ui:pointer-coarse:after:min-h-[44px] ui:pointer-coarse:after:min-w-[44px]'
]
// An item of the list is at least 44 px on a phone or with a touch screen, never under the theme's item height
const TOUCH_ITEM = /* touch-target */ 'ui:max-mobile:min-h-[max(var(--ui-menu-item-height),44px)] ui:pointer-coarse:min-h-[max(var(--ui-menu-item-height),44px)]'

// The field the trigger is: `Input`'s look and states (its variants), as a button that shows a value.
// A button is always `:read-only`, so the piece says the pointer; open, the field has the focus: the
// input's focus state over a hover (important: the pointer is still on it).
const FIELD = [
  'ui:relative ui:inline-flex ui:w-auto ui:items-center ui:justify-between ui:gap-(--ui-input-icon-gap) ui:cursor-pointer ui:select-none ui:whitespace-nowrap ui:text-start',
  'ui:read-only:cursor-pointer ui:data-readonly:cursor-default',
  'ui:data-popup-open:bg-(--ui-input-background)! ui:data-popup-open:[box-shadow:var(--ui-input-shadow)]!',
  ...TOUCH
]
const OPEN = {
  all: 'ui:data-popup-open:not-aria-invalid:[border:var(--ui-input-focus-border,var(--ui-input-border))]!',
  bottom: 'ui:data-popup-open:not-aria-invalid:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))]!'
}

// The header's capsule paints the box (implementation notes`components.input`, in the screen); its items have none
// of their own, just the tabs' text and icon size (`components.tabs` of the header group, written as
// `--ui-tabs-*`), the text color, and a muted icon and chevron.
const CAPSULE = [
  'ui:relative ui:box-border ui:flex ui:min-w-[0] ui:flex-auto ui:items-center ui:gap-xs ui:m-none ui:px-xs ui:py-none ui:[border:none] ui:bg-transparent ui:text-text ui:text-start ui:whitespace-nowrap ui:cursor-pointer ui:select-none ui:outline-none',
  'ui:font-(family-name:--ui-tabs-text-family) ui:text-(length:--ui-tabs-text-size) ui:leading-(--ui-tabs-text-line) ui:font-(weight:--ui-tabs-text-weight)',
  'ui:data-readonly:cursor-default ui:disabled:cursor-not-allowed ui:disabled:text-text-disabled',
  'ui:[&_svg]:shrink-0 ui:[&_svg]:size-(--ui-tabs-icon-size) ui:[&_svg]:text-text-muted',
  ...TOUCH
]

// What the header's capsule reads for its items (Header/styles.js `capsuleTabs`): the tabs of the header
// group, the variant and size of the `order_type` slot (its variant, else the theme's), as `--ui-tabs-*`.
const capsuleVars = (theme) => {
  const scoped = scopedTheme(theme, 'header')
  const slotVariant = themeSlot(theme, 'header', 'order_type')?.variant
  const variant = getThemeCss(scoped, 'tabs').variants[slotVariant] ? slotVariant : getThemeComponent(scoped, 'tabs').base.variant
  return componentVars(scoped, 'tabs', { variant, size: slotSize(theme, 'header', 'order_type') })
}

/**
 * The look of a button that is a field of the theme and opens something (the select's trigger, the
 * date field's): `Input`'s classes and `components.input` as variables, plus the menu's motion
 * (the chevron turns at its speed). `size`: a size of the field. Shared so the two cannot drift.
 */
export const fieldTriggerLook = (theme, size) => {
  const input = componentVars(theme, 'input', { variant: 'default', radius: 'md', size })
  const menu = componentVars(theme, 'menu')
  const sides = input['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  return {
    classes: [inputVariants({ sides, ownFocus: hasOwnFocusBorder(input['--ui-input-border'], input['--ui-input-focus-border']) }), FIELD, OPEN[sides]],
    vars: { ...input, '--ui-menu-motion-duration': menu['--ui-menu-motion-duration'], '--ui-menu-motion-easing': menu['--ui-menu-motion-easing'] }
  }
}

/**
 * The select's own state: the value and `onValueChange` (the value, and details of what
 * moved it), `open`/`onOpenChange`, `disabled`, `readOnly`, `name`, `required`.
 */
const SelectRoot = (props) => {
  const theme = useTheme()
  return (
    <DirectionProvider direction={theme?.rtl ? 'rtl' : 'ltr'}>
      <SelectPrimitive.Root {...props} />
    </DirectionProvider>
  )
}

/**
 * What the select shows: the label of the chosen item (the `items` of the root, or
 * what `children` returns for the value), the `placeholder` while none is chosen.
 */
const SelectValue = ({ className, ...props }) => (
  <SelectPrimitive.Value
    data-slot='select-value'
    className={cn('ui:flex ui:min-w-[0] ui:flex-1 ui:items-center ui:gap-xs ui:overflow-hidden', className)}
    {...props}
  />
)

/**
 * The control that opens the list. `variant`: `'field'` (default) is a field of the theme
 * (`components.input`: `Input`'s box, states, error border and 16 px text on a phone);
 * `'capsule'` is the header capsule's item, with no box; `'segment'` is one segment of a
 * `RadioGroup segmented` that opens a list instead of choosing (it takes the bar's tab look and
 * variables: only inside that group), marked with `active` when its group holds the chosen value.
 * `invalid` is `aria-invalid` (name the message with `aria-describedby`). `chevron={false}`
 * leaves the arrow out. `children` is the `SelectValue`.
 * - `size` (`'sm' | 'md' | 'lg'`): the field's size, the one `header.slots.<slot>` chooses
 *   (`slotSize(theme, 'header', 'language')`); its height changes, its side space is the input's.
 * - `narrowCap`: below the narrowest phones (380 px) the trigger is at most 37.5vw wide and its
 *   text ends in …; above it there is no cap. It replaces a fixed width.
 */
const SelectTrigger = React.forwardRef(({ className, style, variant = 'field', size, narrowCap, active, invalid, chevron = true, children, ...props }, ref) => {
  const theme = useTheme()
  const capsule = variant === 'capsule'
  const segment = variant === 'segment'
  const segmentLook = React.useContext(SegmentContext)
  const menu = componentVars(theme, 'menu')
  const field = !segment && !capsule && fieldTriggerLook(theme, size)
  const classes = segment
    ? [segmentTab({ variant: segmentLook.key, length: segmentIndicatorLength(segmentLook), gapless: segmentLook.gapless, joined: segmentLook.joined, layout: segmentLook.layout }), TOUCH, 'ui:[&>[data-slot=select-value]]:flex-none']
    : capsule
      ? CAPSULE
      : field.classes
  // a segment paints with the bar's `--ui-tabs-*` (inherited): it writes only what its chevron turns with
  const vars = segment
    ? { '--ui-menu-motion-duration': menu['--ui-menu-motion-duration'], '--ui-menu-motion-easing': menu['--ui-menu-motion-easing'] }
    : capsule
      ? capsuleVars(theme)
      : field.vars
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-slot='select-trigger'
      data-variant={variant}
      data-checked={active ? '' : undefined}
      aria-invalid={invalid || undefined}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(classes, narrowCap && 'ui:max-narrow:max-w-[37.5vw]', className)}
    >
      {children}
      {chevron && (
        <SelectPrimitive.Icon
          data-slot='select-icon'
          className={cn(
            'ui:flex ui:shrink-0 ui:items-center ui:in-disabled:hidden ui:motion-safe:transition-transform ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing) ui:data-popup-open:rotate-180',
            segment ? '' : capsule ? 'ui:text-text-muted' : 'ui:[&_svg]:size-(--ui-input-icon-size)'
          )}
        >
          <Chevron name='chevronDown' />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

/**
 * The list (`components.menu`: its background, border, radius, shadow and motion), in a portal
 * that carries its variables, anchored under the trigger at its end (the left one in right-to-left),
 * never narrower than it, scrolling when the screen has no room. `children`: `SelectItem`s.
 * `variant='rich'` is a list of options with an icon, a description and a check: as wide as its
 * content up to the menu's maximum width (and the screen's), its rows `space.md` apart.
 */
const SelectContent = ({ className, children, side = 'bottom', align, variant, ...props }) => {
  const theme = useTheme()
  const menu = componentVars(theme, 'menu')
  const vars = { ...menu, ...menuScrollbarVars(theme, menu['--ui-menu-radius']) }
  return (
    <SelectPrimitive.Portal style={vars}>
      {/* sm (8px) is the legacy 7px gap between a select and its list (px-map: 7 -> sm) */}
      <SelectPrimitive.Positioner
        data-slot='select-positioner'
        alignItemWithTrigger={false}
        side={side}
        // `end` is logical: Floating UI reads the page's direction (the body's, from `theme.rtl`) and puts it on the left in right-to-left
        align={align ?? 'end'}
        // no helper gives a space as a number (`themeSpace` is CSS, `pageGutter` is the only one): Base UI's `sideOffset` wants one
        sideOffset={Number.parseFloat(themeSpace(theme, 'sm'))}
        className={cn('ui:outline-none', LIST_LAYER)}
      >
        <SelectPrimitive.Popup
          data-slot='select-content'
          className={cn(
            'ui:box-border ui:max-h-(--available-height) ui:min-w-(--anchor-width) ui:overflow-y-auto ui:overscroll-contain ui:outline-none',
            'ui:rounded-(--ui-menu-radius) ui:bg-(--ui-menu-background) ui:[border:var(--ui-menu-border,none)] ui:[box-shadow:var(--ui-menu-shadow,none)]',
            'ui:motion-safe:transition-opacity ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing) ui:data-starting-style:opacity-0 ui:data-ending-style:opacity-0',
            variant === 'rich' && 'ui:w-max ui:max-w-[min(var(--ui-menu-max-width),var(--available-width))]',
            MENU_SCROLLBAR,
            className
          )}
          {...props}
        >
          <SelectPrimitive.List data-slot='select-list' className={cn(variant === 'rich' && 'ui:flex ui:flex-col ui:gap-md ui:py-xxs')}>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

/**
 * An option of the list (`components.menu`: item height, side space, text, hover and selected
 * background). `value`; `label` is its text for typing to find it (when `children` is not text).
 * A rich option (in a `SelectContent variant='rich'`): `icon` (a glyph in a tile of the surface),
 * `description` (a caption under the name, in the muted text) and `indicator` (a check on the chosen
 * one, which keeps its room when it is not). The name is `children`; the option's accessible name
 * includes its description.
 */
const SelectItem = ({ className, children, icon, description, indicator, ...props }) => {
  const rich = icon != null || description != null || indicator
  return (
    <SelectPrimitive.Item
      data-slot='select-item'
      className={cn(
        'ui:flex ui:min-h-(--ui-menu-item-height) ui:cursor-pointer ui:items-center ui:gap-xs ui:px-(--ui-menu-padding-x) ui:text-start ui:text-text ui:whitespace-nowrap ui:select-none ui:outline-none',
        TOUCH_ITEM,
        'ui:font-(family-name:--ui-menu-item-text-family) ui:text-(length:--ui-menu-item-text-size) ui:leading-(--ui-menu-item-text-line) ui:font-(weight:--ui-menu-item-text-weight)',
        'ui:motion-safe:transition-colors ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing)',
        // the selected option keeps its background under the pointer
        'ui:data-highlighted:bg-(--ui-menu-item-hover) ui:data-selected:bg-(--ui-menu-item-selected) ui:data-selected:data-highlighted:bg-(--ui-menu-item-selected)',
        'ui:data-disabled:cursor-not-allowed ui:data-disabled:text-text-disabled',
        rich && 'ui:gap-sm ui:py-sm',
        className
      )}
      {...props}
    >
      {icon != null && (
        <span data-slot='select-item-icon' className='ui:flex ui:shrink-0 ui:size-xl ui:items-center ui:justify-center ui:self-center ui:rounded-sm ui:bg-surface-alt ui:text-text'>{icon}</span>
      )}
      {rich
        ? (
          <span className='ui:flex ui:min-w-[0] ui:flex-col'>
            <SelectPrimitive.ItemText className='ui:block ui:whitespace-normal ui:text-label ui:font-label'>{children}</SelectPrimitive.ItemText>
            {description != null && <span data-slot='select-item-description' className='ui:block ui:whitespace-normal ui:text-caption ui:font-caption ui:text-text-muted'>{description}</span>}
          </span>
          )
        : <SelectPrimitive.ItemText className='ui:flex ui:min-w-[0] ui:items-center ui:gap-xs'>{children}</SelectPrimitive.ItemText>}
      {indicator && (
        <SelectPrimitive.ItemIndicator keepMounted className='ui:ms-auto ui:flex ui:shrink-0 ui:items-center ui:self-center ui:text-primary-text ui:not-data-selected:invisible'>
          <Tick name='check' />
        </SelectPrimitive.ItemIndicator>
      )}
    </SelectPrimitive.Item>
  )
}

// Text truncates with an ellipsis; an icon or an image with it stays as given
const Label = ({ children }) => (typeof children === 'string' ? <span className='ui:truncate'>{children}</span> : children)

/**
 * The select of the legacy `Select`, from a list of options.
 *
 * - `options`: `[{ value, content, showOnSelected?, disabled? }]`. `content` is what the list shows
 *   (text, or an icon or an image with it); `showOnSelected` what the field shows once chosen
 *   (`content` when it has none).
 * - `value` (controlled) or `defaultValue`; `onChange(value)` when the user picks another one.
 *   `placeholder` shows while none is chosen.
 * - `disabled`; `readOnly`. With a single option the field only shows it (no list, no arrow), as
 *   the legacy select did, unless `openSingle`.
 * - `presentation='mobile-sheet'`: a bottom sheet below the phone breakpoint
 *   and an inline dropdown above it. `plainOptions` uses the surface color for
 *   desktop rows, `onCover` uses the text color for an overlay and
 *   `listBorderBox` includes the menu border in the anchored list width.
 *   `keepOpenOnTriggerClick` keeps a repeated press from closing,
 *   and `resetOnOptionsChange={false}` keeps the initial uncontrolled value.
 * - `presentation='anchored-professional'`: full-width rich trigger and
 *   in-place options below it, with a scroll limit. `valueContent` lets the
 *   caller render the current professional while its source list reloads.
 * - `invalid`, `id`, `open`, `onOpenChange`, `aria-*`, `className` and `style`
 *   apply in every presentation. A static single value keeps its invalid state
 *   as a group. `fullWidth` fills the container.
 * - Only the floating presentation participates in forms with `name` and
 *   `required`, and accepts the trigger `variant` ('field' or 'capsule'), `size` and `narrowCap`
 *   (see `SelectTrigger`). A rich list or a segment of a segmented bar is composed by hand:
 *   `SelectRoot`, `SelectTrigger variant='segment'`, `SelectContent variant='rich'`, `SelectItem`.
 *   The responsive presentations provide their own trigger and report selection through `onChange`.
 *
 * For anything else compose `SelectRoot`, `SelectTrigger`, `SelectValue`, `SelectContent` and `SelectItem`.
 */
const FloatingSelect = ({
  options = [], value, defaultValue, onChange, placeholder, disabled, readOnly, openSingle, name, required, open, onOpenChange,
  variant, fullWidth, className, ...trigger
}) => {
  const single = options.length === 1 && !openSingle
  // (Base UI also reports the option that is already the value.) Controlled, the parent's value is the
  // current one at each render: a refused change leaves it, so choosing the same option again is reported again.
  const current = React.useRef(value ?? defaultValue)
  if (value !== undefined) current.current = value
  return (
    <SelectRoot
      items={options.map((option) => ({ value: option.value, label: <Label>{option.showOnSelected ?? option.content}</Label> }))}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (next === current.current) return
        if (value === undefined) current.current = next
        onChange?.(next)
      }}
      disabled={disabled}
      readOnly={readOnly || single}
      name={name}
      required={required}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SelectTrigger variant={variant} chevron={!single} className={cn(fullWidth && 'ui:w-full', className)} {...trigger}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={String(option.value)}
            value={option.value}
            disabled={option.disabled}
            label={typeof option.content === 'string' ? option.content : undefined}
          >
            <Label>{option.content}</Label>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  )
}

const Select = ({ presentation, options, name, required, variant, ...props }) => presentation === 'mobile-sheet' || presentation === 'anchored-professional'
  ? <SelectSurface presentation={presentation} options={options ?? []} {...props} />
  : <FloatingSelect options={options} name={name} required={required} variant={variant} {...props} />

export { Select, SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem }
