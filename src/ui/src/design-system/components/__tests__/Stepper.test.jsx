import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Stepper, StepperInput } from '../Stepper'

// the remove name goes through `t()`: a translation of its own proves it is not the fallback
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (key, fallback) => ({ REMOVE: 'Quitar' })[key] ?? fallback]
}))

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const [defaults, grill] = THEMES.map(({ theme }) => theme)
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const withStepper = (patch) => buildAppTheme(null, { version: 2, values: { components: { stepper: patch } } })
const box = (view) => view.getByRole('group')

describe('Stepper: − value +', () => {
  it('is a group of two real buttons with names and the value', () => {
    const view = draw(<Stepper value={3} onDecrement={() => {}} onIncrement={() => {}} />)
    expect(box(view)).toHaveAttribute('data-slot', 'stepper')
    const minus = view.getByRole('button', { name: 'Decrease quantity' })
    const plus = view.getByRole('button', { name: 'Increase quantity' })
    expect(minus.tagName).toBe('BUTTON')
    expect(minus).toHaveAttribute('type', 'button')
    expect(plus).toHaveAttribute('type', 'button')
    expect(view.getByText('3')).toHaveAttribute('aria-live', 'polite')
  })

  it('is the base Button of the stepper size and the theme\'s button appearance', () => {
    const theme = withStepper({ base: { button_appearance: 'outline' } })
    const view = draw(<Stepper size='lg' value={1} onDecrement={() => {}} onIncrement={() => {}} />, theme)
    const plus = view.getByRole('button', { name: 'Increase quantity' })
    expect(plus).toHaveAttribute('data-slot', 'button')
    const expected = componentVars(theme, 'button', { size: 'lg', shape: 'icon', color: 'primary', appearance: 'outline' })
    expect(plus.style.getPropertyValue('--ui-button-background')).toBe(expected['--ui-button-background'])
    expect(plus.style.getPropertyValue('--ui-button-height')).toBe(expected['--ui-button-height'])
    expect(plus).toHaveClass('ui:w-(--ui-button-height)')
  })

  it('an unknown appearance is ghost, an unknown size is md', () => {
    const theme = withStepper({ base: { button_appearance: 'neon' } })
    const view = draw(<Stepper size='xl' value={1} onDecrement={() => {}} onIncrement={() => {}} />, theme)
    const expected = componentVars(theme, 'button', { size: 'md', shape: 'icon', color: 'primary', appearance: 'ghost' })
    expect(view.getByRole('button', { name: 'Increase quantity' }).style.getPropertyValue('--ui-button-background')).toBe(expected['--ui-button-background'])
    expect(box(view).style.getPropertyValue('--ui-stepper-height')).toBe(componentVars(theme, 'stepper', { size: 'md' })['--ui-stepper-height'])
  })

  it.each([defaults, grill])('the box, radius, border and the value are components.stepper', (theme) => {
    const view = draw(<Stepper size='sm' value={2} onDecrement={() => {}} onIncrement={() => {}} />, theme)
    const expected = componentVars(theme, 'stepper', { size: 'sm' })
    ;['--ui-stepper-height', '--ui-stepper-radius', '--ui-stepper-border', '--ui-stepper-value-size', '--ui-stepper-value-color'].forEach((name) => {
      expect(box(view).style.getPropertyValue(name)).toBe(expected[name])
    })
    expect(box(view)).toHaveClass('ui:h-(--ui-stepper-height)', 'ui:rounded-(--ui-stepper-radius)')
    expect(view.getByText('2')).toHaveClass('ui:text-(--ui-stepper-value-color)')
  })

  it('inside a border the buttons are the square within it', () => {
    const theme = withStepper({ base: { border: { width: 2, color: '#ABCDEF', style: 'solid' } } })
    const view = draw(<Stepper size='md' value={2} onDecrement={() => {}} onIncrement={() => {}} />, theme)
    expect(view.getByRole('button', { name: 'Increase quantity' }).style.getPropertyValue('--ui-button-height')).toBe('calc(var(--ui-stepper-height) - 4px)')
    const none = draw(<Stepper value={2} onDecrement={() => {}} onIncrement={() => {}} />, defaults)
    expect(none.getAllByRole('button', { name: 'Increase quantity' }).pop().style.getPropertyValue('--ui-button-height')).not.toContain('calc')
  })

  it('the buttons fire their handlers; a disabled one, or one without a handler, does not', () => {
    const onDecrement = vi.fn()
    const onIncrement = vi.fn()
    const view = draw(<Stepper value={3} onDecrement={onDecrement} onIncrement={onIncrement} />)
    fireEvent.click(view.getByRole('button', { name: 'Decrease quantity' }))
    fireEvent.click(view.getByRole('button', { name: 'Increase quantity' }))
    expect(onDecrement).toHaveBeenCalledTimes(1)
    expect(onIncrement).toHaveBeenCalledTimes(1)
    view.unmount()
    const off = draw(<Stepper value={3} onDecrement={onDecrement} decrementDisabled incrementDisabled onIncrement={onIncrement} />)
    expect(off.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    expect(off.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    off.unmount()
    const bare = draw(<Stepper value={3} />)
    expect(bare.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    expect(bare.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
  })

  it('the buttons are native, focusable and in reading order (Enter and Space are the browser spec\'s)', () => {
    const view = draw(<Stepper value={1} onDecrement={() => {}} onIncrement={() => {}} />)
    const [minus, plus] = view.getAllByRole('button')
    expect(minus).toHaveAccessibleName('Decrease quantity')
    expect(plus).toHaveAccessibleName('Increase quantity')
    expect(minus.compareDocumentPosition(plus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    plus.focus()
    expect(plus).toHaveFocus()
    expect(plus).not.toHaveAttribute('tabindex', '-1')
  })

  it('custom names and data attributes go to each button', () => {
    const view = draw(<Stepper value={3} onDecrement={() => {}} onIncrement={() => {}} decrementLabel='Less' incrementLabel='More' decrementProps={{ 'data-doc-control': 'less' }} incrementProps={{ 'data-doc-control': 'more' }} />)
    expect(view.getByRole('button', { name: 'Less' })).toHaveAttribute('data-doc-control', 'less')
    expect(view.getByRole('button', { name: 'More' })).toHaveAttribute('data-doc-control', 'more')
  })
})

describe('Stepper: removable (the − is a trash at 1)', () => {
  it('at 1 the − is the Lucide trash named Remove (translated); above 1 it is the minus', () => {
    const view = draw(<Stepper removable value={1} onDecrement={() => {}} onIncrement={() => {}} />)
    const remove = view.getByRole('button', { name: 'Quitar' })
    expect(remove.querySelector('svg.lucide-trash-2')).not.toBeNull()
    expect(view.queryByRole('button', { name: 'Decrease quantity' })).toBeNull()
    view.unmount()
    const more = draw(<Stepper removable value={2} onDecrement={() => {}} onIncrement={() => {}} />)
    const minus = more.getByRole('button', { name: 'Decrease quantity' })
    expect(minus.querySelector('svg.lucide-minus')).not.toBeNull()
    expect(minus.querySelector('svg.lucide-trash-2')).toBeNull()
  })

  it('it keeps the caller\'s own name and the click', () => {
    const onDecrement = vi.fn()
    const view = draw(<Stepper removable value={1} decrementLabel='Delete line' onDecrement={onDecrement} onIncrement={() => {}} />)
    fireEvent.click(view.getByRole('button', { name: 'Delete line' }))
    expect(onDecrement).toHaveBeenCalledTimes(1)
  })

  it('without removable the minus stays at 1', () => {
    const view = draw(<Stepper value={1} onDecrement={() => {}} onIncrement={() => {}} />)
    expect(view.getByRole('button', { name: 'Decrease quantity' }).querySelector('svg.lucide-minus')).not.toBeNull()
  })
})

describe('Stepper: compact (a quantity inside a row)', () => {
  it('has no frame of its own and its buttons are the theme\'s smallest', () => {
    const theme = withStepper({ base: { border: { width: 2, color: '#ABCDEF', style: 'solid' } } })
    const view = draw(<Stepper compact value={1} onDecrement={() => {}} onIncrement={() => {}} />, theme)
    expect(box(view)).toHaveAttribute('data-compact', '')
    expect(box(view)).not.toHaveClass('ui:h-(--ui-stepper-height)')
    expect(box(view).style.getPropertyValue('--ui-stepper-border')).toBe('')
    const expected = componentVars(theme, 'button', { size: 'xs', shape: 'icon', color: 'primary', appearance: 'ghost' })
    expect(view.getByRole('button', { name: 'Increase quantity' }).style.getPropertyValue('--ui-button-height')).toBe(expected['--ui-button-height'])
  })

  it('still the value\'s text and color of the theme, and the same names', () => {
    const view = draw(<Stepper compact value={4} onDecrement={() => {}} onIncrement={() => {}} />)
    expect(view.getByText('4')).toHaveClass('ui:text-(--ui-stepper-value-color)')
    expect(box(view).style.getPropertyValue('--ui-stepper-value-size')).toBe(componentVars(defaults, 'stepper')['--ui-stepper-value-size'])
    expect(view.getByRole('button', { name: 'Decrease quantity' })).toBeInTheDocument()
  })
})

describe('Stepper: an editable value', () => {
  it('replaces the text and reads the stepper\'s value style', () => {
    const view = draw(
      <Stepper onDecrement={() => {}} onIncrement={() => {}} value={2}>
        <StepperInput aria-label='Quantity' value='2' onChange={() => {}} />
      </Stepper>
    )
    const input = view.getByLabelText('Quantity')
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveClass('ui:text-(--ui-stepper-value-color)')
    expect(view.queryByText('2', { selector: '[aria-live]' })).toBeNull()
  })

  it('has the width of its characters (4 by default)', () => {
    const view = draw(<><StepperInput aria-label='a' value='1' onChange={() => {}} /><StepperInput aria-label='b' chars={7} value='1' onChange={() => {}} /></>)
    expect(view.getByLabelText('a').style.getPropertyValue('--ui-stepper-input-chars')).toBe('4')
    expect(view.getByLabelText('b').style.getPropertyValue('--ui-stepper-input-chars')).toBe('7')
  })
})

describe('StepperInput: the touch floor', () => {
  it('the typed value answers in 44 x 44 px on touch', () => {
    const view = draw(<Stepper onDecrement={() => {}} onIncrement={() => {}}><StepperInput aria-label='Quantity' defaultValue='1' /></Stepper>)
    const input = view.getByRole('textbox', { name: 'Quantity' })
    expect(input.className).toContain('ui:pointer-coarse:min-h-[44px]')
    expect(input.className).toContain('ui:pointer-coarse:min-w-[44px]')
    expect(input.className).toContain('ui:max-mobile:min-w-[44px]')
  })
})
