// Adapted from shadcn/ui's Base UI tabs (apps/v4/registry/bases/base/ui/tabs.tsx,
// commit 7c9eaba1c0a6404c990c144a654792e3313c650d, MIT): the API and the parts
// are shadcn's, the look is the theme's (`components.tabs`).
import React from 'react'
import { useTheme } from 'styled-components'
import { DirectionProvider } from '@base-ui/react/direction-provider'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cva } from 'class-variance-authority'
import { getThemeComponent, getThemeMobileOverrides } from '~/utils/themeCss'
import { themeSpace } from '~/utils/themeTokens'
import { scopedTheme } from '~/utils/themeGroups'
import { cn } from '../lib/cn'
import { componentVars, resolveComponentLook } from '../lib/componentVars'
import { scrollingTabsBarClass, slotTabsOptions } from './tabs-bar'
import '../styles.css'

const VARIANTS = ['pill', 'underline', 'plain']
const INDICATOR_LENGTHS = ['full', 'medium', 'small']
const indicatorLength = (length) => INDICATOR_LENGTHS.includes(length) ? length : 'full'

// Both live in tabs-bar.js so the entry reaches them without this Base UI piece
export { scrollingTabsBarClass, slotTabsOptions }

// What the variant needs that a CSS variable cannot say (a flag of the theme, not a value to paint).
// The variant is the one a screen asks for, else the theme's default style, as the legacy bar does.
const pixels = (value) => parseFloat(value) || 0

const lookOf = (theme, variant, size, migrated = false) => {
  const component = getThemeComponent(theme, 'tabs')
  const mobile = theme.platform && getThemeMobileOverrides(theme, 'tabs')
  const key = VARIANTS.includes(variant) ? variant : mobile?.base?.variant ?? component.base.variant
  const paint = resolveComponentLook(theme, 'tabs', { variant: key, size })
  // The legacy frame only replaced its bottom edge when a baseline existed.
  // The theme's CSS view encodes null as 'none', and a zero-width line as '0px …'.
  if (migrated && key === 'underline' && paint.baseline === 'none') paint.baseline = paint.border
  const pill = key === 'pill'
  const gapless = pill && pixels(paint.gap) === 0
  const tabBorder = pill ? pixels(paint.tab_border) : 0
  const inset = pill ? pixels(paint.inset) : 0
  const edge = pill && inset === 0 && tabBorder > 0
  const topBorder = pixels(paint.border)
  const bottomBorder = key === 'underline' ? pixels(paint.baseline ?? paint.border) : topBorder
  const rim = edge ? 0 : topBorder + bottomBorder
  return {
    key,
    paint,
    rim,
    tabBorder,
    topBorder,
    inset,
    height: pixels(paint.height),
    centerOffset: (bottomBorder - topBorder) / 2,
    gapless: gapless && tabBorder > 0,
    joined: gapless && paint.joined === true,
    edge,
    length: paint.indicator_length
  }
}

const actionGeometry = ({ height, rim, inset, tabBorder }, trim = 0) => {
  const actionHeight = height - rim - 2 * inset - 2 * trim
  return actionHeight > 0 ? {
    '--ui-tabs-action-height': `${actionHeight}px`,
    '--ui-tabs-action-line': `${Math.max(actionHeight - 2 * tabBorder, 0)}px`
  } : {}
}

// Migrated pill bars keep their own rim and overlap neighboring outlines.
const overlapVars = ({ edge, topBorder, tabBorder }) => ({
  '--ui-tabs-rim-overlap': `${edge ? topBorder : 0}px`,
  '--ui-tabs-item-overlap': `${tabBorder}px`
})
const overlapClass = ({ edge, gapless }) => [
  edge && 'ui:[margin-block:calc(-1*var(--ui-tabs-rim-overlap))] ui:first:[margin-inline-start:calc(-1*var(--ui-tabs-rim-overlap))] ui:last:[margin-inline-end:calc(-1*var(--ui-tabs-rim-overlap))]',
  gapless && 'ui:not-first:[margin-inline-start:calc(-1*var(--ui-tabs-item-overlap))] ui:aria-selected:z-[1] ui:data-active:z-[1]'
]

// Use the requested size if it fits, then the next fitting theme size.
// If none fits, keep the requested icon and grow to its intrinsic content.
const stackedIconGeometry = (theme, current, size) => {
  const contentHeight = ({ paint, tabBorder }) => {
    const line = paint.text.line
    return pixels(paint.icon_size) + pixels(paint.icon_gap) +
      (String(line).endsWith('px') ? pixels(line) : pixels(line) * pixels(paint.text.size)) + 2 * tabBorder
  }
  const fits = (look) => look.height - look.rim - 2 * look.inset >= contentHeight(look)
  const sizes = ['sm', 'md', 'lg']
  const look = fits(current)
    ? current
    : sizes.slice(sizes.indexOf(size) + 1).map(candidate => lookOf(theme, current.key, candidate, true)).find(fits) ?? current
  return {
    '--ui-tabs-stacked-action-height': `${Math.max(look.height - look.rim - 2 * look.inset, contentHeight(look))}px`,
    '--ui-tabs-icon-size': look.paint.icon_size,
    '--ui-tabs-padding-x': look.paint.padding_x
  }
}

const TabsScrollContext = React.createContext(false)
const PAINTED_LAYOUTS = ['equal-panel-width', 'content-width']
const INSET_FOCUS = 'ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!'
const TabsContext = React.createContext({ key: 'pill', layout: 'scroll' })

const list = cva(
  [
    'ui:relative ui:box-border ui:flex ui:max-w-full ui:min-w-[0] ui:items-stretch',
    'ui:h-(--ui-tabs-height) ui:gap-(--ui-tabs-gap) ui:bg-(--ui-tabs-background) ui:[box-shadow:var(--ui-tabs-shadow)]'
  ],
  {
    variants: {
      // `border` is one shorthand, not mixed with its sides: the sheet orders a shorthand after its longhands
      variant: {
        pill: 'ui:rounded-(--ui-tabs-radius) ui:p-(--ui-tabs-inset)',
        // the line under the whole bar takes the place of the bottom side of the border
        underline: 'ui:[border-top:var(--ui-tabs-border)] ui:[border-inline:var(--ui-tabs-border)] ui:[border-bottom:var(--ui-tabs-baseline,var(--ui-tabs-border))]',
        plain: 'ui:[border:var(--ui-tabs-border)]'
      },
      // no inset and a border of their own on the tabs: their border is the bar's edge, the bar draws none
      edge: { true: '', false: '' },
      // `scroll`: the tabs keep their size and the bar scrolls sideways inside its container;
      // `fill`: the tabs share the bar's width and a label that does not fit ends in …
      // A bar that scrolls clips what sticks out of it, at its padding box: so the 44px touch floor (an accessibility floor,
      // not the theme's height) is the bar's own on a phone or with a touch screen, and it is the inside that measures it
      // (`--ui-tabs-rim`: the border's room): it grows to it, its tabs stretched. One that does not scroll keeps its box and grows only the tab's touch area (see `tab`).
      // `line`: a scrolling row of text with no box of its own; its tabs keep their width and the line under the selected one is the `TabsIndicator`
      layout: { scroll: scrollingTabsBarClass, line: [scrollingTabsBarClass, 'ui:[border:none] ui:[box-shadow:none] ui:gap-xl'], fill: '', 'equal-panel-width': 'ui:w-full', 'content-width': 'ui:w-fit ui:text-primary' }
    },
    compoundVariants: [{ variant: 'pill', edge: false, class: 'ui:[border:var(--ui-tabs-border)]' }],
    defaultVariants: { variant: 'pill', edge: false, layout: 'scroll' }
  }
)

// the touch area grows around the tab (`before`: the underline's line is the `after`) and changes nothing of its box
const TOUCH_AREA = [
  'ui:before:absolute ui:before:left-1/2 ui:before:top-1/2 ui:before:size-full ui:before:-translate-x-1/2 ui:before:-translate-y-1/2',
  /* touch-target */ 'ui:max-mobile:before:min-h-[44px] ui:max-mobile:before:min-w-[44px] ui:pointer-coarse:before:min-h-[44px] ui:pointer-coarse:before:min-w-[44px]'
].join(' ')

const SCROLL_TAB = 'ui:leading-(--ui-tabs-text-line) ui:flex-[1_0_auto] ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!'

const tab = cva(
  [
    'ui:relative ui:box-border ui:inline-flex ui:min-w-[0] ui:items-center ui:justify-center ui:m-none ui:py-none ui:outline-none',
    'ui:px-(--ui-tabs-padding-x) ui:gap-(--ui-tabs-icon-gap) ui:cursor-pointer ui:select-none ui:whitespace-nowrap ui:text-center',
    'ui:font-(family-name:--ui-tabs-text-family) ui:text-(length:--ui-tabs-text-size) ui:font-(weight:--ui-tabs-text-weight)',
    'ui:[letter-spacing:var(--ui-tabs-text-letter-spacing,normal)] ui:[text-transform:var(--ui-tabs-text-transform,none)]',
    // one line of text that ends in … (the label is a span, see `TabsTrigger`)
    'ui:[&>span]:min-w-[0] ui:[&>span]:truncate',
    'ui:[&_svg]:pointer-events-none ui:[&_svg]:size-(--ui-tabs-icon-size) ui:[&_svg]:shrink-0',
    // the selected tab: its colors (and, in the underline style, its line)
    'ui:bg-transparent ui:text-(--ui-tabs-inactive) ui:aria-selected:bg-(--ui-tabs-active-background) ui:aria-selected:text-(--ui-tabs-active)',
    // only a theme with animation moves (its duration is 0ms otherwise) and never with reduced motion
    'ui:motion-safe:transition-[color,background-color] ui:motion-safe:duration-(--ui-tabs-motion-duration) ui:motion-safe:ease-(--ui-tabs-motion-easing)',
    // TOKEN-GAP(implementation notes): `components.tabs` has no disabled look; the theme's disabled opacity, as the header dims its tabs
    'ui:data-disabled:cursor-not-allowed ui:data-disabled:opacity-(--ot-opacity-disabled)'
  ],
  {
    variants: {
      variant: {
        pill: 'ui:rounded-(--ui-tabs-tab-radius) ui:[border:var(--ui-tabs-tab-border)]',
        underline: [
          'ui:[border:none]',
          'ui:after:absolute ui:after:bottom-none ui:after:h-(--ui-tabs-indicator-thickness) ui:after:bg-transparent ui:aria-selected:after:bg-(--ui-tabs-indicator)',
          'ui:motion-safe:after:transition-[background-color] ui:motion-safe:after:duration-(--ui-tabs-motion-duration) ui:motion-safe:after:ease-(--ui-tabs-motion-easing)'
        ],
        plain: 'ui:[border:none]'
      },
      // `indicator_length` is the share of the tab the line spans, centered
      length: {
        full: 'ui:after:inset-x-none',
        medium: 'ui:after:left-1/4 ui:after:w-1/2',
        small: 'ui:after:left-[37.5%] ui:after:w-1/4'
      },
      gapless: { true: 'ui:not-first:[border-inline-start-width:0]', false: '' },
      joined: { true: 'ui:not-first:rounded-s-none ui:not-last:rounded-e-none', false: '' },
      layout: {
        // the bar's own 44px floor (see `list`) stretches the tab only as far as its inset: the rest of the touch area is the same `before`
        scroll: [SCROLL_TAB, TOUCH_AREA],
        line: [SCROLL_TAB, TOUCH_AREA, 'ui:flex-none ui:px-[0] ui:aria-selected:font-(weight:--ot-text-label-weight)'],
        fill: ['ui:leading-(--ui-tabs-text-line) ui:flex-[1_1_0]', TOUCH_AREA],
        'equal-panel-width': ['ui:flex-[1_1_0] ui:h-(--ui-tabs-action-height) ui:leading-(--ui-tabs-action-line)', TOUCH_AREA],
        navigation: ['ui:appearance-none ui:h-(--ui-tabs-action-height) ui:leading-(--ui-tabs-action-line) ui:max-tab-compact:flex-1', TOUCH_AREA],
        section: [
          'ui:appearance-none ui:h-(--ui-tabs-action-height) ui:leading-(--ui-tabs-action-line) ui:min-w-max',
          TOUCH_AREA,
          // Center the hit area in the viewport even when an unequal
          // baseline shifts the painted action within the track.
          'ui:pointer-coarse:before:top-[calc(50%+var(--ui-tabs-action-center-offset))]'
        ],
        stacked: ['ui:appearance-none ui:h-(--ui-tabs-action-height) ui:flex-col ui:max-tab-compact:flex-1', TOUCH_AREA]
      }
    },
    defaultVariants: { variant: 'pill', length: 'full', gapless: false, joined: false, layout: 'scroll' }
  }
)

// A label that does not fit ends in … (the tab keeps its height)
const withEllipsis = (children) => React.Children.map(children, (child) => (
  typeof child === 'string' || typeof child === 'number' ? <span>{child}</span> : child
))

/**
 * The theme's tabs. Their look is `components.tabs` of the theme in scope, through `componentVars`.
 *
 * - `variant`: `pill`, `underline` or `plain`. Without it, the theme's default style
 *   (`components.tabs.base.variant`) decides: pass it only when a screen asks for another
 *   one, or the slot's (`slotTabsOptions`).
 * - `size`: a size of the theme (`sm`, `md` by default, `lg`): the height of the bar.
 * - `group`: the group whose changes to the tabs apply (`components.<group>.scope.tabs`),
 *   as `ComponentScope` does; `slotTabsOptions(theme, group, slot)` gives the slot's size and variant.
 * - `layout`: `'scroll'` (default) the tabs keep their size and the bar scrolls sideways
 *   inside its container, never widening the page; `'fill'` the tabs share the bar's width and
 *   their labels end in … (a segmented control). `'equal-panel-width'` gives
 *   a full-width track and equal triggers with their configured bar's line height.
 *   `'content-width'` fits the same painted track to its triggers. `'line'` is a scrolling
 *   row of text (the `underline` variant's colors, no box or shadow) whose selected tab is
 *   marked by a `TabsIndicator` that slides; `TabsList inset` gives it side room.
 * - `value`, `defaultValue`, `onValueChange`: Base UI's. `TabsList` takes `activateOnFocus`
 *   (arrows select as they move; otherwise Enter or Space do), `loopFocus` and `bare`
 *   (the bar draws no box of its own, its tabs keep their place: for a surface that is
 *   already one, like the header's capsule). Name the list with `aria-label`.
 * - A tab is `TabsTrigger value`, with its text and, if it has one, a `Icon` (the theme's
 *   icon size and gap); `TabsContent value` is its panel. With no panels it is a segmented
 *   control: the selection is the tab's `aria-selected`.
 */
const Tabs = React.forwardRef(({ className, style, group, variant, size = 'md', layout = 'scroll', ...props }, ref) => {
  const outer = useTheme()
  const theme = group ? scopedTheme(outer, group) : outer
  const look = lookOf(theme, variant, size, PAINTED_LAYOUTS.includes(layout))
  return (
    <TabsContext.Provider value={{ ...look, layout }}>
      {/* Base UI assumes left-to-right without it: the arrows would be reversed in a right-to-left store */}
      <DirectionProvider direction={outer?.rtl ? 'rtl' : 'ltr'}>
        <TabsPrimitive.Root
          ref={ref}
          data-slot='tabs'
          data-variant={look.key}
          style={{
            ...componentVars(theme, 'tabs', { look: look.paint }),
            ...(PAINTED_LAYOUTS.includes(layout) && { ...actionGeometry(look), ...overlapVars(look) }),
            ...style
          }}
          className={cn('ui:min-w-[0] ui:max-w-full', className)}
          {...props}
        />
      </DirectionProvider>
    </TabsContext.Provider>
  )
})
Tabs.displayName = 'Tabs'

// A bar with no box of its own: no fill, shadow or border color and no side space, but the
// height its tabs have in the bar (the border and the inset still take their room).
const BARE = { '--ui-tabs-background': 'transparent', '--ui-tabs-shadow': 'none', borderColor: 'transparent', borderInlineWidth: 0, paddingInline: 0 }

const TabsList = React.forwardRef(({ className, style, bare = false, inset, ...props }, ref) => {
  const { key, edge, layout, rim } = React.useContext(TabsContext)
  const theme = useTheme()
  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot='tabs-list'
      // `inset` (a space of the theme) is the `line` layout's side room: inside the scrolling row, so the tabs scroll out to its edge
      style={{ '--ui-tabs-rim': `${rim}px`, ...(bare && BARE), ...(inset && { paddingInline: themeSpace(theme, inset) }), ...style }}
      className={cn(list({ variant: key, edge: edge && !PAINTED_LAYOUTS.includes(layout), layout }), className)}
      {...props}
    />
  )
})
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { key, gapless, joined, length, layout, edge } = React.useContext(TabsContext)
  const clipped = React.useContext(TabsScrollContext)
  const legacyPaint = PAINTED_LAYOUTS.includes(layout)
  return (
    <TabsPrimitive.Tab
      ref={ref}
      data-slot='tabs-trigger'
      className={cn(tab({ variant: layout === 'line' ? 'plain' : key, length: key === 'underline' ? indicatorLength(length) : (legacyPaint ? null : 'full'), gapless: gapless && !legacyPaint, joined, layout: layout === 'content-width' ? 'navigation' : layout }), legacyPaint && overlapClass({ edge, gapless }), clipped && INSET_FOCUS, className)}
      {...props}
    >
      {withEllipsis(children)}
    </TabsPrimitive.Tab>
  )
})
TabsTrigger.displayName = 'TabsTrigger'

// The line under the selected tab of a `line` bar: Base UI measures the tab (scroll included) and the line slides to it
const TabsIndicator = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Indicator
    ref={ref}
    data-slot='tabs-indicator'
    className={cn(
      'ui:pointer-events-none ui:absolute ui:bottom-none ui:left-none ui:w-(--active-tab-width) ui:h-(--ui-tabs-indicator-thickness) ui:bg-(--ui-tabs-indicator) ui:[transform:translateX(var(--active-tab-left))]',
      'ui:motion-safe:transition-[transform,width] ui:motion-safe:duration-(--ui-tabs-motion-duration) ui:motion-safe:ease-(--ui-tabs-motion-easing)',
      className
    )}
    {...props}
  />
))
TabsIndicator.displayName = 'TabsIndicator'

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Panel ref={ref} data-slot='tabs-content' className={className} {...props} />
))
TabsContent.displayName = 'TabsContent'

const navigation = cva('', {
  variants: {
    tone: { primary: 'ui:text-primary', contrast: 'ui:text-primary-foreground' },
    mode: {
      section: 'ui:[&>span]:[gap:inherit] ui:static ui:w-full ui:min-w-max ui:max-w-[none] ui:h-[calc(var(--ui-tabs-height)-2*var(--ui-tabs-section-rim))]',
      stacked: 'ui:has-[[data-stacked-icon]]:h-auto ui:has-[[data-stacked-icon]]:min-h-(--ui-tabs-height) ui:has-[[data-stacked-icon]]:items-center'
    },
    width: { content: 'ui:w-fit' },
    edgeToEdge: {
      true: 'ui:in-[.sticky-prod-cat]:[border-inline:none] ui:in-[.sticky-prod-cat]:rounded-none'
    }
  }
})

/**
 * A themed tab bar for content or navigation whose state and mounting belong
 * to the caller. TabsAction keeps the existing independent button tab order.
 * - `variant`, `size`: the same theme style and size as Tabs.
 * - `tone`: inherited bar text color, primary or contrast. Actions still take
 *   their own active and inactive theme colors.
 * - `scroll`: make the bar itself a scrollport. `width='content'`: fit the bar to its
 *   contents instead of filling the available inline space.
 * - `mode='section'`: an intrinsic track inside the category scrollport that
 *   follows the visible section. Its height includes the outer category border.
 *   `edgeToEdge` squares the track when that scrollport docks to the viewport.
 * - `mode='stacked'` places a tab action's optional icon above its label.
 *   Icon actions use a fitting theme size or grow to the sum of the themed
 *   icon, line, gap and borders. Text-only tracks keep their configured size.
 */
const TabsNavigation = React.forwardRef(({ className, style, variant, size = 'md', tone, scroll, width, mode, edgeToEdge, ...props }, ref) => {
  const theme = useTheme()
  const look = lookOf(theme, variant, size, true)
  const { key } = look
  const section = mode === 'section'
  const rim = section ? getThemeComponent(theme, 'category_tabs').base.border?.width ?? 0 : 0
  const track = (
    <TabsContext.Provider value={{ ...look, layout: mode || 'navigation', scroll: scroll || section, size }}>
      <div
        ref={ref}
        data-slot='tabs-navigation'
        data-variant={key}
        className={cn(list({ variant: key, edge: false, layout: 'fill' }), navigation({ tone, width, mode, edgeToEdge }), className)}
        style={{
          ...componentVars(theme, 'tabs', { look: look.paint }),
          ...actionGeometry(look, rim),
          ...overlapVars(look),
          ...(section && {
            '--ui-tabs-section-rim': `${rim}px`,
            '--ui-tabs-action-center-offset': `${look.centerOffset}px`
          }),
          ...style
        }}
        {...props}
      />
    </TabsContext.Provider>
  )
  return scroll ? <TabsScrollArea variant={variant} size={size} flex>{track}</TabsScrollArea> : track
})
TabsNavigation.displayName = 'TabsNavigation'

/**
 * An action in TabsNavigation. `active` sets its theme paint. With onClick the
 * action is a native button with aria-pressed (or the caller's tab semantics).
 * Without onClick it can hold a noninteractive loading placeholder.
 * With `href` it is a link to another page (`<a>`, `aria-current='page'` while `active`, not a
 * toggle): the app's `onClick` may navigate itself, the address stays for the browser.
 * `noWrap` keeps the full label visible inside a horizontally scrolling track.
 * `icon` is decorative; the label names the action. `loading` draws the
 * noninteractive row of placeholders in a stacked track.
 */
const TabsAction = React.forwardRef(({ active = false, children, className, href, icon, loading, noWrap, onClick, role, style, ...props }, ref) => {
  const look = React.useContext(TabsContext)
  const { key, gapless, joined, length, scroll, layout, edge, size } = look
  const theme = useTheme()
  const stackedIcon = layout === 'stacked' && !!icon
  const clipped = React.useContext(TabsScrollContext)
  const link = href !== undefined
  const Element = link ? 'a' : onClick ? 'button' : 'div'
  return (
    <Element
      ref={ref}
      data-slot='tabs-action'
      data-active={active ? '' : undefined}
      data-stacked-icon={stackedIcon ? '' : undefined}
      style={stackedIcon ? { ...stackedIconGeometry(theme, look, size), ...style } : style}
      href={link ? href : undefined}
      type={onClick && !link ? 'button' : undefined}
      role={role}
      aria-pressed={onClick && !link && !role && layout !== 'section' ? active : undefined}
      aria-current={link ? (active ? 'page' : undefined) : layout === 'section' && active && !props['aria-haspopup'] ? 'location' : undefined}
      onClick={onClick}
      className={cn(
        tab({ variant: key, length: key === 'underline' ? indicatorLength(length) : null, gapless: false, joined, layout }),
        overlapClass({ edge, gapless }),
        'ui:data-active:bg-(--ui-tabs-active-background) ui:data-active:text-(--ui-tabs-active) ui:[&[hidden]]:hidden',
        key === 'underline' && 'ui:data-active:after:bg-(--ui-tabs-indicator)',
        // a bar that scrolls keeps each tab as wide as its label; `noWrap` asks it of one in a bar that does not
        (noWrap || scroll) && 'ui:min-w-max',
        link && 'ui:no-underline',
        stackedIcon && 'ui:h-auto ui:min-h-(--ui-tabs-stacked-action-height) ui:leading-(--ui-tabs-text-line) ui:[&>span]:shrink-0',
        layout === 'stacked' && !stackedIcon && 'ui:[font:inherit]',
        loading && 'ui:flex-row ui:justify-between ui:pt-sm ui:pl-none ui:pr-sm ui:min-[480px]:pr-lg ui:[&>span]:mb-lg ui:[&>span]:me-lg',
        (scroll || clipped) && INSET_FOCUS,
        className
      )}
      {...props}
    >
      {icon && <span aria-hidden='true' className='ui:flex ui:shrink-0 ui:[&_img]:size-(--ui-tabs-icon-size)'>{icon}</span>}
      {withEllipsis(children)}
    </Element>
  )
})
TabsAction.displayName = 'TabsAction'

const shadowRoom = cva([
  'ui:relative ui:overflow-x-auto ui:box-border',
  'ui:[--ui-tabs-viewport-top:max(var(--ui-tabs-base-top),var(--ui-tabs-touch-top,0px))]',
  'ui:[--ui-tabs-viewport-bottom:max(var(--ui-tabs-shadow-bottom),var(--ui-tabs-touch-bottom,0px))]',
  'ui:[padding:var(--ui-tabs-viewport-top)_calc(var(--ui-tabs-inset-side)+var(--ui-tabs-shadow-right))_var(--ui-tabs-viewport-bottom)_calc(var(--ui-tabs-inset-side)+var(--ui-tabs-shadow-left))]',
  'ui:[margin:calc(var(--ui-tabs-inset-side)-var(--ui-tabs-viewport-top))_calc(-1*var(--ui-tabs-shadow-right))_calc(var(--ui-tabs-space-after)-var(--ui-tabs-viewport-bottom))_calc(-1*var(--ui-tabs-shadow-left))]',
  /* touch-target */ 'ui:pointer-coarse:[--ui-tabs-touch-floor:44px]',
  'ui:pointer-coarse:[--ui-tabs-touch-top:calc((var(--ui-tabs-touch-floor)-var(--ui-tabs-track-height))/2+var(--ui-tabs-center-offset))]',
  'ui:pointer-coarse:[--ui-tabs-touch-bottom:calc((var(--ui-tabs-touch-floor)-var(--ui-tabs-track-height))/2-var(--ui-tabs-center-offset))]'
], {
  variants: {
    flex: { true: 'ui:flex' },
    inset: { true: 'ui:w-full' },
    shadow: { true: 'ui:[width:calc(100%+var(--ui-tabs-shadow-left)+var(--ui-tabs-shadow-right))]' }
  }
})

/**
 * A horizontal scrollport that keeps the tab bar's shadow visible.
 * - `variant`, `size`: the same theme style and size as TabsNavigation.
 * - `flex`: lay the track out as a flex item, like the surrounding toolbar.
 * - `shadow={false}`: use when the existing viewport clips shadow at its edge.
 * - `spaceAfter`: a spacing token for the margin below the track.
 * - `inset`: a spacing token for the top and sides of an inset scrolling row.
 */
const TabsScrollArea = ({ variant, size = 'md', spaceAfter, inset, flex = false, shadow = true, className, style, children, ...props }) => {
  const theme = useTheme()
  const { paint, height, centerOffset } = lookOf(theme, variant, size, true)
  const reach = shadow ? paint.shadow.reach : { top: 0, right: 0, bottom: 0, left: 0 }
  const padding = inset ? themeSpace(theme, inset) : '0px'
  return (
    <div
      data-slot='tabs-scroll-area'
      className={cn(shadowRoom({ flex: flex || !!inset, inset: !!inset, shadow: Object.values(reach).some(Boolean) }), className)}
      style={{
        '--ui-tabs-shadow-top': `${reach.top}px`,
        '--ui-tabs-shadow-right': `${reach.right}px`,
        '--ui-tabs-shadow-bottom': `${reach.bottom}px`,
        '--ui-tabs-shadow-left': `${reach.left}px`,
        '--ui-tabs-base-top': `calc(${padding} + ${reach.top}px)`,
        '--ui-tabs-track-height': `${height}px`,
        '--ui-tabs-center-offset': `${centerOffset}px`,
        '--ui-tabs-inset-side': padding,
        '--ui-tabs-space-after': spaceAfter ? themeSpace(theme, spaceAfter) : '0px',
        ...style
      }}
      {...props}
    >
      <TabsScrollContext.Provider value>{children}</TabsScrollContext.Provider>
    </div>
  )
}

export { Tabs, TabsAction, TabsContent, TabsIndicator, TabsNavigation, TabsList, TabsScrollArea, TabsTrigger }
