import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { themeScrollbar } from '~/utils/themeTokens'
import { isInsideOverlay } from '~/utils/overlay'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { capsuleIconSize, capsuleText } from '~ui/src/components/Header/styles'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { RadioGroup, Radio } from '../Checkbox'
import { Select, SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from '../Select'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
// the sheets load on their first opening (lazyOverlay): the real loadable. The popper surface
// (`presentation`) is a loadable of Select.jsx, out of the first load: here it is ready at the first render.
const surface = vi.hoisted(() => ({ Component: null }))
vi.mock('@loadable/component', async (importOriginal) => {
  const actual = await importOriginal()
  const Surface = (props) => <surface.Component {...props} />
  return { ...actual, default: (loader, ...rest) => /SelectSurface/.test(String(loader)) ? Surface : actual.default(loader, ...rest) }
})
beforeAll(async () => { surface.Component = (await import('../SelectSurface')).SelectSurface })
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: window.innerWidth }) }))

const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const OPTIONS = [
  { value: 'en', content: 'English', showOnSelected: 'EN' },
  { value: 'es', content: 'Español' },
  { value: 'fr', content: 'Français', disabled: true }
]
const FIELD = { variant: 'default', radius: 'md' }
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el, prefix = '--') => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith(prefix)).map((name) => [name, el.style.getPropertyValue(name)]))
const trigger = () => screen.getByRole('combobox')
const portalOf = (el) => el.closest('[data-base-ui-portal]')
// (jsdom has no PointerEvent: a mouse event that carries the pointer's fields)
class FakePointerEvent extends MouseEvent {
  constructor (type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType
  }
}
beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent))
afterEach(() => vi.unstubAllGlobals())
// opens it from the keyboard; the focus then goes to the list's option
const open = async () => {
  trigger().focus()
  fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
  const list = await screen.findByRole('listbox')
  await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
  return list
}
const press = (key) => fireEvent.keyDown(document.activeElement, { key })
const gone = () => waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

describe('Select: the trigger is the theme\'s field', () => {
  it.each([['defaults', defaults], ['grill', grill], ['cafe', cafe]])('%s: it writes components.input on itself and shows the placeholder', (_, theme) => {
    draw(<Select options={OPTIONS} placeholder='Language' aria-label='Language' />, theme)
    const button = trigger()
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('data-slot')).toBe('select-trigger')
    expect(button).toHaveAccessibleName('Language')
    expect(vars(button)).toMatchObject(componentVars(theme, 'input', FIELD))
    expect(button.textContent).toBe('Language')
  })

  it('its classes are Input\'s over a button that shows a value: no value written, the theme\'s states, the floors', () => {
    draw(<Select options={OPTIONS} />)
    const classes = trigger().getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    expect(classes).toContain('ui:h-(--ui-input-height)')
    expect(classes).toContain('ui:inline-flex')
    expect(classes).not.toContain('ui:block')
    expect(classes).toContain('var(--ui-input-error-border,var(--ui-input-border))')
    expect(classes).toContain('ui:max-mobile:text-[length:max(var(--ui-input-text-size),var(--ui-field-min-text))]')
    // open, it is the field with the focus (over a hover)
    expect(classes).toContain('ui:data-popup-open:not-aria-invalid:[border:var(--ui-input-focus-border,var(--ui-input-border))]!')
    // a button is always :read-only: the pointer is the piece's
    expect(classes).toContain('ui:read-only:cursor-pointer')
    expect(classes).not.toContain('ui:read-only:cursor-default')
    // 44 px of touch target on a phone and with a coarse pointer, around the trigger
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })

  it('a line under the field is a bottom border, open too', () => {
    const theme = buildAppTheme(null, { version: 2, values: { components: { input: { base: { border_sides: 'bottom', border: { width: 1, color: '#123456', style: 'solid' } } } } } })
    draw(<Select options={OPTIONS} />, theme)
    expect(trigger().getAttribute('class')).toContain('ui:[border-bottom:var(--ui-input-border)]')
    expect(trigger().getAttribute('class')).toContain('ui:data-popup-open:not-aria-invalid:[border-bottom:')
  })

  it('inside a group it is the group\'s field (the context crosses the portal)', async () => {
    const scoped = buildAppTheme(null, { version: 2, values: { components: { auth_form: { scope: { input: { base: { padding_x: 3 } } } } } } })
    render(<ThemeProvider theme={scoped}><ComponentScope group='auth_form'><Select options={OPTIONS} /></ComponentScope></ThemeProvider>)
    expect(vars(trigger())).toMatchObject(componentVars(scopedTheme(scoped, 'auth_form'), 'input', FIELD))
    expect(trigger().style.getPropertyValue('--ui-input-padding-x')).toBe('3px')
    expect(portalOf(await open()).parentElement).toBe(document.body)
  })

  it('invalid is aria-invalid; disabled is native, hides the arrow and does not open', async () => {
    const { rerender } = draw(<Select options={OPTIONS} invalid aria-describedby='why' />)
    expect(trigger().getAttribute('aria-invalid')).toBe('true')
    expect(trigger().getAttribute('aria-describedby')).toBe('why')
    rerender(<ThemeProvider theme={defaults}><Select options={OPTIONS} disabled /></ThemeProvider>)
    expect(trigger().hasAttribute('disabled') || trigger().getAttribute('aria-disabled') === 'true').toBe(true)
    expect(trigger().querySelector('[data-slot=select-icon]').getAttribute('class')).toContain('ui:in-disabled:hidden')
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    fireEvent.click(trigger())
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows what the chosen option says on selected, or its content', () => {
    draw(<><Select options={OPTIONS} defaultValue='en' aria-label='a' /><Select options={OPTIONS} defaultValue='es' aria-label='b' /></>)
    const [a, b] = screen.getAllByRole('combobox')
    expect(a.textContent).toBe('EN')
    expect(b.textContent).toBe('Español')
  })
})

describe('Select: the list', () => {
  it('opens with the keyboard as a listbox of options, the first highlighted, and closes with Escape giving the focus back', async () => {
    draw(<Select options={OPTIONS} aria-label='Language' />)
    const list = await open()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['English', 'Español', 'Français'])
    expect(screen.getAllByRole('option')[0].hasAttribute('data-highlighted')).toBe(true)
    expect(list.getAttribute('id')).toBe(trigger().getAttribute('aria-controls'))
    press('Escape')
    await gone()
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
  })

  it('the arrows move over the options, Enter picks one and onChange gets its value; the list closes on the trigger', async () => {
    const onChange = vi.fn()
    draw(<Select options={OPTIONS} onChange={onChange} />)
    await open()
    press('ArrowDown')
    await waitFor(() => expect(screen.getAllByRole('option')[1].hasAttribute('data-highlighted')).toBe(true))
    press('Enter')
    await gone()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('es')
    expect(trigger().textContent).toBe('Español')
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
  })

  it('a controlled value is the shown one and the selected option; picking the same value says nothing', async () => {
    const onChange = vi.fn()
    draw(<Select options={OPTIONS} value='es' onChange={onChange} />)
    expect(trigger().textContent).toBe('Español')
    await open()
    const selected = screen.getAllByRole('option').find((option) => option.getAttribute('aria-selected') === 'true')
    expect(selected.textContent).toBe('Español')
    expect(selected.hasAttribute('data-selected')).toBe(true)
    expect(selected.hasAttribute('data-highlighted')).toBe(true)
    press('Enter')
    await gone()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a controlled value the parent does not change: picking another option says so each time', async () => {
    const onChange = vi.fn()
    draw(<Select options={OPTIONS} value='en' onChange={onChange} />)
    for (const times of [1, 2]) {
      await open()
      press('ArrowDown')
      await waitFor(() => expect(screen.getAllByRole('option')[1].hasAttribute('data-highlighted')).toBe(true))
      press('Enter')
      await gone()
      expect(onChange).toHaveBeenCalledTimes(times)
      expect(onChange).toHaveBeenLastCalledWith('es')
    }
    expect(trigger().textContent).toBe('EN')
  })

  it('the list is anchored at the trigger\'s end in either direction (the placement turns with the page\'s direction by itself)', async () => {
    for (const current of [defaults, { ...defaults, rtl: true }]) {
      const { unmount } = draw(<Select options={OPTIONS} />, current)
      const list = await open()
      expect(list.closest('[data-slot=select-positioner]').getAttribute('data-align')).toBe('end')
      unmount()
      await gone()
    }
  })

  it('a disabled option cannot be picked', async () => {
    const onChange = vi.fn()
    draw(<Select options={OPTIONS} onChange={onChange} />)
    await open()
    const [, , french] = screen.getAllByRole('option')
    expect(french.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(french)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('options can carry an icon or an image with the text', async () => {
    draw(<Select aria-label='Type' options={[{ value: 'a', content: <><svg data-testid='ico' /><span>Delivery</span></> }]} openSingle />)
    await open()
    expect(screen.getByRole('option').querySelector('[data-testid=ico]')).not.toBeNull()
  })

  it('a single option is only shown: no list and no arrow, unless openSingle', async () => {
    const { rerender } = draw(<Select options={[OPTIONS[0]]} defaultValue='en' />)
    expect(trigger().getAttribute('aria-readonly')).toBe('true')
    expect(trigger().querySelector('[data-slot=select-icon]')).toBeNull()
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    fireEvent.click(trigger())
    expect(screen.queryByRole('listbox')).toBeNull()
    rerender(<ThemeProvider theme={defaults}><Select options={[OPTIONS[0]]} defaultValue='en' openSingle /></ThemeProvider>)
    expect(trigger().querySelector('[data-slot=select-icon]')).not.toBeNull()
    await open()
  })

  it.each([['defaults', defaults], ['grill', grill], ['cafe', cafe]])('%s: the list is in a portal that carries components.menu, and the trigger none of it but the motion', async (_, theme) => {
    draw(<Select options={OPTIONS} />, theme)
    const portal = portalOf(await open())
    // a portal Base UI marks, which the legacy click-outside handlers know (src/utils/overlay.js)
    expect(portal.hasAttribute('data-base-ui-portal')).toBe(true)
    expect(portal.parentElement).toBe(document.body)
    expect(isInsideOverlay(screen.getAllByRole('option')[0])).toBe(true)
    expect(vars(portal)).toMatchObject(componentVars(theme, 'menu'))
    expect(portal.style.getPropertyValue('--ui-menu-background')).toBe(getThemeCss(theme, 'menu').base.background)
    expect(vars(portal, '--ui-input')).toEqual({})
    expect(vars(trigger(), '--ui-menu')).toEqual({
      '--ui-menu-motion-duration': componentVars(theme, 'menu')['--ui-menu-motion-duration'],
      '--ui-menu-motion-easing': componentVars(theme, 'menu')['--ui-menu-motion-easing']
    })
  })

  it('the scrollbar is the theme\'s: its size and radius, the thumb the strong border color', async () => {
    draw(<Select options={OPTIONS} />, grill)
    const portal = portalOf(await open())
    expect(portal.style.getPropertyValue('--ui-select-scrollbar-size')).toBe(themeScrollbar(grill).size)
    expect(portal.style.getPropertyValue('--ui-select-scrollbar-thumb')).toBe(grill.values.tokens.color.border_strong)
    // a square list has a square thumb
    expect(grill.css.components.menu.base.radius).toBe('0px')
    expect(portal.style.getPropertyValue('--ui-select-scrollbar-radius')).toBe('0')
  })

  it('the list and its options read components.menu by variable, with the floors and a layer above a sheet', async () => {
    draw(<Select options={OPTIONS} />)
    const list = await open()
    const popup = list.closest('[data-slot=select-content]')
    const classes = popup.getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    ;['ui:rounded-(--ui-menu-radius)', 'ui:bg-(--ui-menu-background)', 'ui:[box-shadow:var(--ui-menu-shadow,none)]', 'ui:min-w-(--anchor-width)', 'ui:max-h-(--available-height)']
      .forEach((name) => expect(classes).toContain(name))
    // (the literal layer above the Sheet's: the select opens over a dialog or a sheet; see LIST_LAYER)
    expect(popup.parentElement.getAttribute('data-slot')).toBe('select-positioner')
    expect(popup.parentElement.getAttribute('class')).toContain('ui:z-20602')
    const item = screen.getAllByRole('option')[0].getAttribute('class')
    ;['ui:min-h-(--ui-menu-item-height)', 'ui:px-(--ui-menu-padding-x)', 'ui:data-highlighted:bg-(--ui-menu-item-hover)', 'ui:data-selected:bg-(--ui-menu-item-selected)', 'ui:font-(weight:--ui-menu-item-text-weight)']
      .forEach((name) => expect(item).toContain(name))
    // 44 px an item on a phone and with a coarse pointer, never under the theme's item height
    expect(item).toContain('ui:pointer-coarse:min-h-[max(var(--ui-menu-item-height),44px)]')
    expect(item).toContain('ui:max-mobile:min-h-[max(var(--ui-menu-item-height),44px)]')
  })

  it('the selected option keeps its background under the pointer', async () => {
    draw(<Select options={OPTIONS} defaultValue='en' />)
    await open()
    const item = screen.getAllByRole('option')[0].getAttribute('class')
    expect(item.indexOf('ui:data-highlighted:bg-(--ui-menu-item-hover)')).toBeLessThan(item.indexOf('ui:data-selected:data-highlighted:bg-(--ui-menu-item-selected)'))
  })

  it('opened from inside a group, the list is drawn with the same theme in its own portal', async () => {
    render(<ThemeProvider theme={grill}><ComponentScope group='header'><Select options={OPTIONS} /></ComponentScope></ThemeProvider>)
    const portal = portalOf(await open())
    expect(portal.parentElement).toBe(document.body)
    expect(vars(portal)).toMatchObject(componentVars(scopedTheme(grill, 'header'), 'menu'))
  })
})

describe('Select: the header capsule', () => {
  // the oracle is the screen's: what the capsule's items read (Header/styles.js)
  const order = (size) => buildAppTheme(null, { version: 2, values: { components: { header: { slots: { order_type: { component: 'tabs', size } } } } } })

  it.each([['defaults', defaults], ['grill', grill], ['cafe', cafe], ['lg slot', order('lg')]])('%s: no box of its own, the tabs\' text and icon size the header reads', (_, theme) => {
    draw(<Select variant='capsule' options={OPTIONS} defaultValue='en' />, theme)
    const button = trigger()
    expect(button.getAttribute('data-variant')).toBe('capsule')
    const own = vars(button)
    expect(own['--ui-tabs-icon-size']).toBe(capsuleIconSize(theme))
    expect(capsuleText(theme)).toContain(`font-size: ${own['--ui-tabs-text-size']}`)
    expect(vars(button, '--ui-input')).toEqual({})
    const classes = button.getAttribute('class')
    expect(classes).toContain('ui:bg-transparent')
    expect(classes).toContain('ui:[border:none]')
    expect(classes).not.toContain('--ui-input')
    expect(classes).toContain('ui:text-(length:--ui-tabs-text-size)')
    expect(classes).toContain('ui:[&_svg]:size-(--ui-tabs-icon-size)')
  })

  it('the slot\'s size moves it: lg tabs have a larger icon than md', () => {
    draw(<Select variant='capsule' options={OPTIONS} />, order('lg'))
    expect(trigger().style.getPropertyValue('--ui-tabs-icon-size')).toBe(getThemeCss(order('lg'), 'tabs').sizes.lg.icon_size)
    expect(getThemeCss(order('lg'), 'tabs').sizes.lg.icon_size).not.toBe(getThemeCss(order('lg'), 'tabs').sizes.md.icon_size)
  })

  it('has the floors of every control: 44 px of touch target, the chevron muted and turned open', async () => {
    draw(<Select variant='capsule' options={OPTIONS} />)
    expect(trigger().getAttribute('class')).toContain('ui:pointer-coarse:after:min-h-[44px]')
    const icon = trigger().querySelector('[data-slot=select-icon]')
    expect(icon.getAttribute('class')).toContain('ui:text-text-muted')
    expect(icon.getAttribute('class')).toContain('ui:data-popup-open:rotate-180')
    await open()
  })
})

describe('Select: the parts', () => {
  it('compose by hand as shadcn\'s: root, trigger, value, content and items', async () => {
    const onValueChange = vi.fn()
    draw(
      <SelectRoot onValueChange={onValueChange} items={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]}>
        <SelectTrigger aria-label='Letter'><SelectValue placeholder='Pick' /></SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Alpha</SelectItem>
          <SelectItem value='b'>Beta</SelectItem>
        </SelectContent>
      </SelectRoot>
    )
    await open()
    press('ArrowDown')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Beta' }).hasAttribute('data-highlighted')).toBe(true))
    press('Enter')
    await gone()
    expect(onValueChange.mock.calls[0][0]).toBe('b')
    expect(trigger().textContent).toBe('Beta')
  })

  it('the caller\'s class and style win over the piece\'s', () => {
    draw(<Select options={OPTIONS} className='ui:rounded-none' style={{ margin: '1px' }} fullWidth />)
    expect(trigger().getAttribute('class')).toContain('ui:rounded-none')
    expect(trigger().getAttribute('class')).not.toContain('ui:rounded-(--ui-input-radius)')
    expect(trigger().getAttribute('class')).toContain('ui:w-full')
    expect(trigger().style.margin).toBe('1px')
  })
})

it.each([['defaults', defaults], ['grill', grill]])('mobile-sheet keeps the options in a sheet and returns focus in %s', async (name, theme) => {
  const width = window.innerWidth
  window.innerWidth = 390
  try {
    const onChange = vi.fn()
    draw(<Select presentation='mobile-sheet' options={OPTIONS} defaultValue='es' onChange={onChange} aria-label='Language' />, theme)
    const field = screen.getByRole('button', { name: 'Language' })
    expect(field.style.getPropertyValue('--ui-input-height')).toBe(theme.css.components.input.sizes.md.height)
    field.focus()
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    const current = await screen.findByRole('option', { name: 'Español' })
    expect(current.closest('[data-slot=sheet-content]')).toBeTruthy()
    await waitFor(() => expect(current).toHaveFocus())
    fireEvent.keyDown(current, { key: 'ArrowUp' })
    const english = screen.getByRole('option', { name: 'English' })
    expect(english).toHaveFocus()
    fireEvent.keyDown(english, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('en')
    await waitFor(() => expect(field).toHaveFocus())
    expect(field).toHaveTextContent('EN')
    expect(field).toHaveAccessibleDescription('EN')
  } finally {
    window.innerWidth = width
  }
})

it.each([['defaults', defaults], ['grill', grill]])('anchored-professional keeps the full-width panel and menu row in %s', async (name, theme) => {
  const onChange = vi.fn()
  const values = [{ value: 1, content: <span>Ana · Available</span> }, { value: 2, content: <span>Bob · Busy</span> }]
  const Example = () => {
    const [value, setValue] = React.useState(1)
    const choose = (next) => {
      onChange(next)
      setValue(next)
    }
    return <Select presentation='anchored-professional' value={value} options={values} onChange={choose} aria-label='Professionals' />
  }
  draw(<Example />, theme)
  const field = screen.getByRole('button', { name: 'Professionals' })
  expect(field).toHaveTextContent('Ana · Available')
  expect(field).toHaveAccessibleDescription('Ana · Available')
  expect(field.className).toContain('ui:py-md')
  field.focus()
  fireEvent.keyDown(field, { key: 'Enter' })
  const list = await screen.findByRole('listbox')
  expect(list.parentElement).toBe(field.parentElement)
  // a scrolling list is a share of the screen's height, not a fixed 263 px; an option is 13 characters wide at least
  expect(list.className).toContain('ui:max-h-[30dvh]')
  expect(list.style.getPropertyValue('--ui-select-option-min-width')).toBe('13ch')
  expect(list.style.getPropertyValue('--ui-menu-item-selected')).toBe(theme.css.components.menu.base.item_selected)
  const ana = screen.getByRole('option', { name: 'Ana · Available' })
  await waitFor(() => expect(ana).toHaveFocus())
  fireEvent.keyDown(ana, { key: 'ArrowDown' })
  const bob = screen.getByRole('option', { name: 'Bob · Busy' })
  expect(bob).toHaveFocus()
  fireEvent.keyDown(bob, { key: 'Enter' })
  expect(onChange).toHaveBeenCalledWith(2)
  expect(field).toHaveFocus()
  expect(field).toHaveAccessibleDescription('Bob · Busy')
})

it.each([
  ['disabled', 1440],
  ['readOnly', 1440],
  ['disabled', 390],
  ['readOnly', 390]
])('closes the open mobile-sheet when %s changes at %ipx and blocks further selection', async (blocked, width) => {
  const originalWidth = window.innerWidth
  window.innerWidth = width
  const onChange = vi.fn()
  const onOpenChange = vi.fn()
  const scene = (lock = false) => (
    <ThemeProvider theme={defaults}>
      <Select presentation='mobile-sheet' options={OPTIONS} defaultValue='en' onChange={onChange} onOpenChange={onOpenChange} aria-label='Language' {...{ [blocked]: lock }} />
    </ThemeProvider>
  )
  try {
    const { rerender } = render(scene())
    const field = screen.getByRole('button', { name: 'Language' })
    field.focus()
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    const item = await screen.findByRole('option', { name: 'Español' })
    item.focus()
    rerender(scene(true))
    fireEvent.click(item)
    fireEvent.keyDown(item, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
    if (blocked === 'disabled') {
      expect(field).toBeDisabled()
      expect(field).toHaveAttribute('aria-expanded', 'false')
    } else {
      expect(field).toHaveAttribute('aria-disabled', 'true')
      expect(field).not.toHaveAttribute('aria-expanded')
    }
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    await waitFor(() => expect(blocked === 'disabled' ? field.parentElement : field).toHaveFocus())
  } finally {
    window.innerWidth = originalWidth
  }
})

it('the floating select participates in forms and flags invalid fields', () => {
  const { getByRole, getByTestId } = draw(
    <form data-testid='form'>
      <Select options={OPTIONS} defaultValue='es' name='lang' required invalid variant='capsule' aria-label='Language' />
    </form>
  )
  expect(new FormData(getByTestId('form')).get('lang')).toBe('es')
  expect(getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  expect(getByRole('combobox')).toHaveAttribute('data-variant', 'capsule')
})

it.each(['mobile-sheet', 'anchored-professional'])('%s accepts the invalid state without forwarding floating-only props', (presentation) => {
  const { getByRole } = draw(
    <Select presentation={presentation} options={OPTIONS} name='lang' required invalid variant='capsule' aria-label='Language' />
  )
  const field = getByRole('button', { name: 'Language' })
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field).not.toHaveAttribute('invalid')
  expect(field).not.toHaveAttribute('name')
  expect(field).not.toHaveAttribute('required')
  expect(field).not.toHaveAttribute('variant')
})

it.each([false, true])('recovers focus after pointer opening and loading (external focus: %s)', (movedOutside) => {
  const scene = (loading = false) => (
    <ThemeProvider theme={defaults}>
      <button type='button'>Outside</button>
      <Select presentation='mobile-sheet' options={OPTIONS} disabled={loading} aria-label='Language' />
    </ThemeProvider>
  )
  const { getByRole, queryByRole, rerender } = render(scene())
  const trigger = getByRole('button', { name: 'Language' })
  const outside = getByRole('button', { name: 'Outside' })
  trigger.focus()
  fireEvent.click(trigger, { detail: 1 })
  expect(getByRole('listbox')).toBeVisible()
  expect(trigger).toHaveFocus()
  if (movedOutside) outside.focus()
  rerender(scene(true))
  expect(queryByRole('listbox')).toBeNull()
  expect(movedOutside ? outside : trigger.parentElement).toHaveFocus()
})

it.each(['mobile-sheet', 'anchored-professional'])('%s announces readOnly and rejects pointer and keyboard activation', (presentation) => {
  const onOpenChange = vi.fn()
  const { getByRole, queryByRole } = draw(
    <Select presentation={presentation} options={OPTIONS} defaultValue='es' readOnly aria-label='Language' onOpenChange={onOpenChange} />
  )
  const trigger = getByRole('button', { name: 'Language' })
  expect(trigger).toHaveAccessibleDescription('Español')
  expect(trigger).toHaveAttribute('aria-disabled', 'true')
  expect(trigger).not.toHaveAttribute('aria-haspopup')
  expect(trigger).not.toHaveAttribute('aria-expanded')
  trigger.focus()
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger, { detail: 1 })
  for (const key of ['Enter', ' ', 'ArrowDown']) fireEvent.keyDown(trigger, { key })
  expect(queryByRole('listbox')).toBeNull()
  expect(onOpenChange).not.toHaveBeenCalled()
})

it.each([false, true])('keeps a single value invalid (openSingle: %s)', (openSingle) => {
  const { getByRole, queryByRole } = draw(
    <>
      <Select presentation='mobile-sheet' options={[{ value: 'ana', content: 'Ana' }]} defaultValue='ana'
        invalid openSingle={openSingle} aria-label='Student' aria-describedby='reason' />
      <p id='reason'>Select an eligible student</p>
    </>
  )
  const field = getByRole(openSingle ? 'button' : 'group', { name: 'Student' })
  expect(field).toHaveTextContent('Ana')
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field).toHaveAccessibleDescription('Select an eligible student Ana')
  expect(field.className).toContain('ui:aria-invalid:[border:var(--ui-input-error-border,var(--ui-input-border))]')
  if (!openSingle) {
    expect(field).not.toHaveAttribute('aria-haspopup')
    expect(queryByRole('button', { name: 'Student' })).toBeNull()
  }
})

describe('Select: a field of the size a slot asks for (the header\'s language)', () => {
  it.each(['sm', 'md', 'lg'])('size=%s is components.input at that size: its height, the side space of the field', (size) => {
    draw(<Select options={OPTIONS} defaultValue='en' size={size} aria-label='Language' />)
    expect(vars(trigger())).toMatchObject(componentVars(defaults, 'input', { ...FIELD, size }))
    expect(trigger().style.getPropertyValue('--ui-input-height')).toBe(componentVars(defaults, 'input', { ...FIELD, size })['--ui-input-height'])
  })

  it('closed it shows the short code and the list the name (showOnSelected)', async () => {
    draw(<Select options={OPTIONS} defaultValue='en' size='md' aria-label='Language' />)
    expect(trigger().textContent).toBe('EN')
    await open()
    expect(screen.getByRole('option', { name: 'English' })).toBeTruthy()
  })
})

describe('Select: a cap on narrow screens in fluid units', () => {
  it('narrowCap limits the trigger to a share of the viewport below the narrow cut, and nothing above it', () => {
    draw(<Select options={OPTIONS} defaultValue='en' narrowCap aria-label='Order type' />)
    const classes = trigger().getAttribute('class')
    expect(classes).toContain('ui:max-narrow:max-w-[37.5vw]')
    expect(classes).not.toMatch(/ui:max-w-\[\d+px\]/)
  })

  it('has no cap without it', () => {
    draw(<Select options={OPTIONS} defaultValue='en' aria-label='Order type' />)
    expect(trigger().getAttribute('class')).not.toContain('max-narrow')
  })
})

const TYPES = [
  { value: 2, name: 'Pickup', description: 'Ready for you to pick up', icon: 'P' },
  { value: 3, name: 'Eat in', description: 'Sit down and eat', icon: 'E' },
  { value: 4, name: 'Curbside', description: 'We bring it to your car', icon: 'C' }
]
const Rich = ({ value = 3, onValueChange, active = true }) => (
  <SelectRoot value={value} onValueChange={onValueChange} items={TYPES.map((type) => ({ value: type.value, label: type.name }))}>
    <SelectTrigger variant='capsule' active={active} aria-label='Pickup types'><SelectValue /></SelectTrigger>
    <SelectContent variant='rich'>
      {TYPES.map((type) => <SelectItem key={type.value} value={type.value} icon={type.icon} description={type.description} indicator>{type.name}</SelectItem>)}
    </SelectContent>
  </SelectRoot>
)

describe('Select: a list of rich options (icon tile, name, description, a check on the chosen)', () => {
  it('each option shows its tile, its name, its description and the check only on the chosen one', async () => {
    draw(<Rich />)
    await open()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    options.forEach((option, i) => {
      expect(option.querySelector('[data-slot=select-item-icon]').textContent).toBe(TYPES[i].icon)
      expect(option.querySelector('[data-slot=select-item-description]').textContent).toBe(TYPES[i].description)
    })
    // the unchosen one keeps the room of its check, unseen
    expect(options[0].querySelector('svg').parentElement.hasAttribute('data-selected')).toBe(false)
    expect(options[0].querySelector('svg').parentElement.className).toContain('ui:not-data-selected:invisible')
    expect(options[1].querySelector('svg').parentElement.hasAttribute('data-selected')).toBe(true)
    options.forEach((option) => expect(option.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true'))
  })

  it('the list is fluid: as wide as its content up to the menu\'s maximum, never under its trigger, rows apart', async () => {
    draw(<Rich />)
    const list = await open()
    const popup = list.closest('[data-slot=select-content]')
    expect(popup.className).toContain('ui:w-max')
    expect(popup.className).toContain('ui:max-w-[min(var(--ui-menu-max-width),var(--available-width))]')
    expect(popup.className).toContain('ui:min-w-(--anchor-width)')
    expect(list.className).toContain('ui:gap-md')
    expect(popup.className).not.toMatch(/\d+px\]/)
  })

  it('a plain list keeps its own rows', async () => {
    draw(<Select options={OPTIONS} />)
    const list = await open()
    expect(list.className).not.toContain('ui:gap-md')
    expect(list.closest('[data-slot=select-content]').className).not.toContain('ui:w-max')
    expect(screen.getAllByRole('option')[0].querySelector('[data-slot=select-item-icon]')).toBeNull()
  })
})

describe('Select: a segment of the segmented radio group (the order-type capsule)', () => {
  const Bar = ({ onValueChange, onChange, activeSelect = true }) => (
    <RadioGroup segmented aria-label='Order type' defaultValue='delivery' onValueChange={onChange}>
      <Radio appearance='segment' value='delivery' label='Delivery' />
      <SelectRoot value={3} onValueChange={onValueChange} items={TYPES.map((type) => ({ value: type.value, label: type.name }))}>
        <SelectTrigger variant='segment' active={activeSelect} aria-label='Pickup types'><SelectValue /></SelectTrigger>
        <SelectContent variant='rich'>
          {TYPES.map((type) => <SelectItem key={type.value} value={type.value} description={type.description}>{type.name}</SelectItem>)}
        </SelectContent>
      </SelectRoot>
    </RadioGroup>
  )

  it('takes the bar\'s tab look (its variant, gap, joined edges) and its variables from the bar', () => {
    draw(<Bar />)
    const segment = trigger()
    const radio = screen.getByRole('radio', { name: 'Delivery' })
    expect(segment.getAttribute('data-variant')).toBe('segment')
    expect(segment.getAttribute('class')).toContain('ui:data-checked:bg-(--ui-tabs-active-background)')
    expect(segment.getAttribute('class')).toContain('ui:flex-[1_1_0]')
    // one look: what the radio segment writes, the select's segment writes
    const shared = ['ui:text-(--ui-tabs-inactive)', 'ui:px-(--ui-tabs-padding-x)', 'ui:rounded-(--ui-tabs-tab-radius)']
    shared.forEach((name) => { expect(segment.getAttribute('class')).toContain(name); expect(radio.getAttribute('class')).toContain(name) })
    // it paints no box of its own: the bar's variables reach it by inheritance
    expect(vars(segment, '--ui-tabs')).toEqual({})
    expect(vars(segment.parentElement, '--ui-tabs')['--ui-tabs-height']).toBeTruthy()
  })

  it('is marked when its group holds the chosen order type, and not otherwise', () => {
    const { rerender } = draw(<Bar activeSelect />)
    expect(trigger().hasAttribute('data-checked')).toBe(true)
    rerender(<ThemeProvider theme={defaults}><Bar activeSelect={false} /></ThemeProvider>)
    expect(trigger().hasAttribute('data-checked')).toBe(false)
  })

  it('opens a rich list from the keyboard, and choosing the option already shown still reports it', async () => {
    const onValueChange = vi.fn()
    draw(<Bar onValueChange={onValueChange} />)
    await open()
    press('ArrowUp')
    press('Enter')
    await gone()
    expect(onValueChange).toHaveBeenCalledWith(2, expect.anything())
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
    await open()
    await waitFor(() => expect(screen.getAllByRole('option')[1].hasAttribute('data-highlighted')).toBe(true))
    press('Enter')
    await gone()
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(onValueChange).toHaveBeenLastCalledWith(3, expect.anything())
  })

  it('the radios of the bar are a tab stop apart from the select, which has its own name', () => {
    const onChange = vi.fn()
    draw(<Bar onChange={onChange} />)
    const radio = screen.getByRole('radio', { name: 'Delivery' })
    expect(radio.getAttribute('aria-checked')).toBe('true')
    expect(trigger().getAttribute('tabindex')).not.toBe('-1')
    expect(trigger()).toHaveAccessibleName('Pickup types')
  })

  // M3: the segment reads the underline's length as the radio does
  it.each(['full', 'medium', 'small'])('under the underline variant its line is the theme\'s indicator length (%s), as the radio\'s', (length) => {
    const own = buildAppTheme(null, { version: 2, values: { components: { tabs: { base: { variant: 'underline' }, variants: { underline: { indicator_length: length } } } } } })
    draw(<Bar />, own)
    const mark = (el) => el.getAttribute('class').match(/ui:before:(?:inset-x-none|left-1\/4 ui:before:w-1\/2|left-\[37\.5%\] ui:before:w-1\/4)/)?.[0]
    expect(mark(trigger())).toBeTruthy()
    expect(mark(trigger())).toBe(mark(screen.getByRole('radio', { name: 'Delivery' })))
    if (length !== 'full') expect(mark(trigger())).not.toContain('inset-x-none')
  })
})

// implementation notesthe options sit on the surface color on the menu's home, which a full website has at /order
describe('Select: the menu home paints its options on the surface color', () => {
  // the responsive select (`presentation`) is the one that reads the page; below the phone cut it is a sheet and never paints this
  const surfaceOptions = async (path, experience) => {
    window.history.replaceState({}, '', path)
    draw(<Select presentation='mobile-sheet' options={OPTIONS} aria-label='Language' />, themeWithValues((values) => { values.site.experience = experience }))
    const field = screen.getByRole('button', { name: 'Language' })
    field.focus()
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    const options = await screen.findAllByRole('option')
    expect(options[0].closest('[data-slot=sheet-content]')).toBeNull()
    return options.every((option) => option.getAttribute('class').includes('bg-surface!'))
  }
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('/order of a full website', async () => expect(await surfaceOptions('/order', 'full_website')).toBe(true))
  it('/ of a site that opens on the menu', async () => expect(await surfaceOptions('/', 'ordering_only')).toBe(true))
  it('/order of a site that opens on the menu is not the menu home', async () => expect(await surfaceOptions('/order', 'ordering_only')).toBe(false))
})
