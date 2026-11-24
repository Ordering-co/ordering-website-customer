import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { themePartText, themeRadius, themeTextStyle } from '~/utils/themeTokens'
import { buildAppTheme } from '~/utils/appTheme'
import { slotButtonOptions } from '~/utils/themeGroups'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { linkTheme } from '~ui/src/styles/Link'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { BusinessTypeTileButton, CollapsibleHeadingButton, ChatAttachmentButton, InlineDisclosureButton, CardButton, OrderCardButton, MenuItemButton, HeroLocationButton, CheckoutGuestButton, PaymentDisclosureButton, ChartLabelButton, SliderStopButton } from '../ButtonAppearances'
import { Button, buttonVariants } from '../Button'
import { Icon } from '../Icon'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
// the class of a piece drawn alone (several draws in one test would share the document)
const classOf = (element, theme = defaults, role = 'button') => {
  const view = draw(element, theme)
  const classes = view.getByRole(role).getAttribute('class')
  view.unmount()
  return classes
}
const withCta = (desktop, phone) => buildAppTheme(null, { version: 2, values: { components: { button: { base: { cta_full_width: desktop }, ...(phone !== undefined && {}) } }, ...(phone !== undefined && { platforms: { mobile_web: { components: { button: { base: { cta_full_width: phone } } } } } }) } })

afterEach(() => vi.restoreAllMocks())

describe('Button', () => {
  it.each([defaults, grill])('uses the hero card surface at the height of its search action', (theme) => {
    const { getByRole } = draw(<HeroLocationButton heroWide>Address</HeroLocationButton>, theme)
    const button = getByRole('button', { name: 'Address' })
    const hero = componentVars(theme, 'home_hero')
    expect(button.style.getPropertyValue('--ui-home-hero-card-border')).toBe(hero['--ui-home-hero-card-border'])
    expect(button.style.getPropertyValue('--ui-home-hero-card-radius')).toBe(hero['--ui-home-hero-card-radius'])
    expect(button.style.getPropertyValue('--ui-hero-field-height')).toBe(componentVars(theme, 'button', { size: 'lg' })['--ui-button-height'])
    expect(button).toHaveClass('ui:mobile:px-xl')
  })

  it.each([defaults, grill])('draws a dialog opener with the input height and states', (theme) => {
    const { getByRole } = draw(<Button appearance='input-trigger' size='lg' aria-haspopup='dialog'>When</Button>, theme)
    const button = getByRole('button', { name: 'When' })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button.style.getPropertyValue('--ui-input-height')).toBe(componentVars(theme, 'input', { variant: 'default', size: 'lg' })['--ui-input-height'])
    expect(button).toHaveClass('ui:h-(--ui-input-height)', 'ui:px-(--ui-input-padding-x)')
  })

  it('the moment capsule action shows the pointer cursor (not default) except when disabled', () => {
    const cls = classOf(<Button appearance='capsule-item' capsuleItem='moment'><div>ASAP</div></Button>)
    expect(cls).toContain('ui:cursor-pointer')
    expect(cls).not.toMatch(/(^|\s)ui:cursor-default/)
    expect(cls).toContain('ui:[&>div]:cursor-[inherit]')
  })

  it.each([defaults, grill])('uses the scoped order type tabs on a capsule action', (theme) => {
    const { getByRole } = draw(<Button appearance='capsule-item' capsuleItem='moment'><div>ASAP</div></Button>, theme)
    const button = getByRole('button', { name: 'ASAP' })
    expect(button).toHaveClass('ui:[&>div]:px-xs')
    expect(button.style.getPropertyValue('--ui-capsule-inactive-color')).toBeTruthy()
    expect(button.style.getPropertyValue('--ui-tabs-icon-size')).toBeTruthy()
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
  })

  it.each([defaults, grill])('keeps the brand mark composition independent of the regular button box', (theme) => {
    const { getByRole } = draw(<Button appearance='brand' aria-label='Go to home'><img alt='' src='/logo.svg' /></Button>, theme)
    const button = getByRole('button', { name: 'Go to home' })
    expect(button).toHaveClass('ui:flex', 'ui:items-center', 'ui:p-none')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
    expect(button.firstElementChild).toHaveAttribute('src', '/logo.svg')
  })

  it.each([defaults, grill])('applies the menu row height and selected surface to a category action', (theme) => {
    const { getByRole } = draw(<MenuItemButton menuSelected aria-expanded={false}>Drinks</MenuItemButton>, theme)
    const button = getByRole('button', { name: 'Drinks', expanded: false })
    const menu = componentVars(theme, 'menu')
    expect(button).toHaveAttribute('data-selected')
    expect(button.style.getPropertyValue('--ui-menu-item-height')).toBe(menu['--ui-menu-item-height'])
    expect(button.style.getPropertyValue('--ui-menu-item-selected')).toBe(menu['--ui-menu-item-selected'])
  })

  it.each([defaults, grill])('places the continued-order arrow with the history offsets', (theme) => {
    const { getByRole } = draw(<Button iconEndOffset iconEnd={<Icon name='arrowRight' />}>Continue</Button>, theme)
    const button = getByRole('button', { name: 'Continue' })
    const icon = button.querySelector('[data-slot="button-icon-end"]')
    expect(icon).toHaveClass('ui:top-md', 'ui:end-lg', 'ui:rtl:rotate-180')
    expect(button.style.getPropertyValue('--ui-button-offset-icon-size')).toBe(theme.css.tokens.icon.lg)
  })

  it.each([defaults, grill])('keeps the bare loading favorite and permits its existing action', (theme) => {
    const onClick = vi.fn()
    const { getByRole } = draw(
      <Button appearance='plain' aria-label='Favorite' aria-pressed={false} onClick={onClick}><span aria-hidden='true'>…</span></Button>,
      theme
    )
    const button = getByRole('button', { name: 'Favorite', pressed: false })
    expect(button).toHaveClass('ui:flex', 'ui:[font:inherit]')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it.each([defaults, grill])('keeps the favorite glyph on the neutral solid surface', (theme) => {
    const { getByRole } = draw(<Button favorite='solid' aria-label='Favorite' aria-pressed><Icon name='heartFilled' /></Button>, theme)
    const button = getByRole('button', { name: 'Favorite', pressed: true })
    const solid = componentVars(theme, 'button', { color: 'neutral', appearance: 'solid', shape: 'icon' })
    expect(button.style.getPropertyValue('--ui-button-background')).toBe(solid['--ui-button-background'])
    expect(button.style.getPropertyValue('--ui-button-shadow')).toBe(solid['--ui-button-shadow'])
    expect(button.style.getPropertyValue('--ui-favorite-color')).toBe(componentVars(theme, 'favorite')['--ui-favorite-color'])
  })

  it.each([defaults, grill])('paints decorative text and icons without another focusable control', (theme) => {
    const action = vi.fn()
    const { container, queryByRole } = draw(
      <>
        <Button decorative disabled onClick={action}>Add</Button>
        <Button decorative shape='icon'><Icon name='pencil' /></Button>
      </>,
      theme
    )
    const [label, pencil] = container.querySelectorAll('[data-slot="button-decoration"]')
    expect(queryByRole('button')).toBeNull()
    expect(label).toHaveAttribute('aria-hidden', 'true')
    expect(label).toHaveAttribute('data-disabled')
    expect(pencil).not.toHaveAttribute('tabindex')
    expect(label.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { color: 'primary', appearance: 'solid' })['--ui-button-background'])
    fireEvent.click(label)
    expect(action).not.toHaveBeenCalled()
  })

  it.each([defaults, grill])('keeps a driver telephone action as an anchor with the success icon box', (theme) => {
    const { getByRole } = draw(
      <Button render={<a href='tel:123456' />} nativeButton={false} shape='icon' layout='row' iconLine color='success' size='lg' aria-label='Call driver'>
        <Icon name='phone' />
      </Button>,
      theme
    )
    const link = getByRole('link', { name: 'Call driver' })
    expect(link).toHaveAttribute('href', 'tel:123456')
    expect(link).toHaveClass('ui:leading-(--ui-button-height)', 'ui:flex')
    expect(link.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { color: 'success', appearance: 'solid', size: 'lg', shape: 'icon' })['--ui-button-background'])
  })

  it.each([defaults, grill])('uses the compact ghost box and line height for inline info', (theme) => {
    const { getByRole } = draw(<Button inlineInfo aria-label='Information'><Icon name='info' /></Button>, theme)
    const button = getByRole('button', { name: 'Information' })
    const themed = componentVars(theme, 'button', { color: 'primary', appearance: 'ghost', shape: 'icon', size: 'xs' })
    expect(button).toHaveClass('ui:ms-xs', 'ui:align-middle', 'ui:leading-(--ui-button-height)')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe(themed['--ui-button-height'])
  })

  it.each([defaults, grill])('takes the selected map toggle slot and the full lane', (theme) => {
    const options = slotButtonOptions(theme, 'order_tracking', 'map_toggle_expanded', { color: 'neutral' })
    const { getByRole } = draw(<Button {...options} borderInset layout='row' iconSize='content' fullWidth>Minimize map</Button>, theme)
    const button = getByRole('button', { name: 'Minimize map' })
    expect(button).toHaveClass('ui:flex', 'ui:w-full')
    expect(button).not.toHaveClass('ui:[&_svg]:size-(--ui-button-icon-size)')
    expect(button.style.getPropertyValue('--ui-button-color')).toBe(componentVars(theme, 'button', options)['--ui-button-color'])
  })

  it.each([defaults, grill])('reserves the thin border and paints the chosen survey slot', (theme) => {
    const options = slotButtonOptions(theme, 'order_tracking', 'survey_start', { color: 'neutral' })
    const { getByRole } = draw(<Button {...options} layout='inline' borderInset>Rate</Button>, theme)
    const button = getByRole('button', { name: 'Rate' })
    expect(button).toHaveClass('ui:inline-block')
    expect(button.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', options)['--ui-button-background'])
    expect(button.style.getPropertyValue('--ui-button-border')).not.toBe('none')
  })

  it.each([defaults, grill])('uses the floating cart radius on the regular button box', (theme) => {
    const { getByRole } = draw(<Button cartFab fullWidth>Checkout</Button>, theme)
    const button = getByRole('button', { name: 'Checkout' })
    expect(button.style.getPropertyValue('--ui-button-radius')).toBe(componentVars(theme, 'cart')['--ui-cart-fab-radius'])
    expect(button).toHaveClass('ui:w-full')
  })

  it.each([defaults, grill])('uses the order card theme and wraps the order summary', (theme) => {
    const { getByRole } = draw(<OrderCardButton><span>Order 123</span><span>Completed</span></OrderCardButton>, theme)
    const button = getByRole('button', { name: 'Order 123 Completed' })
    expect(button).toHaveClass('ui:flex', 'ui:w-full')
    expect(button.style.getPropertyValue('--ui-action-card-background')).toBe(componentVars(theme, 'order_card')['--ui-order-card-background'])
    expect(button.children).toHaveLength(2)
  })

  it.each([defaults, grill])('draws a card action with a theme surface and wrapping contents', (theme) => {
    const { getByRole } = draw(<CardButton><strong>Student</strong><span>School</span></CardButton>, theme)
    const button = getByRole('button', { name: 'Student School' })
    expect(button).toHaveClass('ui:flex-col', 'ui:gap-xs')
    expect(button.children).toHaveLength(2)
    expect(button.style.getPropertyValue('--ui-action-card-padding')).toBe(componentVars(theme, 'card')['--ui-card-padding'])
  })

  it.each([defaults, grill])('uses the body and primary tokens for a guest checkout link', (theme) => {
    const { getByRole } = draw(<CheckoutGuestButton>Log in</CheckoutGuestButton>, theme)
    const button = getByRole('button', { name: 'Log in' })
    const text = themeTextStyle(theme, 'body', { fontSize: undefined, fontWeight: 500 })
    expect(button).toHaveClass('ui:underline')
    expect(button.style.getPropertyValue('--ui-checkout-guest-link-size')).toBe(text.fontSize)
    expect(button.style.getPropertyValue('--ui-checkout-guest-link-weight')).toBe(String(text.fontWeight))
  })

  it.each([defaults, grill])('uses accordion header backgrounds for the payment disclosure', (theme) => {
    const { getByRole } = draw(<PaymentDisclosureButton aria-expanded={false}>Payment</PaymentDisclosureButton>, theme)
    const button = getByRole('button', { name: 'Payment', expanded: false })
    const accordion = componentVars(theme, 'accordion')
    expect(button).toHaveClass('ui:justify-between', 'ui:w-full')
    expect(button.style.getPropertyValue('--ui-accordion-header-background')).toBe(accordion['--ui-accordion-header-background'])
    expect(button.style.getPropertyValue('--ui-accordion-header-hover')).toBe(accordion['--ui-accordion-header-hover'])
  })

  it.each([defaults, grill])('resolves the icon, label and active colors of bottom navigation', (theme) => {
    const { getByRole } = draw(<Button appearance='bottom-nav-item' aria-current='page'><span>Cart</span></Button>, theme)
    const button = getByRole('button', { name: 'Cart' })
    const nav = componentVars(theme, 'bottom_nav')
    expect(button).toHaveClass('ui:flex-col', 'ui:items-center')
    expect(button.style.getPropertyValue('--ui-bottom-nav-item-color')).toBe(nav['--ui-bottom-nav-active'])
    expect(button.style.getPropertyValue('--ui-bottom-nav-label-text-size')).toBe(nav['--ui-bottom-nav-label-text-size'])
  })

  it.each([defaults, grill])('inherits the inline disclosure typography and themed gap', (theme) => {
    const { getByRole } = draw(<InlineDisclosureButton aria-expanded>Taxes and fees</InlineDisclosureButton>, theme)
    const button = getByRole('button', { expanded: true })
    expect(button).toHaveClass('ui:inline-flex', 'ui:gap-xs', 'ui:[font:inherit]')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
  })

  it.each([defaults, grill])('keeps layout and disclosure semantics for a collapsible heading', (theme) => {
    const { getByRole } = draw(
      <CollapsibleHeadingButton aria-expanded={false}><span>Options</span><span>Required</span></CollapsibleHeadingButton>,
      theme
    )
    const button = getByRole('button', { expanded: false, name: 'Options Required' })
    expect(button).toHaveClass('ui:flex-col', 'ui:[font:inherit]')
    expect(button.children).toHaveLength(2)
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
  })

  it.each([defaults, grill])('uses the theme caption and selection color for a chart label', (theme) => {
    const { getByRole } = draw(<ChartLabelButton chartIndex={2} aria-pressed><span>3</span></ChartLabelButton>, theme)
    const button = getByRole('button', { pressed: true, name: '3' })
    expect(button).toHaveClass('ui:grid', 'ui:aria-pressed:text-text', 'ui:after:content-none')
    expect(button.style.getPropertyValue('--ui-chart-label-size')).toBe(themeTextStyle(theme, 'caption', { fontSize: undefined }).fontSize)
  })

  it.each([defaults, grill])('frames a chat attachment with the theme radius and no fixed height', (theme) => {
    const onClick = vi.fn()
    const { getByRole } = draw(
      <ChatAttachmentButton aria-label='View attachment' onClick={onClick}>
        <img src='/photo.png' alt='A photo' />
      </ChatAttachmentButton>,
      theme
    )
    const button = getByRole('button', { name: 'View attachment' })
    expect(button).toHaveClass('ui:block', 'ui:w-full', 'ui:rounded-(--ui-attachment-radius)')
    expect(button.firstElementChild).toBe(getByRole('img'))
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it.each([defaults, grill])('frames a category tile with the theme radius, at its box width, with the text of its row', (theme) => {
    const onClick = vi.fn()
    const { getByRole } = draw(<BusinessTypeTileButton aria-pressed onClick={onClick}><span>Food</span></BusinessTypeTileButton>, theme)
    const button = getByRole('button', { name: 'Food' })
    expect(button).toHaveClass('ui:block', 'ui:w-full', 'ui:rounded-(--ui-business-type-tile-radius)')
    expect(button.style.getPropertyValue('--ui-business-type-tile-radius')).toBe(themeRadius(theme, 'sm'))
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it.each([defaults, grill])('draws a text action from the link variant and size', (theme) => {
    const onClick = vi.fn()
    const { getByRole, rerender } = draw(
      <Button appearance='link' linkVariant='muted' size='sm' onClick={onClick}>Change</Button>,
      theme
    )
    const button = getByRole('button', { name: 'Change' })
    expect(button).toHaveClass('ui:inline', 'ui:p-none')
    expect(button.style.getPropertyValue('--ui-link-color')).toBe(linkTheme(theme, { variant: 'muted', size: 'sm' }).color)
    expect(vars(button)).toEqual(componentVars(theme, 'link', { variant: 'muted', size: 'sm' }))
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
    rerender(<ThemeProvider theme={theme}><Button appearance='link' disabled onClick={onClick}>Change</Button></ThemeProvider>)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is a native button that does not submit unless it says so, with the piece\'s slot', () => {
    const { getByRole } = draw(<Button>Add</Button>)
    const button = getByRole('button', { name: 'Add' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('data-slot')).toBe('button')
  })

  it('keeps a visible label and the action when a saved slot requests an icon', () => {
    const theme = buildAppTheme(null, {
      version: 2,
      values: {
        components: { order_details: { slots: { directions: { component: 'button', shape: 'icon', size: 'lg', appearance: 'outline' } } } }
      }
    })
    const options = slotButtonOptions(theme, 'order_details', 'directions')
    expect(options.shape).toBe('icon')
    const onClick = vi.fn()
    const { getByRole } = draw(
      <Button {...options} onClick={onClick}><span>Get Directions</span></Button>,
      theme
    )
    const button = getByRole('button', { name: 'Get Directions' })
    expect(button).toHaveClass('ui:px-(--ui-button-padding-x)')
    expect(button).not.toHaveClass('ui:w-(--ui-button-height)')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('48px')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('writes components.button on its own element: the default is the primary solid md', () => {
    const { getByRole } = draw(<Button>Add</Button>)
    expect(vars(getByRole('button'))).toEqual(componentVars(defaults, 'button', { size: 'md', color: 'primary', appearance: 'solid' }))
  })

  it('every color, appearance and size is the theme\'s', () => {
    ;['primary', 'secondary', 'danger', 'success', 'neutral', 'inverse'].forEach((color) => {
      ;['solid', 'outline', 'tonal', 'ghost'].forEach((appearance) => {
        const { getByRole, unmount } = draw(<Button color={color} appearance={appearance} size='lg'>x</Button>, grill)
        expect(vars(getByRole('button'))).toEqual(componentVars(grill, 'button', { size: 'lg', color, appearance }))
        unmount()
      })
    })
    const { getByRole } = draw(<Button size='sm'>x</Button>, cafe)
    expect(vars(getByRole('button'))['--ui-button-height']).toBe(componentVars(cafe, 'button', { size: 'sm' })['--ui-button-height'])
  })

  it('reads the theme in scope, a group\'s over the global one', () => {
    const { getByTestId } = draw(
      <>
        <Button data-testid='global'>x</Button>
        <ComponentScope group='header'><Button data-testid='scoped'>x</Button></ComponentScope>
      </>,
      grill
    )
    expect(getByTestId('global').style.getPropertyValue('--ui-button-height')).toBe('46px')
    expect(getByTestId('scoped').style.getPropertyValue('--ui-button-height')).toBe('34px')
    expect(getByTestId('scoped').style.getPropertyValue('--ui-button-radius')).toBe('9999px')
  })

  it('below the phone cut it takes the phone\'s values', () => {
    const { getByRole } = draw(<Button>x</Button>, { ...cafe, platform: 'mobile_web' })
    expect(getByRole('button').style.getPropertyValue('--ui-button-height')).toBe('48px')
  })

  it('no value is written in its classes: only variables of the theme, and its states fall back to the resting look', () => {
    const { getByRole } = draw(<Button>x</Button>)
    const classes = getByRole('button').getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    expect(classes).toContain('ui:h-(--ui-button-height)')
    expect(classes).toContain('var(--ui-button-hover-background,var(--ui-button-pressed-background,var(--ui-button-background)))')
    expect(classes).toContain('ui:motion-safe:duration-(--ui-button-motion-duration)')
    expect(classes).toContain('ui:motion-safe:ease-(--ui-button-motion-easing)')
    // the sheet has no translate-on-press, no fixed easing
    expect(classes).not.toMatch(/active:translate|ease-out|ease-in/)
  })

  it('the caller\'s class wins over the piece\'s, and its style over the variables', () => {
    const { getByRole } = draw(<Button className='ui:rounded-none' style={{ '--ui-button-height': '10px' }}>x</Button>)
    const button = getByRole('button')
    expect(button.getAttribute('class')).toContain('ui:rounded-none')
    expect(button.getAttribute('class')).not.toContain('ui:rounded-(--ui-button-radius)')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('10px')
  })

  it('forwards the ref and the native props, onClick included', () => {
    const ref = React.createRef()
    const onClick = vi.fn()
    const { getByRole } = draw(<Button ref={ref} type='submit' name='go' onClick={onClick}>Go</Button>)
    expect(ref.current).toBe(getByRole('button'))
    expect(ref.current.getAttribute('type')).toBe('submit')
    fireEvent.click(ref.current)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('a label that does not fit is a text node that can end in an ellipsis; an icon is left as it is', () => {
    const { getByRole } = draw(<Button><Icon name='bag' /> Add to cart</Button>)
    const button = getByRole('button')
    expect(button.querySelector('svg')).toBeTruthy()
    expect(button.querySelector('.ui\\:truncate').textContent).toBe(' Add to cart')
  })
})

describe('Button: the icon shape', () => {
  it('is a square of the size\'s height with the shape\'s own radius', () => {
    const { getByRole } = draw(<Button shape='icon' aria-label='Search'><Icon name='search' /></Button>)
    const button = getByRole('button', { name: 'Search' })
    expect(button.getAttribute('class')).toContain('ui:w-(--ui-button-height)')
    expect(button.getAttribute('class')).not.toContain('ui:px-(--ui-button-padding-x)')
    expect(vars(button)).toEqual(componentVars(defaults, 'button', { size: 'md', shape: 'icon', color: 'primary', appearance: 'solid' }))
  })

  it('warns in development when it has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    draw(<Button shape='icon'><Icon name='search' /></Button>)
    expect(warn).toHaveBeenCalledWith('Button: an icon button needs an aria-label')
    warn.mockClear()
    draw(<Button shape='icon' aria-label='Search'><Icon name='search' /></Button>)
    draw(<Button shape='icon' aria-labelledby='x'><Icon name='search' /></Button>)
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps a 44px touch target on a phone or a touch screen without touching its box', () => {
    const { getByRole } = draw(<Button shape='icon' aria-label='Search'><Icon name='search' /></Button>)
    const classes = getByRole('button').getAttribute('class')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:max-mobile:after:min-w-[44px]')
    // and with a touch screen wider than the phone cut (a tablet)
    expect(classes).toContain('ui:pointer-coarse:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-w-[44px]')
  })
})

describe('Button: disabled and loading', () => {
  it('disabled answers no click and says so', () => {
    const onClick = vi.fn()
    const { getByRole } = draw(<Button disabled onClick={onClick}>Pay</Button>)
    const button = getByRole('button')
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.hasAttribute('data-disabled')).toBe(true)
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    // the theme's disabled colors are still declared
    expect(button.style.getPropertyValue('--ui-button-disabled-background')).toBe('#CBCBCB')
  })

  it('loading is busy, not disabled in look: it keeps focus, answers no click, keeps its name and the resting look', () => {
    const onClick = vi.fn()
    const { getByRole, container } = draw(<Button loading onClick={onClick}><Icon name='bag' /> Place order</Button>)
    const button = getByRole('button', { name: 'Place order' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    // focusable while busy: it keeps the keyboard where it was
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('tabindex')).toBe('0')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(Object.keys(vars(button)).filter((name) => name.includes('-disabled-'))).toEqual([])
    expect(button.getAttribute('class')).toContain('ui:cursor-progress')
    // the label stays (and takes the room), hidden under a ring of components.spinner sm
    const ring = container.querySelector('[data-slot=button-spinner]')
    expect(ring.getAttribute('aria-hidden')).toBe('true')
    expect(ring.style.getPropertyValue('--ui-spinner-diameter')).toBe(componentVars(defaults, 'spinner', { size: 'sm' })['--ui-spinner-diameter'])
    expect(button.firstElementChild.getAttribute('class')).toContain('ui:opacity-0')
  })

  it('a button that stops loading is a button again', () => {
    const onClick = vi.fn()
    const view = draw(<Button loading onClick={onClick}>Pay</Button>)
    view.rerender(<ThemeProvider theme={defaults}><Button onClick={onClick}>Pay</Button></ThemeProvider>)
    const button = view.getByRole('button')
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(view.container.querySelector('[data-slot=button-spinner]')).toBeNull()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Button: busy (the sending state of a buying button)', () => {
  const sending = (props, theme = defaults) => draw(<Button busy {...props}>Placing your order…</Button>, theme)

  it('without busy nothing changes: the same classes, variables and children as before', () => {
    const plain = classOf(<Button>Pay</Button>)
    expect(classOf(<Button busy={false}>Pay</Button>)).toBe(plain)
    const { getByRole, container } = draw(<Button busy={false}>Pay</Button>)
    expect(getByRole('button').hasAttribute('aria-busy')).toBe(false)
    expect(getByRole('button').hasAttribute('data-busy')).toBe(false)
    expect(container.querySelector('[data-slot=button-spinner]')).toBeNull()
    expect(plain).not.toMatch(/cursor-progress/)
  })

  it('is busy, not disabled: aria-busy and aria-disabled, no disabled, focusable, in progress', () => {
    const { getByRole } = sending()
    const button = getByRole('button', { name: 'Placing your order…' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('tabindex')).toBe('0')
    expect(button.hasAttribute('data-busy')).toBe(true)
    // the pointer it had (the legacy $busy), not the progress cursor of loading nor the disabled one
    expect(button.getAttribute('class')).toContain('ui:data-disabled:cursor-pointer')
    expect(button.getAttribute('class')).not.toMatch(/cursor-progress|cursor-not-allowed/)
  })

  it('keeps the resting look: none of the theme\'s disabled variables, the rest are the button\'s', () => {
    const { getByRole } = sending()
    const own = vars(getByRole('button'))
    expect(Object.keys(own).filter((name) => name.includes('-disabled-'))).toEqual([])
    const rest = Object.fromEntries(Object.entries(componentVars(defaults, 'button', { size: 'md', color: 'primary', appearance: 'solid' })).filter(([name]) => !name.startsWith('--ui-button-disabled-')))
    expect(own).toEqual(rest)
  })

  it('answers no click, with the caller\'s onClick or without it', () => {
    const onClick = vi.fn()
    const { getByRole } = sending({ onClick })
    fireEvent.click(getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
    cleanup()
    const submit = vi.fn((event) => event.preventDefault())
    const view = draw(<form onSubmit={submit}><Button busy type='submit'>Send</Button></form>)
    fireEvent.click(view.getByRole('button'))
    expect(submit).not.toHaveBeenCalled()
  })

  it('the spinner (components.spinner sm) comes before the label, in the row and apart by the icon_gap, and the label is visible', () => {
    const { getByRole, container } = sending()
    const button = getByRole('button')
    const ring = container.querySelector('[data-slot=button-spinner]')
    expect(ring).toBe(button.firstElementChild)
    expect(ring.getAttribute('aria-hidden')).toBe('true')
    expect(ring.style.getPropertyValue('--ui-spinner-diameter')).toBe(componentVars(defaults, 'spinner', { size: 'sm' })['--ui-spinner-diameter'])
    // in the row, not over the label
    expect(ring.getAttribute('class')).not.toMatch(/ui:absolute|ui:inset-none|ui:m-auto/)
    expect(ring.getAttribute('class')).toContain('ui:shrink-0')
    // its arc and track are the theme's spinner color and track (what the store saved), not the button's text
    expect(ring.getAttribute('class')).toContain('ui:border-(color:--ui-spinner-track)')
    expect(ring.getAttribute('class')).toContain('ui:border-t-(color:--ui-spinner-color)')
    expect(ring.getAttribute('class')).not.toMatch(/border-transparent|border-t-current/)
    expect(ring.style.getPropertyValue('--ui-spinner-color')).toBe(componentVars(defaults, 'spinner', { size: 'sm' })['--ui-spinner-color'])
    expect(ring.style.getPropertyValue('--ui-spinner-track')).toBe(componentVars(defaults, 'spinner', { size: 'sm' })['--ui-spinner-track'])
    expect(ring.getAttribute('class')).toContain('ui:rounded-full')
    expect(button.getAttribute('class')).toContain('ui:gap-(--ui-button-icon-gap)')
    expect(button.getAttribute('class')).toContain('ui:inline-flex')
    expect(ring.nextElementSibling.textContent).toBe('Placing your order…')
    expect(ring.nextElementSibling.getAttribute('class')).not.toContain('ui:opacity-0')
    expect(container.querySelectorAll('[data-slot=button-spinner]')).toHaveLength(1)
  })

  it('the spinner of loading keeps its own look: the button\'s text color, no theme track', () => {
    const { container } = draw(<Button loading>Pay</Button>)
    const classes = container.querySelector('[data-slot=button-spinner]').getAttribute('class')
    expect(classes).toContain('ui:border-transparent')
    expect(classes).toContain('ui:border-t-current')
    expect(classes).not.toContain('--ui-spinner-track')
  })

  it('the ring turns in 800ms, and with reduced motion the busy one stays still where the loading one turns slowly', () => {
    const turn = { cancel: vi.fn() }
    const animate = vi.fn(() => turn)
    Element.prototype.animate = animate
    const reduce = (matches) => { window.matchMedia = vi.fn(() => ({ matches })) }
    try {
      reduce(false)
      draw(<Button busy>Pay</Button>)
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 800, iterations: Infinity })
      cleanup()
      animate.mockClear()
      reduce(true)
      draw(<Button busy>Pay</Button>)
      expect(animate).not.toHaveBeenCalled()
      cleanup()
      draw(<Button loading>Pay</Button>)
      expect(animate.mock.calls[0][1]).toMatchObject({ duration: 2400 })
    } finally {
      delete Element.prototype.animate
      delete window.matchMedia
    }
  })

  it('the caller\'s aria-disabled wins over the piece\'s', () => {
    expect(sending({ 'aria-disabled': 'false' }).getByRole('button').getAttribute('aria-disabled')).toBe('false')
  })

  it('loading is unchanged and wins when both are set: the spinner over the hidden label', () => {
    const { getByRole, container } = draw(<Button busy loading>Pay</Button>)
    const ring = container.querySelector('[data-slot=button-spinner]')
    expect(ring.getAttribute('class')).toContain('ui:absolute')
    expect(getByRole('button').firstElementChild).not.toBe(ring)
    expect(getByRole('button').firstElementChild.getAttribute('class')).toContain('ui:opacity-0')
  })

  it('a button that stops sending is a button again', () => {
    const onClick = vi.fn()
    const view = draw(<Button busy onClick={onClick}>Pay</Button>)
    view.rerender(<ThemeProvider theme={defaults}><Button onClick={onClick}>Pay</Button></ThemeProvider>)
    const button = view.getByRole('button')
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(button.hasAttribute('aria-disabled')).toBe(false)
    expect(view.container.querySelector('[data-slot=button-spinner]')).toBeNull()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Button: a link and a main action', () => {
  it('renders as a link with its name and keeps the button\'s look', () => {
    const { getByRole } = draw(<Button render={<a href='/orders' />} nativeButton={false} appearance='outline'>My orders</Button>)
    const link = getByRole('link', { name: 'My orders' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/orders')
    expect(link.getAttribute('class')).toContain('ui:no-underline')
    expect(vars(link)).toEqual(componentVars(defaults, 'button', { size: 'md', color: 'primary', appearance: 'outline' }))
  })

  it('a link text color beats the app\'s global link color (important)', () => {
    const { getByRole } = draw(<Button render={<a href='/x' />} nativeButton={false}>x</Button>)
    expect(getByRole('link').getAttribute('class')).toContain('ui:text-(--ui-button-color)!')
  })

  it('cta is full width when the theme says so; the phone\'s value over the screen\'s', () => {
    const full = withCta(true)
    expect(classOf(<Button cta>x</Button>, full)).toContain('ui:w-full')
    expect(classOf(<Button cta>x</Button>, full)).not.toContain('ui:max-w-none')
    expect(classOf(<Button cta>x</Button>, defaults)).not.toContain('ui:w-full')
    // a submit button is a main action, unless it says it is not
    expect(classOf(<Button type='submit'>x</Button>, full)).toContain('ui:w-full')
    expect(classOf(<Button type='submit' cta={false}>x</Button>, full)).not.toContain('ui:w-full')
    expect(classOf(<Button>x</Button>, full)).not.toContain('ui:w-full')
    const phoneOnly = withCta(false, true)
    expect(classOf(<Button cta>x</Button>, phoneOnly)).not.toContain('ui:w-full')
    expect(classOf(<Button cta>x</Button>, { ...phoneOnly, platform: 'mobile_web' })).toContain('ui:w-full')
    // never the icon shape
    expect(classOf(<Button cta shape='icon' aria-label='Add'><Icon name='plus' /></Button>, full)).not.toContain('ui:w-full')
  })
})

// A favorite look the preview's themes do not have: a shadow, a background, an icon bigger than the box's room
const loud = buildAppTheme(null, { version: 2, values: { components: { favorite: { base: { color: '#112233', icon_size: 28, size: 'lg', background: '#ffeecc', shadow: { x: 0, y: 3, blur: 9, spread: 0, color: '#000000', opacity: 0.3, elevation: 3 } } } } } })

describe('Button: the favorite toggle', () => {
  const heart = (props, theme = defaults) => draw(<Button favorite aria-label='Favorite' aria-pressed='false' {...props}><Icon name='heartOutline' /></Button>, theme).getByRole('button')

  it('without the new props it is the button it was: the same classes and variables, nothing of the favorite', () => {
    const plain = classOf(<Button>x</Button>)
    expect(classOf(<Button favorite={false} bleed fullWidth={false} align='center'>x</Button>)).toBe(plain)
    expect(plain).toBe(buttonVariants({ shape: 'text', loading: false }))
    const { getByRole } = draw(<Button favorite={false} bleed align='center'>x</Button>)
    expect(vars(getByRole('button'))).toEqual(componentVars(defaults, 'button', { size: 'md', color: 'primary', appearance: 'solid' }))
    expect(plain).not.toMatch(/favorite|ui:z-1|ui:justify-start|ui:text-start/)
  })

  it('is a neutral ghost icon button of the favorite\'s size, whatever else the caller says', () => {
    const button = heart({ color: 'primary', appearance: 'solid', size: 'sm', shape: 'text' }, loud)
    expect(vars(button)).toEqual({
      ...componentVars(loud, 'button', { size: 'lg', shape: 'icon', color: 'neutral', appearance: 'ghost' }),
      ...componentVars(loud, 'favorite')
    })
    expect(button.getAttribute('class')).toContain('ui:w-(--ui-button-height)')
    expect(button.getAttribute('class')).not.toContain('ui:px-(--ui-button-padding-x)')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('writes the favorite\'s own values with their units (the heart\'s size, color, shadow, background)', () => {
    const button = heart({}, loud)
    expect(button.style.getPropertyValue('--ui-favorite-color')).toBe('#112233')
    expect(button.style.getPropertyValue('--ui-favorite-icon-size')).toBe('28px')
    expect(button.style.getPropertyValue('--ui-favorite-background')).toBe('#ffeecc')
    expect(button.style.getPropertyValue('--ui-favorite-shadow')).toBe(componentVars(loud, 'favorite')['--ui-favorite-shadow'])
    expect(button.style.getPropertyValue('--ui-favorite-shadow')).not.toBe('none')
    cleanup()
    expect(heart({}).style.getPropertyValue('--ui-favorite-shadow')).toBe('none')
  })

  it('the heart is the favorite\'s color and size in every state, the shadow the favorite\'s in every state', () => {
    const classes = classOf(<Button favorite aria-label='Favorite'><Icon name='heartOutline' /></Button>)
    expect(classes).toContain('ui:[&_svg]:size-(--ui-favorite-icon-size)')
    expect(classes).not.toContain('ui:[&_svg]:size-(--ui-button-icon-size)')
    expect(classes).toContain('ui:[&_svg]:text-(color:--ui-favorite-color)')
    ;['ui:[box-shadow:var(--ui-favorite-shadow)]', 'ui:not-data-disabled:hover:[box-shadow:var(--ui-favorite-shadow)]', 'ui:not-data-disabled:active:[box-shadow:var(--ui-favorite-shadow)]', 'ui:data-disabled:[box-shadow:var(--ui-favorite-shadow)]'].forEach((name) => {
      expect(classes).toContain(name)
    })
    expect(classes).not.toContain('var(--ui-button-shadow)')
    expect(classes).not.toContain('var(--ui-button-hover-shadow')
    expect(classes).not.toContain('var(--ui-button-disabled-shadow')
    // it sits over a card's stretched link, and keeps the 44px touch target
    expect(classes).toContain('ui:z-1')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-w-[44px]')
  })

  it('a transparent background leaves the ghost\'s own; one of the favorite\'s paints in every state', () => {
    const transparent = classOf(<Button favorite aria-label='Favorite'>x</Button>)
    expect(transparent).toContain('var(--ui-button-hover-background')
    expect(transparent).not.toContain('--ui-favorite-background')
    const painted = classOf(<Button favorite aria-label='Favorite'>x</Button>, loud)
    expect(painted).toContain('ui:bg-(--ui-favorite-background)')
    expect(painted).toContain('ui:not-data-disabled:hover:bg-[color:var(--ui-favorite-background)]')
    expect(painted).toContain('ui:not-data-disabled:active:bg-[color:var(--ui-favorite-background)]')
    expect(painted).toContain('ui:data-disabled:bg-[color:var(--ui-favorite-background)]')
    expect(painted).not.toContain('var(--ui-button-hover-background')
    expect(painted).not.toContain('ui:bg-(--ui-button-background)')
  })

  it('bleed reaches out above and below by half of what the box has beyond the icon, never sideways, and only with favorite', () => {
    const classes = classOf(<Button favorite bleed aria-label='Favorite'>x</Button>)
    expect(classes).toContain('ui:my-[calc(-1_*_max(0px,(var(--ui-button-height)_-_var(--ui-favorite-icon-size))_/_2))]')
    expect(classes).not.toMatch(/ui:m[xlrse]-\[/)
    expect(classOf(<Button favorite aria-label='Favorite'>x</Button>)).not.toContain('ui:my-[')
    expect(classOf(<Button bleed>x</Button>)).not.toContain('ui:my-[')
  })

  it('below the phone cut the height it bleeds by is the phone\'s', () => {
    const phone = heart({}, { ...cafe, platform: 'mobile_web' })
    expect(phone.style.getPropertyValue('--ui-button-height')).toBe('48px')
    cleanup()
    expect(heart({}, cafe).style.getPropertyValue('--ui-button-height')).toBe('52px')
  })

  it('reads the theme in scope: a group\'s button box (the heart\'s own look is the favorite\'s)', () => {
    const { getByTestId } = draw(<ComponentScope group='header'><Button favorite aria-label='F' data-testid='in'>x</Button></ComponentScope>, grill)
    expect(getByTestId('in').style.getPropertyValue('--ui-button-height')).toBe('34px')
    expect(getByTestId('in').style.getPropertyValue('--ui-favorite-color')).toBe(componentVars(grill, 'favorite')['--ui-favorite-color'])
  })

  it('warns in development without a name, as an icon button does', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    draw(<Button favorite aria-pressed='true'><Icon name='heartFilled' /></Button>)
    expect(warn).toHaveBeenCalledWith('Button: an icon button needs an aria-label')
    warn.mockClear()
    draw(<Button favorite aria-label='Favorite' aria-pressed='true'><Icon name='heartFilled' /></Button>)
    expect(warn).not.toHaveBeenCalled()
  })

  it('the new props never reach the element', () => {
    const button = heart({ bleed: true, fullWidth: true, align: 'start' })
    ;['favorite', 'bleed', 'fullwidth', 'align'].forEach((name) => expect(button.hasAttribute(name)).toBe(false))
  })
})

describe('Button: focusInset', () => {
  it('draws the keyboard ring inside the edge, for a button that fills a box that clips (the coupon card); not by default', () => {
    expect(classOf(<Button focusInset>x</Button>)).toContain('ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!')
    expect(classOf(<Button>x</Button>)).not.toContain('outline-offset')
    const { getByRole } = draw(<Button focusInset>x</Button>)
    expect(getByRole('button').hasAttribute('focusinset')).toBe(false)
  })
})

describe('Button: full width and the start alignment', () => {
  it('fullWidth takes the container\'s width over the max width', () => {
    const full = classOf(<Button fullWidth>x</Button>)
    expect(full).toContain('ui:w-full')
    // this sheet paints \`ui:max-w-none\` as \`max-width: 0\` (it maps \`none\` to the spacing scale): the cap is BASE's max-w-full
    expect(full).toContain('ui:max-w-full')
    expect(full).not.toContain('ui:max-w-none')
    expect(classOf(<Button>x</Button>)).not.toContain('ui:w-full')
  })

  it('an icon button, the favorite too, keeps its square with fullWidth', () => {
    expect(classOf(<Button fullWidth shape='icon' aria-label='Add'><Icon name='plus' /></Button>)).not.toContain('ui:w-full')
    expect(classOf(<Button fullWidth favorite aria-label='x'>x</Button>)).not.toContain('ui:w-full')
  })

  it('align start puts the content at the start in the button and in its inner box, which takes the room so the label can end in …', () => {
    const { getByRole } = draw(<Button fullWidth align='start'><Icon name='bag' /> A very long address</Button>)
    const button = getByRole('button')
    expect(button.getAttribute('class')).toContain('ui:justify-start')
    expect(button.getAttribute('class')).toContain('ui:text-start')
    expect(button.getAttribute('class')).not.toContain('ui:justify-center')
    expect(button.getAttribute('class')).not.toContain('ui:text-center')
    expect(button.firstElementChild.getAttribute('class')).toContain('ui:justify-start')
    expect(button.firstElementChild.getAttribute('class')).toContain('ui:flex-1')
    expect(button.firstElementChild.getAttribute('class')).not.toContain('ui:justify-center')
    expect(button.querySelector('.ui\\:truncate').textContent).toBe(' A very long address')
  })

  it('the default is centered, as it was', () => {
    const { getByRole } = draw(<Button align='center'>x</Button>)
    expect(getByRole('button').getAttribute('class')).toContain('ui:justify-center')
    expect(getByRole('button').firstElementChild.getAttribute('class')).toContain('ui:justify-center')
    expect(getByRole('button').firstElementChild.getAttribute('class')).not.toContain('ui:flex-1')
  })

  // a social icon size the fixtures do not distinguish (theirs is the lg icon, 24 px), so a piece
  // that ignored the key would pass them
  const bigSocial = (phone) => buildAppTheme(null, { version: 2, values: { components: { auth_form: { base: { social_icon_size: 31 } } }, ...(phone && { platforms: { mobile_web: { components: { auth_form: { base: { social_icon_size: phone } } } } } }) } })

  it('socialIcon: a slot before the label of auth_form.base.social_icon_size, written on the button', () => {
    const { getByRole } = draw(<Button socialIcon={<Icon name='google' />}>Google</Button>, bigSocial())
    const button = getByRole('button', { name: 'Google' })
    expect(button.style.getPropertyValue('--ui-auth-form-social-icon-size')).toBe('31px')
    const slot = button.querySelector('[data-slot=button-social-icon]')
    expect(slot.getAttribute('class')).toContain('ui:size-(--ui-auth-form-social-icon-size)')
    expect(slot.getAttribute('class')).toContain('ui:[&_svg]:size-(--ui-auth-form-social-icon-size)!')
    expect(slot.querySelector('svg')).not.toBeNull()
    // in the label's row (the button's icon_gap apart), before the label
    expect(slot.parentElement.getAttribute('class')).toContain('ui:gap-(--ui-button-icon-gap)')
    expect(slot.nextElementSibling.textContent).toBe('Google')
  })

  it('socialIcon follows the theme in scope: the default one, the phone\'s', () => {
    const { getByRole, unmount } = draw(<Button socialIcon={<Icon name='apple' />}>Apple</Button>)
    expect(getByRole('button').style.getPropertyValue('--ui-auth-form-social-icon-size')).toBe(componentVars(defaults, 'auth_form')['--ui-auth-form-social-icon-size'])
    unmount()
    const phone = { ...bigSocial(18), platform: 'mobile_web' }
    expect(draw(<Button socialIcon={<Icon name='apple' />}>Apple</Button>, phone).getByRole('button').style.getPropertyValue('--ui-auth-form-social-icon-size')).toBe('18px')
  })

  it('socialIcon with busy: the spinner takes the slot, the label stays, no second spinner', () => {
    const { getByRole } = draw(<Button busy socialIcon={<Icon name='google' />}>Google</Button>)
    const button = getByRole('button', { name: 'Google' })
    const spinners = button.querySelectorAll('[data-slot=button-spinner]')
    expect(spinners).toHaveLength(1)
    expect(spinners[0].parentElement.getAttribute('data-slot')).toBe('button-social-icon')
    expect(button.querySelector('[data-slot=button-social-icon] svg')).toBeNull()
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('iconEnd: the icon at the end edge, the padding of the theme from it, the label centered with room for it', () => {
    const { getByRole } = draw(<Button fullWidth iconEnd={<Icon name='arrowRight' />}>Continue</Button>, cafe)
    const button = getByRole('button', { name: 'Continue' })
    const end = button.querySelector('[data-slot=button-icon-end]')
    expect(end.getAttribute('class')).toContain('ui:absolute')
    expect(end.getAttribute('class')).toContain('ui:end-(--ui-button-padding-x)')
    expect(end.getAttribute('class')).toContain('ui:top-1/2')
    expect(end.querySelector('svg')).not.toBeNull()
    expect(button.getAttribute('class')).toContain('ui:justify-center')
    expect(button.getAttribute('class')).toContain('ui:px-[calc(var(--ui-button-padding-x)_+_var(--ui-button-icon-size)_+_var(--ui-button-icon-gap))]')
    expect(button.getAttribute('class')).not.toContain('ui:px-(--ui-button-padding-x)')
    expect(vars(button)['--ui-button-padding-x']).toBe(componentVars(cafe, 'button', { size: 'md' })['--ui-button-padding-x'])
  })

  it('without socialIcon or iconEnd nothing changes: no slot, no variable, the theme\'s padding', () => {
    const { getByRole } = draw(<Button>x</Button>, bigSocial())
    const button = getByRole('button')
    expect(button.querySelector('[data-slot=button-social-icon], [data-slot=button-icon-end]')).toBeNull()
    expect(button.style.getPropertyValue('--ui-auth-form-social-icon-size')).toBe('')
    expect(button.getAttribute('class')).toContain('ui:px-(--ui-button-padding-x)')
  })

  it('iconEnd with align start keeps the theme\'s padding at the start and the room at the end; loading hides it; an icon button has none', () => {
    const start = classOf(<Button fullWidth align='start' iconEnd={<Icon name='arrowRight' />}>x</Button>)
    expect(start).toContain('ui:px-(--ui-button-padding-x)')
    expect(start).toContain('ui:pe-[calc(var(--ui-button-padding-x)_+_var(--ui-button-icon-size)_+_var(--ui-button-icon-gap))]')
    expect(start).not.toContain('ui:px-[calc(')
    const loading = draw(<Button loading iconEnd={<Icon name='arrowRight' />}>x</Button>)
    expect(loading.getByRole('button').querySelector('[data-slot=button-icon-end]').getAttribute('class')).toContain('ui:opacity-0')
    loading.unmount()
    const square = draw(<Button shape='icon' aria-label='Next' iconEnd={<Icon name='arrowRight' />}><Icon name='bag' /></Button>)
    expect(square.getByRole('button').querySelector('[data-slot=button-icon-end]')).toBeNull()
  })
})

describe('R2-A-B2 sending works for every Button appearance', () => {
  it.each([
    ['text action', (props) => <Button {...props} appearance='link' />],
    ['card', CardButton]
  ])('%s shows the loading and busy indicators and blocks clicks', (_name, Component) => {
    const onClick = vi.fn()
    const { getByRole, rerender } = draw(<Component loading onClick={onClick}>Send</Component>)
    const button = getByRole('button', { name: 'Send' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('data-loading')
    expect(button.querySelector('[data-slot=button-spinner]')).not.toBeNull()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    rerender(<ThemeProvider theme={defaults}><Component busy onClick={onClick}>Send</Component></ThemeProvider>)
    expect(button).toHaveAttribute('data-busy')
    expect(button.querySelector('[data-slot=button-spinner]')).not.toBeNull()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  // a submit that nobody sees (the checkout's own button is the only action on screen)
  it.each([defaults, grill])('srOnly: a real submit button out of sight and out of the way (%#)', (theme) => {
    const onSubmit = vi.fn((event) => event.preventDefault())
    const { container, getByRole } = draw(<form onSubmit={onSubmit}><input aria-label='Name' /><Button srOnly type='submit' tabIndex={-1}>Save</Button></form>, theme)
    const button = getByRole('button', { name: 'Save', hidden: true })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('data-slot', 'button')
    // the screen-reader-only box (important: an ambient button rule must not show it) and none of the piece's paint
    expect(button).toHaveClass('ui:sr-only!', 'ui:min-h-[0]!')
    expect(button).not.toHaveClass('ui:h-(--ui-button-height)')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('')
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-slot=button-spinner]')).toBeNull()
  })

  it('srOnly: disabled while sending, and the caller\'s own attributes stay', () => {
    const { getByRole } = draw(<form><Button srOnly type='submit' disabled aria-hidden='true' tabIndex={-1}>Save</Button></form>)
    const button = getByRole('button', { hidden: true })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-hidden', 'true')
    expect(button).toHaveAttribute('tabindex', '-1')
  })

  // `inlineInfo` and a button of the row's text compose from what exists: no new prop
  it.each([defaults, grill])('an inline icon action in a row of text is the xs ghost icon button with no margin or line height of its own (%#)', (theme) => {
    const { getByRole } = draw(<Button size='xs' shape='icon' appearance='ghost' borderInset aria-label='Information'><Icon name='infoCircle' /></Button>, theme)
    const button = getByRole('button', { name: 'Information' })
    const themed = componentVars(theme, 'button', { color: 'primary', appearance: 'ghost', shape: 'icon', size: 'xs' })
    expect(button.style.getPropertyValue('--ui-button-height')).toBe(themed['--ui-button-height'])
    expect(button.className).not.toMatch(/ui:ms-|ui:leading-\(--ui-button-height\)|ui:align-middle/)
    expect(button.style.getPropertyValue('--ui-button-border')).toMatch(/solid transparent/)
  })

  // the GPS action of an address field: a glyph that says it is working, the button not answering
  it.each([defaults, grill])('an icon button that is working swaps its glyph, is disabled and says it is busy (%#)', (theme) => {
    const view = draw(<Button shape='icon' appearance='ghost' aria-label='Use my location' disabled aria-busy><Icon name='loaderCircle' /></Button>, theme)
    const button = view.getByRole('button', { name: 'Use my location' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('svg.lucide-loader-circle')).not.toBeNull()
    // dimmed as the theme says a disabled button is (its disabled colors, as the legacy icon button resolved), no extra opacity
    expect(button).toHaveClass('ui:data-disabled:bg-[color:var(--ui-button-disabled-background,var(--ui-button-background))]')
    expect(button).not.toHaveClass('ui:opacity-50')
  })


  // a stop of a slider (the distance or the time to choose): the mark of components.slider
  it.each([defaults, grill])('a slider stop is the mark of components.slider, the active one in its color and bold (%#)', (theme) => {
    const slider = componentVars(theme, 'slider')
    const view = draw(<><SliderStopButton sliderActive aria-pressed>5 km</SliderStopButton><SliderStopButton aria-pressed={false}>10 km</SliderStopButton></>, theme)
    const [off, on] = [view.getByRole('button', { name: '10 km', pressed: false }), view.getByRole('button', { name: '5 km', pressed: true })]
    ;[on, off].forEach((stop) => {
      expect(stop).toHaveAttribute('data-slot', 'button')
      expect(stop.style.getPropertyValue('--ui-slider-mark-color')).toBe(slider['--ui-slider-mark-color'])
      expect(stop.style.getPropertyValue('--ui-slider-mark-active')).toBe(slider['--ui-slider-mark-active'])
      expect(stop.style.getPropertyValue('--ui-slider-mark-size')).toBe(slider['--ui-slider-mark-size'])
      // the paint of a regular button is not here: no box, no height of the button
      expect(stop).not.toHaveClass('ui:h-(--ui-button-height)')
      expect(stop).toHaveClass('ui:text-(length:--ui-slider-mark-size)', 'ui:bg-transparent')
    })
    expect(on).toHaveClass('ui:text-(--ui-slider-mark-active)')
    expect(off).toHaveClass('ui:text-(--ui-slider-mark-color)')
    expect(on).not.toHaveClass('ui:text-(--ui-slider-mark-color)')
    expect(on).toHaveAttribute('data-selected')
    expect(off).not.toHaveAttribute('data-selected')
    // bold only when chosen, as the theme's font has it (the mark's own weight otherwise)
    const bold = /font-weight: ([^;]+);/.exec(themePartText(theme, 'slider', 'base.mark', { weight: 600 }))[1]
    expect(on.style.getPropertyValue('--ui-slider-stop-weight')).toBe(bold)
    expect(off.style.getPropertyValue('--ui-slider-stop-weight')).toBe(slider['--ui-slider-mark-weight'])
    expect(on).toHaveClass('ui:font-(weight:--ui-slider-stop-weight)')
  })

  it('a slider stop moves its color as components.slider says, never with reduced motion', () => {
    const { getByRole } = draw(<SliderStopButton>5 km</SliderStopButton>)
    expect(getByRole('button')).toHaveClass('ui:motion-safe:transition-[color]', 'ui:motion-safe:duration-(--ui-slider-motion-duration)', 'ui:motion-safe:ease-(--ui-slider-motion-easing)')
  })

  it('a slider stop answers a click and keeps the 44px touch area', () => {
    const onClick = vi.fn()
    const { getByRole } = draw(<SliderStopButton onClick={onClick}>5 km</SliderStopButton>)
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(getByRole('button')).toHaveClass('ui:pointer-coarse:after:min-h-[44px]')
  })

})
