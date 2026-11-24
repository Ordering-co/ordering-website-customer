import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeCss } from '~/utils/themeCss'
import { chipBorder } from '~/utils/themeTokens'
import { themeForWidth } from '~/utils/themeVisibility'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Chip } from '../Chip'

// the status text goes through `t()`: a translation of its own proves it is not the fallback
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (key, fallback) => ({ COMPLETED: 'Completo', REQUIRED: 'Obligatorio' })[key] ?? fallback]
}))

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const SEL = { variant: 'default' }
// a theme whose chip has its own contour, and a selected one of another width
const withChip = (patch) => buildAppTheme(null, { version: 2, values: { components: { chip: patch } } })

describe('Chip: a button', () => {
  it('is a native button that does not submit, with its slot', () => {
    const { getByRole } = draw(<Chip>Pizza</Chip>)
    const chip = getByRole('button', { name: 'Pizza' })
    expect(chip.tagName).toBe('BUTTON')
    expect(chip.getAttribute('type')).toBe('button')
    expect(chip.getAttribute('data-slot')).toBe('chip')
  })

  it('says it is pressed only when it has a selection: a toggle has aria-pressed, an action has none', () => {
    const { getByRole, rerender } = draw(<Chip selected>Pizza</Chip>)
    expect(getByRole('button').getAttribute('aria-pressed')).toBe('true')
    expect(getByRole('button').hasAttribute('data-selected')).toBe(true)
    rerender(<ThemeProvider theme={defaults}><Chip selected={false}>Pizza</Chip></ThemeProvider>)
    expect(getByRole('button').getAttribute('aria-pressed')).toBe('false')
    expect(getByRole('button').hasAttribute('data-selected')).toBe(false)
    rerender(<ThemeProvider theme={defaults}><Chip>Pizza</Chip></ThemeProvider>)
    expect(getByRole('button').hasAttribute('aria-pressed')).toBe(false)
  })

  it('answers a click, forwards the ref and the native props', () => {
    const ref = React.createRef()
    const onClick = vi.fn()
    const { getByRole } = draw(<Chip ref={ref} name='price' title='Cheap' onClick={onClick}>$</Chip>)
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(ref.current).toBe(getByRole('button'))
    expect(ref.current.getAttribute('name')).toBe('price')
    expect(ref.current.getAttribute('title')).toBe('Cheap')
  })

  it('is on the tab order, and a chip that is not a native button answers Enter and Space', () => {
    // (Base UI clicks with a PointerEvent, which jsdom lacks)
    vi.stubGlobal('PointerEvent', MouseEvent)
    const onClick = vi.fn()
    const { getByRole } = draw(<Chip render={<span />} nativeButton={false} onClick={onClick}>Pizza</Chip>)
    const chip = getByRole('button', { name: 'Pizza' })
    expect(chip.tabIndex).toBe(0)
    fireEvent.keyDown(chip, { key: 'Enter' })
    fireEvent.keyUp(chip, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })

  it('disabled answers no click, says so and is out of the pointer\'s hover', () => {
    const onClick = vi.fn()
    const { getByRole } = draw(<Chip disabled onClick={onClick}>Pizza</Chip>)
    const chip = getByRole('button')
    fireEvent.click(chip)
    expect(onClick).not.toHaveBeenCalled()
    expect(chip.hasAttribute('disabled')).toBe(true)
    expect(chip.hasAttribute('data-disabled')).toBe(true)
    expect(chip.getAttribute('class')).toContain('ui:data-disabled:opacity-(--ot-opacity-disabled)')
    expect(chip.getAttribute('class')).toContain('ui:not-data-disabled:not-data-selected:hover:bg-')
  })

  it('a label that does not fit is a text node that can end in an ellipsis', () => {
    const { getByRole } = draw(<Chip>Gluten free</Chip>)
    expect(getByRole('button').querySelector('.ui\\:truncate').textContent).toBe('Gluten free')
  })
})

describe('Chip: a label', () => {
  it('is a span with no role, no tab stop, no pressed and no hover or touch target', () => {
    const { getByText, queryByRole } = draw(<Chip interactive={false} selected>Open now</Chip>)
    const chip = getByText('Open now').closest('[data-slot=chip]')
    expect(chip.tagName).toBe('SPAN')
    expect(queryByRole('button')).toBeNull()
    expect(chip.hasAttribute('tabindex')).toBe(false)
    expect(chip.hasAttribute('aria-pressed')).toBe(false)
    // it is still painted picked
    expect(chip.hasAttribute('data-selected')).toBe(true)
    const classes = chip.getAttribute('class')
    expect(classes).not.toContain('hover:')
    expect(classes).not.toContain('cursor-pointer')
    expect(classes).not.toContain('after:')
  })
})

describe('Chip: the theme', () => {
  it.each(['compensated-contour', 'content'])('uses the painted border in the %s padding on mobile', variant => {
    const border = width => ({ width, style: 'solid', color: '#223322' })
    const selected = width => ({ variants: { default: { states: { selected: { border: border(width) } } } } })
    const theme = buildAppTheme(null, {
      version: 2,
      values: {
        tokens: { border: { thin: 1 } },
        components: { chip: { base: { border: border(2) }, sizes: { sm: { padding_x: 12 } }, ...selected(4) } },
        platforms: { mobile_web: { components: { chip: selected(6) } } }
      }
    })
    const { getByRole } = draw(
      <Chip variant={variant} size='sm' selected>kg</Chip>,
      themeForWidth(theme, 390)
    )
    expect(vars(getByRole('button'))).toMatchObject({
      '--ui-chip-selected-border': '6px solid #223322',
      '--ui-chip-content-padding': 'calc(12px - 5px)'
    })
  })

  it.each([['defaults', defaults], ['grill', grill]])('compensates the sm chip for the themed contour in %s', (_, theme) => {
    const { getByRole } = draw(
      <>
        <Chip variant='compensated-contour' size='sm' selected={false}>pcs</Chip>
        <Chip variant='compensated-contour' size='sm' selected>kg</Chip>
      </>,
      theme
    )
    const thin = theme.values.tokens.border.thin
    const side = getThemeCss(theme, 'chip').sizes.sm.padding_x
    for (const [name, selected] of [['pcs', false], ['kg', true]]) {
      const chip = getByRole('button', { name, pressed: selected })
      const width = chipBorder(theme, selected)?.width ?? thin
      expect(vars(chip)['--ui-chip-content-padding']).toBe(`calc(${side} - ${width - thin}px)`)
      expect(chip.className).toContain('ui:px-(--ui-chip-content-padding)')
      expect(chip.className).toContain('ui:[@media(any-pointer:coarse)]:after:min-h-[44px]')
      expect(chip.className).toContain('ui:[@media(any-pointer:coarse)]:after:min-w-[44px]')
    }
  })

  it('writes components.chip on its own element: the default is md of the default variant', () => {
    const { getByRole } = draw(<Chip>Pizza</Chip>)
    expect(vars(getByRole('button'))).toEqual(componentVars(defaults, 'chip', { size: 'md', ...SEL }))
    const view = getThemeCss(defaults, 'chip')
    expect(vars(getByRole('button'))).toMatchObject({
      '--ui-chip-height': view.sizes.md.height,
      '--ui-chip-padding-x': view.sizes.md.padding_x,
      '--ui-chip-gap': view.base.gap,
      '--ui-chip-radius': view.base.radius,
      '--ui-chip-background': view.base.background,
      '--ui-chip-color': view.base.color,
      '--ui-chip-pressed-background': view.variants.default.states.pressed.background,
      '--ui-chip-selected-background': view.variants.default.states.selected.background,
      '--ui-chip-selected-color': view.variants.default.states.selected.color
    })
  })

  it.each([['grill', grill], ['cafe', cafe]])('every size is the theme\'s in %s', (name, theme) => {
    ;['sm', 'md', 'lg'].forEach((size) => {
      const { getByRole, unmount } = draw(<Chip size={size}>x</Chip>, theme)
      expect(vars(getByRole('button'))).toEqual(componentVars(theme, 'chip', { size, ...SEL }))
      expect(vars(getByRole('button'))['--ui-chip-height']).toBe(getThemeCss(theme, 'chip').sizes[size].height)
      unmount()
    })
  })

  it('a theme that moves the chip moves its variables', () => {
    const store = draw(<Chip>x</Chip>, cafe)
    const own = vars(store.getByRole('button'))
    store.unmount()
    expect(own['--ui-chip-selected-background']).toBe(getThemeCss(cafe, 'chip').variants.default.states.selected.background)
    expect(own['--ui-chip-selected-background']).not.toBe(vars(draw(<Chip>x</Chip>, defaults).getByRole('button'))['--ui-chip-selected-background'])
  })

  it('reads the theme of its context: a nested provider\'s over the outer one, a group with no chip of its own keeps the global look', () => {
    const { getByTestId } = draw(
      <>
        <Chip data-testid='global'>x</Chip>
        <ComponentScope group='header'><Chip data-testid='scoped'>x</Chip></ComponentScope>
        <ThemeProvider theme={cafe}><Chip data-testid='nested'>x</Chip></ThemeProvider>
      </>,
      grill
    )
    // (no group of the schema scopes the chip today: `header` scopes button and tabs)
    expect(vars(getByTestId('scoped'))).toEqual(vars(getByTestId('global')))
    expect(vars(getByTestId('global'))).toEqual(componentVars(grill, 'chip', { size: 'md', ...SEL }))
    expect(vars(getByTestId('nested'))).toEqual(componentVars(cafe, 'chip', { size: 'md', ...SEL }))
    expect(vars(getByTestId('nested'))['--ui-chip-selected-background']).not.toBe(vars(getByTestId('global'))['--ui-chip-selected-background'])
  })

  it('no value is written in its classes: only variables of the theme, with the touch target and reduced motion as the floor', () => {
    const { getByRole } = draw(<Chip>x</Chip>)
    const classes = getByRole('button').getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    ;['ui:h-(--ui-chip-height)', 'ui:px-(--ui-chip-padding-x)', 'ui:gap-(--ui-chip-gap)', 'ui:rounded-(--ui-chip-radius)', 'ui:bg-(--ui-chip-background)',
      'ui:text-(--ui-chip-color)', 'ui:motion-safe:duration-(--ui-chip-motion-duration)', 'ui:motion-safe:ease-(--ui-chip-motion-easing)'
    ].forEach((name) => expect(classes).toContain(name))
    // a picked chip falls back to the resting look where the theme says nothing
    expect(classes).toContain('var(--ui-chip-selected-background,var(--ui-chip-background))')
    expect(classes).toContain('var(--ui-chip-pressed-background,var(--ui-chip-background))')
    // 44 px of touch on a phone or with a touch screen, around the chip and not in its box
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-w-[44px]')
    expect(classes).not.toMatch(/ui:sm:/)
  })

  it('without a contour its border is a thin line in its own color, that follows the hover; with one it is the theme\'s', () => {
    const plain = draw(<Chip>x</Chip>, defaults)
    expect(vars(plain.getByRole('button'))['--ui-chip-border']).toBe('none')
    expect(plain.getByRole('button').getAttribute('class')).toContain('ui:border-(length:--ot-border-fixed-thin)')
    expect(plain.getByRole('button').getAttribute('class')).toContain('hover:[border-color:var(--ui-chip-pressed-background')
    expect(plain.getByRole('button').getAttribute('class')).not.toContain('ui:[border:var(--ui-chip-border)]')
    plain.unmount()
    const outlined = draw(<Chip>x</Chip>, cafe)
    expect(vars(outlined.getByRole('button'))['--ui-chip-border']).toBe(getThemeCss(cafe, 'chip').base.border)
    expect(outlined.getByRole('button').getAttribute('class')).toContain('ui:[border:var(--ui-chip-border)]')
    expect(outlined.getByRole('button').getAttribute('class')).not.toContain('hover:[border-color')
  })

  it('a picked chip takes the selected border of the theme, or else its selected background as the border color', () => {
    const own = withChip({ variants: { default: { states: { selected: { border: { width: 2, color: '#112233', style: 'solid' } } } } } })
    const withOwn = draw(<Chip selected>x</Chip>, own)
    expect(vars(withOwn.getByRole('button'))['--ui-chip-selected-border']).toBe('2px solid #112233')
    expect(withOwn.getByRole('button').getAttribute('class')).toContain('ui:data-selected:[border:var(--ui-chip-selected-border)]')
    withOwn.unmount()
    const none = draw(<Chip selected>x</Chip>, defaults)
    expect('--ui-chip-selected-border' in vars(none.getByRole('button'))).toBe(false)
    expect(none.getByRole('button').getAttribute('class')).toContain('ui:data-selected:[border-color:var(--ui-chip-selected-background')
  })

  it('the caller\'s class wins over the piece\'s, and its style over the variables', () => {
    const { getByRole } = draw(<Chip className='ui:rounded-none' style={{ '--ui-chip-height': '10px' }}>x</Chip>)
    expect(getByRole('button').getAttribute('class')).toContain('ui:rounded-none')
    expect(getByRole('button').getAttribute('class')).not.toContain('ui:rounded-(--ui-chip-radius)')
    expect(getByRole('button').style.getPropertyValue('--ui-chip-height')).toBe('10px')
  })
})

describe('Chip: status', () => {
  it('a chip with its choice made says it after its label, in words and with a glyph', () => {
    const { getByRole } = draw(<Chip status='complete'>Salsa</Chip>)
    const chip = getByRole('button', { name: /^Salsa\s*,\s*Completo$/ })
    expect(chip.getAttribute('data-status')).toBe('complete')
    const glyph = chip.querySelector('[data-slot=chip-status]')
    expect(glyph.tagName.toLowerCase()).toBe('svg')
    // the glyph is decoration: the words say it
    expect(glyph.getAttribute('aria-hidden')).toBe('true')
    expect(glyph.getAttribute('class')).toContain('ui:text-success-text')
  })

  it('a required group still pending says it is required, in the danger color', () => {
    const { getByRole } = draw(<Chip status='missing'>Bebida</Chip>)
    const chip = getByRole('button', { name: /^Bebida\s*,\s*Obligatorio$/ })
    expect(chip.getAttribute('data-status')).toBe('missing')
    expect(chip.querySelector('[data-slot=chip-status]').getAttribute('class')).toContain('ui:text-danger-text')
  })

  it('the glyph is of the theme\'s icon size, not a length of its own', () => {
    const { getByRole } = draw(<Chip status='complete'>Salsa</Chip>, grill)
    expect(getByRole('button').querySelector('svg').getAttribute('width')).toBe(grill.css.tokens.icon.sm)
  })

  it('a picked chip draws the glyph in its own color: a status color would not read on the selected fill', () => {
    const { getByRole } = draw(<Chip status='missing' selected>Bebida</Chip>)
    const glyph = getByRole('button').querySelector('[data-slot=chip-status]')
    expect(glyph.getAttribute('class') ?? '').not.toContain('text-danger-text')
    expect(getByRole('button').getAttribute('aria-pressed')).toBe('true')
  })

  it('a chip with no status has no glyph and no extra text; a label can have a status too', () => {
    const { getByRole, unmount } = draw(<Chip>Salsa</Chip>)
    expect(getByRole('button').querySelector('svg')).toBeNull()
    expect(getByRole('button')).toHaveAccessibleName('Salsa')
    unmount()
    const label = draw(<Chip interactive={false} status='complete'>Salsa</Chip>)
    expect(label.getByText('Salsa').closest('[data-slot=chip]').querySelector('svg')).toBeTruthy()
    expect(label.getByText('Completo', { exact: false })).toBeTruthy()
  })

  it('serves a row that scrolls and a column of steps: it fixes no layout, so a container only places it', () => {
    const { getAllByRole } = draw(
      <div role='group'>
        <Chip status='complete'>Salsa</Chip>
        <Chip status='missing' selected>Bebida</Chip>
      </div>
    )
    getAllByRole('button').forEach((chip) => {
      const classes = chip.getAttribute('class')
      // it does not shrink in a scrolling row and can be stretched by a column; no width or margin of its own
      expect(classes).toContain('ui:shrink-0')
      expect(classes).not.toMatch(/ui:(w|mx|ms|me|ml|mr)-/)
    })
  })
})

describe('Chip: content-fit and edge image', () => {
  it.each([defaults, grill])('keeps the chip theme and adds the feedback suffix inset', (theme) => {
    const { getByRole } = draw(<Chip variant='content' selected suffix={<svg />}>Helpful</Chip>, theme)
    const chip = getByRole('button', { name: 'Helpful' })
    expect(vars(chip)['--ui-chip-height']).toBe(getThemeCss(theme, 'chip').sizes.md.height)
    expect(chip).toHaveClass('ui:min-w-fit')
    expect(chip.querySelector('[data-slot=chip-suffix]')).toHaveClass('ui:ms-xs')
  })

  it.each([defaults, grill])('sizes the inset image from business_types and the chip size', (theme) => {
    const { getByRole } = draw(<Chip variant='content' size='lg' edgeImage={<span>G</span>}>Groceries</Chip>, theme)
    const chip = getByRole('button', { name: 'Groceries' })
    const height = theme.values.components.chip.sizes.lg.height
    const wanted = theme.values.components.business_types.base.pill_image_size
    const side = Math.max(Math.min(wanted, height - 2 * theme.values.tokens.space.xs), 0)
    expect(vars(chip)['--ui-chip-image-size']).toBe(`${side}px`)
    expect(vars(chip)['--ui-chip-image-padding-start']).toBe(`${Math.max((height - side) / 2 - theme.values.tokens.border.thin, 0)}px`)
    expect(chip.querySelector('[data-slot=chip-edge-image]')).toHaveAttribute('aria-hidden', 'true')
  })
})
