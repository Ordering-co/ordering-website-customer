import React from 'react'
import { Button } from './Button'
import { cva } from 'class-variance-authority'
import { getThemeCss } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'
import { themeIconSize, themeFontFamily, themePartText, themeRadius, themeTextStyle } from '~/utils/themeTokens'
import { motionTiming } from '~/utils/themeMotion'
import { slotSize } from '~/utils/themeGroups'
import { componentVars } from '../lib/componentVars'

/* Feature-specific Button appearances live beside the piece so routes only
   load the appearances they render. They define paint; Button owns semantics,
   focus, touch area, and forwarding to the native control. */

const CARD_SURFACE = [
  'ui:box-border ui:flex ui:w-full ui:[font:inherit] ui:[font-family:var(--ui-action-card-font)] ui:text-start',
  'ui:rounded-(--ui-action-card-radius) ui:bg-(--ui-action-card-background) ui:[border:var(--ui-action-card-border)]',
  'ui:[box-shadow:var(--ui-action-card-shadow)] ui:not-data-disabled:hover:[box-shadow:var(--ui-action-card-hover-shadow)] ui:focus-visible:[box-shadow:var(--ui-action-card-focus-shadow,var(--ui-action-card-shadow))]',
  'ui:motion-safe:transition-shadow ui:motion-safe:duration-(--ui-action-card-motion-duration) ui:motion-safe:ease-(--ui-action-card-motion-easing)'
]

const cardVars = (theme, component) => {
  const { base, variants } = getThemeCss(theme, component)
  const { hover, focus } = variants.default.states
  const { duration, easing } = motionTiming(theme, component)
  return {
    '--ui-action-card-background': base.background,
    '--ui-action-card-border': base.border,
    '--ui-action-card-radius': base.radius,
    '--ui-action-card-shadow': base.shadow.css,
    '--ui-action-card-padding': base.padding,
    '--ui-action-card-font': themeFontFamily(theme, base.font_role),
    '--ui-action-card-hover-shadow': hover.shadow.css,
    '--ui-action-card-focus-shadow': focus?.shadow?.css,
    '--ui-action-card-motion-duration': duration,
    '--ui-action-card-motion-easing': easing
  }
}

const cardClasses = cva([
  ...CARD_SURFACE,
  'ui:p-(--ui-action-card-padding) ui:text-text ui:no-underline'
], {
  variants: {
    layout: {
      column: 'ui:flex-col ui:gap-xs',
      row: 'ui:items-center ui:justify-between ui:gap-md ui:text-(--ui-help-topic-text-color)'
    }
  }
})

const buttonCard = ({ theme, cardLayout }) => ({
  classes: cardClasses({ layout: cardLayout }),
  vars: { ...cardVars(theme, 'card'), ...(cardLayout === 'row' && componentVars(theme, 'help_topic')) }
})

const orderCardClasses = cva([
  ...CARD_SURFACE,
  'ui:p-lg'
], {
  variants: { active: { true: 'ui:not-hover:[border-color:var(--ot-color-primary)]!', false: '' } }
})

const buttonOrderCard = ({ theme, cardActive }) => ({
  classes: orderCardClasses({ active: cardActive }),
  vars: cardVars(theme, 'order_card')
})

const menuItemClasses = cva([
  'ui:box-border ui:flex ui:items-center ui:justify-between ui:min-h-(--ui-menu-item-height) ui:px-(--ui-menu-padding-x) ui:rounded-none ui:text-start ui:text-inherit',
  'ui:font-(family-name:--ui-menu-item-text-family) ui:text-(length:--ui-menu-item-text-size) ui:leading-(--ui-menu-item-text-line) ui:font-(weight:--ui-menu-item-text-weight)',
  'ui:[letter-spacing:var(--ui-menu-item-text-letter-spacing,normal)] ui:[text-transform:var(--ui-menu-item-text-transform,none)]',
  'ui:hover:bg-(--ui-menu-item-hover) ui:data-selected:bg-(--ui-menu-item-selected) ui:data-selected:hover:bg-(--ui-menu-item-selected)',
  'ui:motion-safe:transition-[color,background-color,border-color,box-shadow,opacity] ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing)'
])

const buttonMenuItem = ({ theme, menuSelected }) => ({
  classes: menuItemClasses(),
  vars: componentVars(theme, 'menu'),
  selected: menuSelected
})

const heroLocationClasses = cva([
  'ui:box-border ui:flex ui:items-center ui:w-full ui:min-w-[0] ui:min-h-(--ui-hero-field-height) ui:py-sm ui:px-lg ui:[font:inherit] ui:text-start',
  'ui:rounded-(--ui-home-hero-card-radius) ui:bg-(--ui-home-hero-card-background) ui:[border:var(--ui-home-hero-card-border)] ui:[box-shadow:var(--ui-home-hero-card-shadow)]',
  'ui:[&_svg]:shrink-0 ui:[&_svg]:me-md ui:[&_svg]:text-(length:--ui-hero-field-icon-size) ui:[&_svg]:text-(color:--ui-home-hero-field-icon-color)'
], {
  variants: { wide: { true: 'ui:mobile:px-xl', false: '' } }
})

const buttonHeroLocation = ({ theme, heroWide }) => {
  const size = slotSize(theme, 'home_hero', 'search', 'lg')
  const buttonSizes = getThemeCss(theme, 'button').sizes
  return {
    classes: heroLocationClasses({ wide: heroWide }),
    vars: {
      ...componentVars(theme, 'home_hero'),
      '--ui-hero-field-height': (buttonSizes[size] || buttonSizes.lg).height,
      '--ui-hero-field-icon-size': themeIconSize(theme, 'lg')
    }
  }
}

const checkoutGuestLinkClasses = cva([
  'ui:text-(--ui-checkout-guest-link-color) ui:underline',
  'ui:[font-family:inherit] ui:text-(length:--ui-checkout-guest-link-size) ui:font-(weight:--ui-checkout-guest-link-weight)'
])

const buttonCheckoutGuestLink = ({ theme }) => {
  const text = themeTextStyle(theme, 'body', { fontSize: undefined, fontWeight: 500 })
  return {
    classes: checkoutGuestLinkClasses(),
    vars: {
      '--ui-checkout-guest-link-size': text.fontSize,
      '--ui-checkout-guest-link-weight': text.fontWeight,
      '--ui-checkout-guest-link-color': themeColor(theme, 'primary')
    }
  }
}

const paymentDisclosureClasses = cva([
  'ui:box-border ui:flex ui:w-full ui:items-center ui:justify-between ui:[font:inherit] ui:text-inherit ui:text-start',
  'ui:rounded-(--ui-payment-disclosure-radius) ui:bg-(--ui-accordion-header-background) ui:hover:bg-(--ui-accordion-header-hover)'
])

const buttonPaymentDisclosure = ({ theme }) => ({
  classes: paymentDisclosureClasses(),
  vars: { ...componentVars(theme, 'accordion'), '--ui-payment-disclosure-radius': themeRadius(theme, 'sm') }
})

const chartLabelClasses = cva([
  'ui:grid ui:content-start ui:min-w-[0] ui:overflow-hidden ui:after:content-none',
  'ui:[font:inherit] ui:[font-size:var(--ui-chart-label-size)]! ui:text-text-disabled ui:aria-pressed:text-text'
], {
  variants: {
    last: {
      true: 'ui:justify-end',
      false: 'ui:[grid-template-columns:minmax(0,var(--ui-chart-marker-offset))_max-content] ui:[&>span]:col-start-2'
    }
  }
})

const buttonChartLabel = ({ theme, chartIndex }) => ({
  classes: chartLabelClasses({ last: chartIndex === 4 }),
  vars: {
    '--ui-chart-label-size': themeTextStyle(theme, 'caption', { fontSize: undefined }).fontSize,
    // Compensate for the final lane's width so each label still starts at its quarter mark
    // wherever it fits. The empty grid column shrinks before the label does.
    '--ui-chart-marker-offset': `calc(var(--reviews-rating-target) * ${chartIndex} / 4)`
  }
})

const collapsibleHeadingClasses = cva([
  'ui:flex ui:flex-col ui:[font:inherit] ui:text-inherit ui:text-start',
  'ui:data-busy:not-data-loading:grid ui:data-busy:not-data-loading:[grid-template-columns:auto_minmax(0,1fr)]',
  'ui:data-busy:not-data-loading:[&>:first-child]:self-center ui:data-busy:not-data-loading:[&>:nth-child(2)]:col-start-2',
  'ui:data-busy:not-data-loading:[&>:nth-child(n+3)]:col-span-full'
])
const buttonCollapsibleHeading = () => ({ classes: collapsibleHeadingClasses() })

const chatAttachmentClasses = cva('ui:block ui:w-full ui:rounded-(--ui-attachment-radius) ui:[font:inherit] ui:text-inherit ui:[text-align:inherit]')
const buttonChatAttachment = ({ theme }) => ({
  classes: chatAttachmentClasses(),
  vars: { '--ui-attachment-radius': themeRadius(theme, 'sm') }
})

// A category tile of the business types (image on top, name below): block, its box's width, the small Identity radius
// (the focus ring follows the picture), the text and alignment of the row it sits in
const businessTypeTileClasses = cva('ui:block ui:w-full ui:rounded-(--ui-business-type-tile-radius) ui:[font:inherit] ui:text-inherit ui:[text-align:inherit]')
const buttonBusinessTypeTile = ({ theme }) => ({
  classes: businessTypeTileClasses(),
  vars: { '--ui-business-type-tile-radius': themeRadius(theme, 'sm') }
})

const inlineDisclosureClasses = cva('ui:inline-flex ui:items-center ui:gap-xs ui:[font:inherit] ui:text-inherit ui:text-start', {
  variants: { shape: { icon: 'ui:text-center ui:cursor-[inherit]', text: '' } }
})
const buttonInlineDisclosure = ({ shape }) => ({ classes: inlineDisclosureClasses({ shape }) })

// A stop of the slider (the distance, the time): `components.slider`'s mark, in its active color
// and bold when it is the chosen one; no box. Its color moves as the slider's fill does.
const sliderStopClasses = cva([
  'ui:font-(family-name:--ui-slider-mark-family) ui:text-(length:--ui-slider-mark-size) ui:leading-(--ui-slider-mark-line) ui:font-(weight:--ui-slider-stop-weight)',
  'ui:[letter-spacing:var(--ui-slider-mark-letter-spacing,normal)] ui:[text-transform:var(--ui-slider-mark-transform,none)]',
  'ui:motion-safe:transition-[color] ui:motion-safe:duration-(--ui-slider-motion-duration) ui:motion-safe:ease-(--ui-slider-motion-easing)'
], {
  variants: { active: { true: 'ui:text-(--ui-slider-mark-active)', false: 'ui:text-(--ui-slider-mark-color)' } }
})

// (the bold the stop has today, 600, as the mark's own font has it)
const buttonSliderStop = ({ theme, sliderActive }) => {
  const vars = componentVars(theme, 'slider')
  return {
    classes: sliderStopClasses({ active: sliderActive }),
    vars: { ...vars, '--ui-slider-stop-weight': sliderActive ? /font-weight: ([^;]+);/.exec(themePartText(theme, 'slider', 'base.mark', { weight: 600 }))[1] : vars['--ui-slider-mark-weight'] },
    selected: sliderActive
  }
}

/* A route imports the configured component. The public appearance remains a
   name, while the theme resolver stays in the route's module graph. */
const bindAppearance = (appearance, resolve) => {
  const ThemedButton = React.forwardRef(({
    chartIndex = 0, cardLayout = 'column', cardActive = false, heroWide = false, menuSelected = false, sliderActive = false, ...props
  }, ref) => (
    <Button
      {...props}
      ref={ref}
      appearance={appearance}
      resolveAppearance={(theme, shape) => resolve({ theme, shape, chartIndex, cardLayout, cardActive, heroWide, menuSelected, sliderActive })}
    />
  ))
  ThemedButton.displayName = `Button(${appearance})`
  return ThemedButton
}

export const CardButton = /* @__PURE__ */ bindAppearance('card', buttonCard)
export const OrderCardButton = /* @__PURE__ */ bindAppearance('order-card', buttonOrderCard)
export const MenuItemButton = /* @__PURE__ */ bindAppearance('menu-item', buttonMenuItem)
export const HeroLocationButton = /* @__PURE__ */ bindAppearance('hero-location', buttonHeroLocation)
export const CheckoutGuestButton = /* @__PURE__ */ bindAppearance('checkout-guest-link', buttonCheckoutGuestLink)
export const PaymentDisclosureButton = /* @__PURE__ */ bindAppearance('payment-disclosure', buttonPaymentDisclosure)
export const ChartLabelButton = /* @__PURE__ */ bindAppearance('chart-label', buttonChartLabel)
export const CollapsibleHeadingButton = /* @__PURE__ */ bindAppearance('collapsible-heading', buttonCollapsibleHeading)
export const ChatAttachmentButton = /* @__PURE__ */ bindAppearance('chat-attachment', buttonChatAttachment)
export const BusinessTypeTileButton = /* @__PURE__ */ bindAppearance('business-type-tile', buttonBusinessTypeTile)
export const InlineDisclosureButton = /* @__PURE__ */ bindAppearance('disclosure-inline', buttonInlineDisclosure)
export const SliderStopButton = /* @__PURE__ */ bindAppearance('slider-stop', buttonSliderStop)
