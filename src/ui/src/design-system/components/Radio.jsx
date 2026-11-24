// The radio and the segmented radio group, split off Checkbox.jsx (its header has the credit and
// the provenance entry): the look is the theme's (`components.radio`). Checkbox.jsx re-exports all
// of this; the entry (the header's capsule) takes it from here, without the checkbox and its Base UI parts.
import React from 'react'
import { useTheme } from 'styled-components'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { DirectionProvider } from '@base-ui/react/direction-provider'
import { cva } from 'class-variance-authority'
import { Circle, CircleDot } from 'lucide-react'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { motionTiming } from '~/utils/themeMotion'
import { themeOpacity, themeRadius } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { createIcon } from './createIcon'
import { scrollingTabsBarClass } from './tabs-bar'
import { choiceIconClass, choicePaint, choiceVars } from './choice-surface'
import '../styles.css'

// The glyphs alone, not the whole icon registry (the same ones: `radioChoiceOff`, `radioChoiceOn`).
const MarkIcon = createIcon({ radioOff: Circle, radioOn: CircleDot })

// A control is two things: the Base UI root, which is the hit area and holds
// the state (`data-checked`, `data-disabled`), and the mark inside it, which is
// drawn from `components.checkbox` / `components.radio`. The mark reads the
// root's state through `in-data-*` (the state of an ancestor), so the same mark serves the standalone control
// and a `Choice` row (where the whole row is the control).
export const ROOT = 'ui:relative ui:inline-flex ui:shrink-0 ui:m-none ui:p-none ui:cursor-pointer ui:outline-none ui:data-disabled:cursor-not-allowed'

// The touch target is at least 44 px on a phone or with a touch screen, whatever
// the theme's size: it grows around the control (or around the label, when there
// is one) and changes nothing of its box. The same accessibility floor as the Button's.
export const TARGET = [
  'ui:after:absolute ui:after:left-1/2 ui:after:top-1/2 ui:after:size-full ui:after:-translate-x-1/2 ui:after:-translate-y-1/2',
  /* touch-target */ 'ui:max-mobile:after:min-h-[44px] ui:max-mobile:after:min-w-[44px]',
  /* touch-target */ 'ui:pointer-coarse:after:min-h-[44px] ui:pointer-coarse:after:min-w-[44px]'
]

// A control with a label is one hit area: the label, its text and the control.
export const LABEL = 'ui:relative ui:inline-flex ui:items-center ui:gap-sm ui:cursor-pointer ui:has-data-disabled:cursor-not-allowed'

// Only a state's colors move; reduced motion and the theme's own speed decide.
// Spelled whole, once per component: Tailwind reads the source as text and builds nothing from an interpolation.
const MOTION = {
  radio: 'ui:motion-safe:transition-[color,background-color,border-color] ui:motion-safe:duration-(--ui-radio-motion-duration) ui:motion-safe:ease-(--ui-radio-motion-easing)'
}

/** `components.radio` as `--ui-radio-*` and the disabled opacity, as `checkboxVars`. */
export const radioVars = (theme) => ({ ...componentVars(theme, 'radio'), '--ui-radio-disabled-opacity': themeOpacity(theme, 'disabled') })

/**
 * The circle of a radio, of the theme's size, in `unchecked` and, with its root
 * checked, a ring with a dot in `checked`. Decoration, as `CheckboxMark`; inside a
 * Base UI radio root that declares `radioVars`.
 */
export const RadioMark = ({ className }) => (
  <span
    data-slot='radio-mark'
    aria-hidden='true'
    className={cn(
      'ui:inline-flex ui:shrink-0 ui:size-(--ui-radio-size) ui:text-(--ui-radio-unchecked) ui:in-data-checked:text-(--ui-radio-checked)',
      MOTION.radio,
      className
    )}
  >
    <MarkIcon name='radioOff' className='ui:size-full ui:in-data-checked:hidden' />
    <MarkIcon name='radioOn' className='ui:hidden ui:size-full ui:in-data-checked:block' />
  </span>
)

// The control, alone or with its label: with one, `className` and `style` go to the label
// (its layout), the rest and the `ref` to the root.
export const withLabel = (control, label, className, style) =>
  label
    ? <label data-slot='control-label' style={style} className={cn(LABEL, TARGET, className)}>{control}{label}</label>
    : control

// (`SegmentContext` and `segmentTab` are exported for `SelectTrigger variant='segment'`: a segment that opens a list.)
// The segmented radio group is the look of `Tabs` (`components.tabs`) on radios: a bar of capsules,
// one chosen. Its classes are `Tabs.jsx`'s `list` and `tab` for the layout that fills the bar, with
// `data-checked` where the tab has `aria-selected`; keep them alike (shortcut: copied, not shared,
// because that file is not this one's; upgrade by exporting them from `Tabs.jsx`).
const VARIANTS = ['pill', 'underline', 'plain']
const INDICATOR_LENGTHS = ['full', 'medium', 'small']
export const SegmentContext = React.createContext({ key: 'pill', layout: 'fill' })

// the variant a screen asks for, else the theme's default style, and what it needs that a CSS variable cannot say
const segmentLook = (theme, variant) => {
  const component = getThemeComponent(theme, 'tabs')
  const key = VARIANTS.includes(variant) ? variant : component?.base?.variant
  const own = component?.variants?.[key] ?? {}
  const gapless = key === 'pill' && own.gap === 0
  const tabBorder = (own.tab_border?.width ?? 0) > 0
  const edge = key === 'pill' && own.inset === 0 && tabBorder
  const css = getThemeCss(theme, 'tabs')?.variants?.[key]
  const width = value => Number.parseFloat(value) || 0
  const rim = edge ? 0 : width(css?.border) + width(key === 'underline' ? css?.baseline ?? css?.border : css?.border)
  return {
    key,
    rim,
    gapless: gapless && tabBorder,
    joined: gapless && own.joined === true,
    edge,
    length: own.indicator_length
  }
}

const segmentBar = cva(
  ['ui:relative ui:box-border ui:flex ui:max-w-full ui:min-w-[0] ui:items-stretch ui:h-(--ui-tabs-height) ui:gap-(--ui-tabs-gap)'],
  {
    variants: {
      // in a capsule the bar paints no box (background, shadow, line): it keeps its size, inset and gap, so the segments sit where they would in the bar
      capsule: {
        false: 'ui:bg-(--ui-tabs-background) ui:[box-shadow:var(--ui-tabs-shadow)]',
        true: 'ui:[border-color:transparent]!'
      },
      variant: {
        pill: 'ui:rounded-(--ui-tabs-radius) ui:p-(--ui-tabs-inset)',
        underline: 'ui:[border-top:var(--ui-tabs-border)] ui:[border-inline:var(--ui-tabs-border)] ui:[border-bottom:var(--ui-tabs-baseline,var(--ui-tabs-border))]',
        plain: 'ui:[border:var(--ui-tabs-border)]'
      },
      edge: { true: '', false: '' },
      layout: {
        fill: '',
        scroll: scrollingTabsBarClass
      }
    },
    compoundVariants: [{ variant: 'pill', edge: false, class: 'ui:[border:var(--ui-tabs-border)]' }],
    defaultVariants: { variant: 'pill', edge: false, capsule: false }
  }
)

// The 44 px touch floor is `TARGET`'s (an `after`), so the underline's line is the `before`.
export const segmentTab = cva(
  [
    'ui:relative ui:box-border ui:inline-flex ui:items-center ui:justify-center ui:m-none ui:py-none ui:outline-none',
    'ui:px-(--ui-tabs-padding-x) ui:gap-(--ui-tabs-icon-gap) ui:cursor-pointer ui:select-none ui:whitespace-nowrap ui:text-center',
    'ui:font-(family-name:--ui-tabs-text-family) ui:text-(length:--ui-tabs-text-size) ui:leading-(--ui-tabs-text-line) ui:font-(weight:--ui-tabs-text-weight)',
    'ui:[letter-spacing:var(--ui-tabs-text-letter-spacing,normal)] ui:[text-transform:var(--ui-tabs-text-transform,none)]',
    'ui:[&>span]:min-w-[0] ui:[&>span]:truncate',
    'ui:[&_svg]:pointer-events-none ui:[&_svg]:size-(--ui-tabs-icon-size) ui:[&_svg]:shrink-0',
    'ui:bg-transparent ui:text-(--ui-tabs-inactive) ui:data-checked:bg-(--ui-tabs-active-background) ui:data-checked:text-(--ui-tabs-active)',
    'ui:motion-safe:transition-[color,background-color] ui:motion-safe:duration-(--ui-tabs-motion-duration) ui:motion-safe:ease-(--ui-tabs-motion-easing)',
    // TOKEN-GAP(implementation notes): `components.tabs` has no disabled look; the theme's disabled opacity, as the tabs dim theirs
    'ui:data-disabled:cursor-not-allowed ui:data-disabled:opacity-(--ot-opacity-disabled)'
  ],
  {
    variants: {
      variant: {
        pill: 'ui:rounded-(--ui-tabs-tab-radius) ui:[border:var(--ui-tabs-tab-border)]',
        underline: [
          'ui:[border:none]',
          'ui:before:absolute ui:before:bottom-none ui:before:h-(--ui-tabs-indicator-thickness) ui:before:bg-transparent ui:data-checked:before:bg-(--ui-tabs-indicator)',
          'ui:motion-safe:before:transition-[background-color] ui:motion-safe:before:duration-(--ui-tabs-motion-duration) ui:motion-safe:before:ease-(--ui-tabs-motion-easing)'
        ],
        plain: 'ui:[border:none]'
      },
      length: {
        full: 'ui:before:inset-x-none',
        medium: 'ui:before:left-1/4 ui:before:w-1/2',
        small: 'ui:before:left-[37.5%] ui:before:w-1/4'
      },
      layout: {
        // a segment never narrows under its icon, its label and the gap between them (the label keeps its whole name)
        fill: 'ui:flex-[1_1_0] ui:min-w-min',
        scroll: 'ui:min-w-[0] ui:flex-[1_0_auto] ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!'
      },
      // Base UI inserts native inputs between the visible radios. Only the
      // other segment roots mark an inner edge.
      gapless: { true: 'ui:[[data-appearance=segment]~&]:[border-inline-start-width:0]', false: '' },
      joined: { true: 'ui:[[data-appearance=segment]~&]:rounded-s-none ui:[&:has(~[data-appearance=segment])]:rounded-e-none', false: '' }
    },
    defaultVariants: { variant: 'pill', length: 'full', gapless: false, joined: false }
  }
)

// the length of the underline's line: the theme's, only for the underline variant (`SelectTrigger variant='segment'` reads it too)
export const segmentIndicatorLength = ({ key, length }) => (key === 'underline' && INDICATOR_LENGTHS.includes(length) ? length : 'full')

const SegmentRadio = React.forwardRef(({ className, icon, label, children, onKeyDown, ...props }, ref) => {
  const segment = React.useContext(SegmentContext)
  const { key, gapless, joined, layout, manual } = segment
  return (
    <RadioPrimitive.Root
      ref={ref}
      data-slot='radio'
      data-appearance='segment'
      {...props}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // manual activation: Enter chooses as Space does (a radio only takes Space)
        if (manual && event.key === 'Enter' && !event.defaultPrevented && event.target === event.currentTarget) {
          event.preventBaseUIHandler()
          event.preventDefault()
          event.currentTarget.click()
        }
      }}
      className={cn(segmentTab({ variant: key, length: segmentIndicatorLength(segment), gapless, joined, layout }), TARGET, className)}
    >
      {icon}
      {/* a label that does not fit ends in … (the tab keeps its height) */}
      {label != null && <span>{label}</span>}
      {children}
    </RadioPrimitive.Root>
  )
})

// Date cells own their roving focus so a closed day can be visible, skipped by
// the arrows, and still described when it was the last confirmed day.
const dateStrip = cva([
  'ui:relative ui:box-border ui:flex ui:w-full ui:min-w-size-xl ui:flex-col ui:items-center ui:justify-center ui:gap-xxs',
  /* touch-target */ 'ui:min-h-[44px]',
  'ui:rounded-(--ui-date-strip-radius) ui:border-solid ui:border-(length:--ot-border-fixed-thin) ui:border-border ui:hover:border-border-strong',
  'ui:px-sm ui:py-(--ui-date-strip-padding-y) ui:bg-surface ui:text-text ui:[font-family:inherit]',
  'ui:motion-safe:transition-[color,background-color,border-color,box-shadow,opacity] ui:motion-safe:duration-(--ui-date-strip-duration) ui:motion-safe:ease-(--ui-date-strip-easing)'
], {
  variants: {
    state: {
      open: 'ui:cursor-pointer',
      selected: 'ui:cursor-pointer ui:bg-primary ui:text-on-primary ui:border-primary ui:hover:border-primary',
      closed: 'ui:cursor-default ui:bg-transparent ui:text-text-disabled ui:border-transparent ui:hover:border-transparent'
    }
  }
})

const DateStripRadio = React.forwardRef(({ className, style, selected, closed, onClick, ...props }, ref) => {
  const theme = useTheme()
  const { duration, easing } = motionTiming(theme, 'button')
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot='radio'
      role='radio'
      aria-checked={!!selected}
      aria-disabled={closed || undefined}
      {...props}
      onClick={closed ? undefined : onClick}
      className={cn(dateStrip({ state: selected ? 'selected' : closed ? 'closed' : 'open' }), className)}
      style={{
        '--ui-date-strip-padding-y': getThemeCss(theme, 'date_strip').base.padding_y,
        '--ui-date-strip-radius': themeRadius(theme, 'md'),
        '--ui-date-strip-duration': duration,
        '--ui-date-strip-easing': easing,
        ...style
      }}
    />
  )
})
DateStripRadio.displayName = 'DateStripRadio'

/**
 * The theme's radio (`components.radio`): a Base UI radio root with the drawn
 * mark, inside a `RadioGroup` (its `value` is the selection). Arrow keys move
 * and select within the group. `label`, `value`, `disabled`, `readOnly`, `id`,
 * `inputRef` as in `Checkbox`.
 *
 * - `appearance='date-strip'`: a calendar date with structured children and
 *   the strip's typography and space. The caller supplies `selected`, `closed`,
 *   `aria-label` and manages roving focus with `tabIndex` and `onKeyDown`.
 * - `appearance='icon-only'`: a radio painted with `components.choice`,
 *   with a decorative glyph as its children. Supply an accessible name.
 * - `appearance='segment'`: a capsule of a `RadioGroup segmented`, no circle: `icon` and `label`
 *   (the text inside, not a wrapping label) are what it shows, the bar's `components.tabs` its look.
 *   Name it by its `label`, or by an `aria-label` when it is an icon alone. Only inside that group.
 */
export const Radio = React.forwardRef(({ className, style, label, appearance, children, ...props }, ref) => {
  const theme = useTheme()
  if (appearance === 'date-strip') return <DateStripRadio ref={ref} className={className} style={style} {...props}>{children}</DateStripRadio>
  if (appearance === 'segment') return <SegmentRadio ref={ref} className={className} style={style} label={label} {...props}>{children}</SegmentRadio>
  if (appearance === 'icon-only') {
    return (
      <RadioPrimitive.Root
        ref={ref}
        data-slot='radio'
        {...props}
        style={{ ...choiceVars(theme), ...style }}
        className={cn(ROOT, 'ui:box-border ui:items-center', choicePaint, choiceIconClass, TARGET, className)}
      >
        {children}
      </RadioPrimitive.Root>
    )
  }
  const control = (
    <RadioPrimitive.Root
      ref={ref}
      data-slot='radio'
      {...props}
      style={{ ...radioVars(theme), ...(!label && style) }}
      className={cn(ROOT, 'ui:size-(--ui-radio-size) ui:rounded-full ui:data-disabled:opacity-(--ui-radio-disabled-opacity)', !label && TARGET, !label && className)}
    >
      <RadioMark />
    </RadioPrimitive.Root>
  )
  return withLabel(control, label, className, style)
})
Radio.displayName = 'Radio'

/**
 * A Base UI radio group: `value` / `defaultValue` / `onValueChange(value)`, `name`,
 * `disabled`, `required`. No layout of its own: pass `render={<YourLayout />}` (or
 * put the layout inside it) for a column, a grid or a panel. Its arrows follow the eye in a
 * right-to-left store (Base UI assumes left-to-right without a `DirectionProvider`), which
 * is also the direction of every `Radio` and `Choice` inside.
 *
 * - `segmented`: the group is a bar of capsules (`Radio appearance='segment'`), the look of the
 *   tabs (`components.tabs`): `variant` (`pill`, `underline`, `plain`; else the theme's default
 *   style), `size` (`sm`, `md` default, `lg`: the bar's height) and `group` (the group whose
 *   changes to the tabs apply), as `Tabs` takes them (`slotTabsOptions(theme, group, slot)` gives
 *   the slot's size and variant). The capsules share the bar's width and their labels end in …
 *   With `layout='scroll'` the labels keep their natural width and the bar scrolls.
 *   Name the bar with `aria-label`; the arrows move and choose, as in any radio group (unless `activation='manual'`).
 * - `activation='manual'` (segmented only): the arrows only move the focus, among the capsules and
 *   any `SelectTrigger variant='segment'` of the bar, in the order they are seen (right-to-left
 *   included); Enter, Space or a click choose. For a bar whose choice has a cost (it changes an order).
 * - `capsule` (segmented only): the bar sits inside a surface that is already the box (a field
 *   capsule): it paints no background, shadow or line of its own and keeps its size and inset.
 */
const SEGMENT_STOPS = '[data-slot=radio]:not([data-disabled]),[data-slot=select-trigger]:not([data-disabled])'

export const RadioGroup = ({ segmented, variant, size = 'md', group, layout = 'fill', activation = 'auto', capsule = false, ...props }) => {
  const outer = useTheme()
  if (!segmented) {
    return (
      <DirectionProvider direction={outer?.rtl ? 'rtl' : 'ltr'}>
        <RadioGroupPrimitive data-slot='radio-group' {...props} />
      </DirectionProvider>
    )
  }
  const theme = group ? scopedTheme(outer, group) : outer
  const look = segmentLook(theme, variant)
  const { className, style, onKeyDownCapture, ...rest } = props
  const manual = activation === 'manual'
  // Base UI chooses the capsule the arrows reach (it arms its focus handler on any Arrow keydown): here only the focus moves, over every stop of the bar
  const walk = (event) => {
    onKeyDownCapture?.(event)
    if (!manual || !event.key.startsWith('Arrow') || !event.currentTarget.contains(event.target)) return
    event.preventBaseUIHandler?.()
    const step = { ArrowLeft: outer?.rtl ? 1 : -1, ArrowRight: outer?.rtl ? -1 : 1 }[event.key]
    if (!step) return
    const stops = [...event.currentTarget.querySelectorAll(SEGMENT_STOPS)]
    const from = stops.indexOf(event.target.closest(SEGMENT_STOPS))
    if (from < 0 || stops.length < 2) return
    event.preventDefault()
    event.stopPropagation()
    stops[(from + step + stops.length) % stops.length].focus()
  }
  return (
    <SegmentContext.Provider value={{ ...look, layout, manual }}>
      <DirectionProvider direction={outer?.rtl ? 'rtl' : 'ltr'}>
        <RadioGroupPrimitive
          data-slot='radio-group'
          data-variant={look.key}
          style={{ ...componentVars(theme, 'tabs', { variant: look.key, size }), ...(layout === 'scroll' && { '--ui-tabs-rim': `${look.rim}px` }), ...style }}
          className={cn(segmentBar({ variant: look.key, edge: look.edge, layout, capsule }), className)}
          {...rest}
          onKeyDownCapture={walk}
        />
      </DirectionProvider>
    </SegmentContext.Provider>
  )
}
