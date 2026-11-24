import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { rebuildTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ProductOptionSubOption, SubOptionRadioGroup } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const handlers = vi.hoisted(() => ({
  toggleSelect: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
  changePosition: vi.fn()
}))

// The controller passes its props through with the test's handlers
vi.mock('~components/components/ProductOptionSuboption', () => ({
  ProductOptionSuboption: ({ UIComponent, ...rest }) => (
    <UIComponent
      state={{ selected: false, quantity: 0, position: 'whole' }}
      balance={0}
      setIsScrollAvailable={vi.fn()}
      {...handlers}
      {...rest}
    />
  )
}))

const theme = (base = {}) => themeWithValues((values) => {
  values.components.product_option.base = {
    ...values.components.product_option.base,
    image_size: 48,
    image_radius: 6,
    price: { size: 13, line: 1.38, weight: 400 },
    price_color: '#3A3A3A',
    ...base
  }
  return values
})

const multi = {
  id: 1,
  name: 'Toppings',
  min: 0,
  max: 3,
  allow_suboption_quantity: true,
  suboptions: [{ id: 11, name: 'Ham', image: 'ham.png' }, { id: 12, name: 'Corn', image: '-' }, { id: 13, name: 'Olive' }]
}
const single = { id: 2, name: 'Size', min: 1, max: 1, suboptions: [{ id: 21, name: 'Small' }, { id: 22, name: 'Large' }] }
const chosen = { selected: true, quantity: 1, position: 'whole' }

const renderSub = (t, props) => renderWithProviders(<ProductOptionSubOption {...props} />, { theme: t })
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const clear = () => Object.values(handlers).forEach((fn) => fn.mockClear())

describe('ProductOptionSubOption: multiple choice (a Choice of the design system)', () => {
  it('a named checkbox row with its doc markers; a click toggles it once', () => {
    clear()
    const utils = renderSub(theme(), { option: multi, suboption: multi.suboptions[1] })
    const checkbox = utils.getByRole('checkbox', { name: 'Corn' })
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
    expect(checkbox).toHaveAttribute('data-slot', 'choice')
    expect(checkbox).toHaveAttribute('data-doc-control', 'product-suboption')
    expect(checkbox).toHaveAttribute('data-doc-suboption-id', '12')
    expect(checkbox).toHaveAttribute('data-doc-selected', 'false')
    fireEvent.click(utils.getByText('Corn'))
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('selected: aria-checked and the base check glyph', () => {
    const utils = renderSub(theme(), { option: multi, suboption: multi.suboptions[1], state: chosen })
    const checkbox = utils.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(checkbox).toHaveAttribute('data-doc-selected', 'true')
    expect(checkbox.querySelector('[data-slot="checkbox-mark"] svg.lucide-check')).not.toBeNull()
  })

  it('the group\'s scope applies to the row and its checkbox (product_option.scope.choice / checkbox)', () => {
    const scoped = themeWithValues((values) => {
      const { choice, checkbox } = values.components
      values.components.product_option = {
        ...values.components.product_option,
        scope: { choice: { ...choice, base: { ...choice.base, radius: 3 } }, checkbox: { ...checkbox, base: { ...checkbox.base, size: 31 } } }
      }
      return values
    })
    const row = vars(renderSub(scoped, { option: multi, suboption: multi.suboptions[1] }).getByRole('checkbox'))
    expect(row).toMatchObject({ '--ui-choice-radius': '3px', '--ui-checkbox-size': '31px' })
  })

  it('choice.base.show_indicator false: no checkbox mark, the row is still the checkbox', () => {
    const t = themeWithValues((values) => {
      values.components.choice.base.show_indicator = false
      return values
    })
    const checkbox = renderSub(t, { option: multi, suboption: multi.suboptions[1], state: chosen }).getByRole('checkbox')
    expect(checkbox.querySelector('[data-slot="choice-indicator"]')).toBeNull()
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })

  it('the touch target is 44 px on a phone and with a coarse pointer', () => {
    const classes = renderSub(theme(), { option: multi, suboption: multi.suboptions[1] }).getByRole('checkbox').getAttribute('class')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })
})

describe('ProductOptionSubOption: single choice', () => {
  it('a radio of the piece: aria-checked, the base Circle / CircleDot glyphs, one toggle per click', () => {
    clear()
    const utils = renderSub(theme(), { option: single, suboption: single.suboptions[0], state: chosen })
    const radio = utils.getByRole('radio', { name: 'Small' })
    expect(radio).toHaveAttribute('aria-checked', 'true')
    expect(radio).toHaveAttribute('data-doc-control', 'product-suboption')
    const mark = radio.querySelector('[data-slot="radio-mark"]')
    expect(mark.querySelector('svg.lucide-circle')).not.toBeNull()
    expect(mark.querySelector('svg.lucide-circle-dot')).not.toBeNull()
    fireEvent.click(radio)
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('unselected: aria-checked false and a click selects it once', () => {
    clear()
    const utils = renderSub(theme(), { option: single, suboption: single.suboptions[1] })
    const radio = utils.getByRole('radio', { name: 'Large' })
    expect(radio).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(radio)
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('the radio sits in a radiogroup named by the group (one per row: the group has none yet)', () => {
    const utils = renderSub(theme(), { option: single, suboption: single.suboptions[0] })
    expect(utils.getByRole('radiogroup', { name: 'Size' })).toContainElement(utils.getByRole('radio'))
  })

  it('the group\'s scope applies to the radio (product_option.scope.radio)', () => {
    const scoped = themeWithValues((values) => {
      values.components.product_option = { ...values.components.product_option, scope: { radio: { ...values.components.radio, base: { ...values.components.radio.base, size: 28 } } } }
      return values
    })
    expect(vars(renderSub(scoped, { option: single, suboption: single.suboptions[0] }).getByRole('radio'))['--ui-radio-size']).toBe('28px')
  })

  it('choice.base.show_indicator false: no radio mark, the selection is the row\'s', () => {
    const t = themeWithValues((values) => {
      values.components.choice.base.show_indicator = false
      return values
    })
    const radio = renderSub(t, { option: single, suboption: single.suboptions[0], state: chosen }).getByRole('radio')
    expect(radio.querySelector('[data-slot="radio-mark"]')).toBeNull()
    expect(radio).toHaveAttribute('aria-checked', 'true')
  })

  it('a group at its limit (not 1/1) lets the click through: the "Maximum options to choose" text and Alert', () => {
    clear()
    const limited = { ...single, min: 2, max: 1 }
    const utils = renderSub(theme(), { option: limited, suboption: limited.suboptions[0], balance: 1 })
    fireEvent.click(utils.getByRole('radio'))
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
    // the group's limit text and the Alert: the form's own Dialog (named by its title), with Accept
    expect(utils.getByRole('dialog', { name: 'Product form' })).toHaveTextContent('Maximum options to choose: 1')
    expect(utils.getAllByText('Maximum options to choose: 1')).toHaveLength(2)
    expect(utils.getByRole('dialog', { name: 'Product form' })).toHaveAttribute('data-slot', 'dialog-content')
  })

  it('its Alert closes with Accept and with Escape, the limit text stays', async () => {
    clear()
    const limited = { ...single, min: 2, max: 1 }
    const open = () => {
      const utils = renderSub(theme(), { option: limited, suboption: limited.suboptions[0], balance: 1 })
      fireEvent.click(utils.getByRole('radio'))
      return utils
    }
    const first = open()
    fireEvent.click(first.getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(first.queryByRole('dialog')).toBeNull())
    expect(first.getAllByText('Maximum options to choose: 1')).toHaveLength(1)
    first.unmount()
    const second = open()
    fireEvent.keyDown(second.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(second.queryByRole('dialog')).toBeNull())
  })
})

describe('ProductOptionSubOption: image, price, quantity', () => {
  it('a group with any image: every row keeps the image box (empty without one)', () => {
    const withImage = renderSub(theme(), { option: multi, suboption: multi.suboptions[0] })
    const box = withImage.container.querySelector('[data-slot="choice-image"]')
    expect(box.style.backgroundImage).toContain('ham.png')
    expect(vars(withImage.getByRole('checkbox'))).toMatchObject({ '--ui-product-option-image-size': '48px', '--ui-product-option-image-radius': '6px' })
    expect(box).toHaveAttribute('aria-hidden', 'true')
    withImage.unmount()

    const without = renderSub(theme(), { option: multi, suboption: multi.suboptions[2] })
    const empty = without.container.querySelector('[data-slot="choice-image"]')
    expect(empty).not.toBeNull()
    expect(empty.style.backgroundImage).toBe('')
  })

  it('visibility product.options.image false, or a group without images: no box', () => {
    const imagesHidden = rebuildTheme(theme(), (values) => {
      values.visibility['product.options.image'] = false
      return values
    })
    const hidden = renderSub(imagesHidden, { option: multi, suboption: multi.suboptions[0] })
    expect(hidden.container.querySelector('[data-slot="choice-image"]')).toBeNull()
    expect(hidden.getByText('Ham')).toBeInTheDocument()
    hidden.unmount()
    const none = renderSub(theme(), { option: single, suboption: single.suboptions[0] })
    expect(none.container.querySelector('[data-slot="choice-image"]')).toBeNull()
  })

  it('the price under the name, in the group\'s price text; none at 0 and named as the control\'s description', () => {
    const priced = renderSub(theme(), { option: multi, suboption: { ...multi.suboptions[2], price: 1.5 } })
    const price = priced.getByText(/^\+/)
    expect(price.previousElementSibling.textContent).toBe('Olive')
    expect(vars(priced.getByRole('checkbox'))['--ui-product-option-price-color']).toBe('#3A3A3A')
    expect(priced.getByRole('checkbox', { description: price.textContent })).toBeInTheDocument()
    priced.unmount()
    const free = renderSub(theme(), { option: multi, suboption: { ...multi.suboptions[2], price: 0 } })
    expect(free.queryByText(/^\+/)).toBeNull()
  })

  it('selected with quantities: a stepper with the same handlers and limits', () => {
    clear()
    const utils = renderSub(theme(), {
      option: multi,
      suboption: { ...multi.suboptions[2], max: 2 },
      state: { selected: true, quantity: 2, position: 'whole' },
      balance: 2
    })
    const plus = utils.getByRole('button', { name: 'Increase quantity' })
    const minus = utils.getByRole('button', { name: 'Decrease quantity' })
    // the sub-option's max (2) is reached
    expect(plus).toBeDisabled()
    fireEvent.click(minus)
    expect(handlers.decrement).toHaveBeenCalledTimes(1)
    // the stepper is in the row's `end` slot, at its end, and does not toggle it
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
    expect(utils.getByRole('checkbox').querySelector('[data-slot=choice-end]')).toContainElement(minus)
    expect(utils.getByRole('checkbox').lastElementChild).toContainElement(minus)
    expect(utils.getByText('2')).toBeInTheDocument()
    // the base Stepper in its compact form (no frame of its own inside a row)
    expect(minus.closest('[data-slot=stepper]')).toHaveAttribute('data-compact')
  })
})

describe('ProductOptionSubOption: max reached, sold out, read only', () => {
  it('max reached: an unselected row is disabled, not clickable and opens no alert', () => {
    clear()
    const utils = renderSub(theme(), { option: { ...multi, max: 1 }, suboption: multi.suboptions[2], balance: 1 })
    const checkbox = utils.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(utils.getByText('Olive'))
    fireEvent.click(checkbox)
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
    expect(utils.queryByText('Maximum options to choose: 1')).toBeNull()
    // it keeps the disabled look of the choice: the whole row dims and shows not-allowed
    expect(checkbox.getAttribute('class')).toContain('ui:data-disabled:opacity-(--ui-choice-disabled-opacity)')
    expect(checkbox.getAttribute('class')).toContain('ui:data-disabled:cursor-not-allowed')
  })

  it('max reached: a selected row stays enabled (it can be unselected)', () => {
    clear()
    const utils = renderSub(theme(), { option: { ...multi, max: 1 }, suboption: multi.suboptions[2], state: chosen, balance: 1 })
    const checkbox = utils.getByRole('checkbox')
    expect(checkbox).not.toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(checkbox)
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('sold out: disabled, the row keeps its look (no gray block, implementation notes), only the control and the price dim', () => {
    clear()
    const utils = renderSub(theme(), { option: multi, suboption: { ...multi.suboptions[2], price: 2 }, isSoldOut: true })
    const checkbox = utils.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-disabled', 'true')
    expect(checkbox.getAttribute('class')).not.toContain('ui:data-disabled:opacity')
    expect(checkbox.querySelector('[data-slot="choice-indicator"]').getAttribute('class')).toContain('ui:opacity-(--ui-choice-muted-opacity)')
    expect(checkbox.querySelector('[data-slot="choice-secondary"]').getAttribute('class')).toContain('ui:opacity-(--ui-choice-muted-opacity)')
    fireEvent.click(checkbox)
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
  })

  it('read only (store closed, implementation notes): the real selection stays, nothing toggles, no gray block', () => {
    clear()
    const radio = renderSub(theme(), { option: single, suboption: single.suboptions[0], state: chosen, isReadOnly: true }).getByRole('radio')
    expect(radio).toHaveAttribute('aria-checked', 'true')
    expect(radio).toHaveAttribute('aria-disabled', 'true')
    expect(radio.getAttribute('class')).not.toContain('ui:data-disabled:opacity')
    fireEvent.click(radio)
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
  })

  it('read only blocks the stepper and the halves too', () => {
    const utils = renderSub(theme(), {
      option: { ...multi, with_half_option: true },
      suboption: multi.suboptions[2],
      state: chosen,
      isReadOnly: true
    })
    expect(utils.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    expect(utils.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    utils.getAllByRole('radio').filter((radio) => radio.getAttribute('data-appearance') === 'segment').forEach((radio) => expect(radio).toHaveAttribute('aria-disabled', 'true'))
  })
})

describe('ProductOptionSubOption: halves (a segmented RadioGroup of the design system)', () => {
  const pizza = { ...multi, with_half_option: true }
  const renderHalves = (t = theme(), props = {}) => renderSub(t, { option: pizza, suboption: multi.suboptions[2], state: chosen, ...props })
  const bar = (utils) => utils.getByRole('radiogroup', { name: 'Olive' })
  const halfRadios = (utils) => Array.from(bar(utils).querySelectorAll('[role="radio"]'))

  it('the halves are in the row\'s end slot, on a line of their own, and a click on them does not toggle the row', () => {
    clear()
    const utils = renderHalves()
    expect(utils.getByRole('checkbox').querySelector('[data-slot=choice-end]')).toContainElement(bar(utils))
    fireEvent.click(halfRadios(utils)[0])
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
  })

  it('a radiogroup named by the sub-option with left / whole / right radios and the whole one checked', () => {
    const utils = renderHalves()
    const radios = halfRadios(utils)
    expect(radios.map(radio => radio.textContent)).toEqual(['Left half', 'Whole', 'Right half'])
    expect(radios.map(radio => radio.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(bar(utils).getAttribute('data-variant')).toBe('pill')
  })

  it('the glyphs by name: the left half is the solid-left CircleHalf, the whole one the filled Circle, the right one the CircleHalf turned', () => {
    const radios = halfRadios(renderHalves())
    expect(radios[0].querySelector('svg.lucide-circle-half')).not.toBeNull()
    expect(radios[1].querySelector('svg.lucide-circle')).toHaveAttribute('fill', 'currentColor')
    expect(radios[2].querySelector('svg.lucide-circle-half')).not.toBeNull()
    // the right half is the left one turned, only through its wrapper
    expect(window.getComputedStyle(radios[0].querySelector('svg').parentElement).transform).not.toBe('rotate(180deg)')
    expect(window.getComputedStyle(radios[2].querySelector('svg').parentElement).transform).toBe('rotate(180deg)')
    // decoration: the glyphs say nothing to assistive technology
    radios.forEach((radio) => expect(radio.querySelector('svg')).toHaveAttribute('aria-hidden', 'true'))
  })

  it('choosing a half moves the position and does not toggle the row', () => {
    clear()
    const utils = renderHalves()
    const [left, , right] = halfRadios(utils)
    fireEvent.click(left)
    expect(handlers.changePosition).toHaveBeenCalledWith('left')
    fireEvent.click(right)
    expect(handlers.changePosition).toHaveBeenCalledWith('right')
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
  })

  it('the arrows move to the neighbor half', async () => {
    const utils = renderHalves()
    halfRadios(utils)[1].focus()
    await act(async () => { fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' }) })
    expect(document.activeElement).toBe(halfRadios(utils)[2])
  })

  it('a slot without a style follows the default style of the group\'s tabs (product_option.scope.tabs)', () => {
    const t = themeWithValues((values) => {
      const tabs = values.components.tabs
      values.components.product_option = {
        ...values.components.product_option,
        slots: { ...values.components.product_option.slots, halves: { component: 'tabs', size: 'sm', variant: null } },
        scope: {
          tabs: {
            ...tabs,
            base: { ...tabs.base, variant: 'plain' },
            variants: { ...tabs.variants, plain: { ...tabs.variants.plain, gap: 17 }, pill: { ...tabs.variants.pill, gap: 3 } }
          }
        }
      }
      return values
    })
    // plain (the group's default style), not pill
    const group = bar(renderHalves(t))
    expect(group).toHaveAttribute('data-variant', 'plain')
    expect(vars(group)['--ui-tabs-gap']).toBe('17px')
  })

  it('the halves slot decides the size and the style', () => {
    const t = themeWithValues((values) => {
      values.components.product_option = {
        ...values.components.product_option,
        slots: { ...values.components.product_option.slots, halves: { component: 'tabs', size: 'lg', variant: 'underline' } }
      }
      return values
    })
    const big = bar(renderHalves(t))
    expect(big).toHaveAttribute('data-variant', 'underline')
    const height = vars(big)['--ui-tabs-height']
    cleanup()
    expect(height).not.toBe(vars(bar(renderHalves(theme())))['--ui-tabs-height'])
  })

  it('read only blocks the halves: every radio says disabled and none chooses', () => {
    clear()
    const utils = renderHalves(theme(), { isReadOnly: true })
    halfRadios(utils).forEach((radio) => expect(radio).toHaveAttribute('aria-disabled', 'true'))
    fireEvent.click(halfRadios(utils)[0])
    expect(handlers.changePosition).not.toHaveBeenCalled()
  })
})

describe('ProductOptionSubOption: inside a SubOptionRadioGroup (what ProductOption puts around a single choice)', () => {
  const renderGroup = (selectedId, rowProps = {}) => renderWithProviders(
    <SubOptionRadioGroup aria-label='Size' value={selectedId}>
      {single.suboptions.map((suboption) => (
        <ProductOptionSubOption key={suboption.id} option={single} suboption={suboption} state={selectedId === suboption.id ? chosen : { selected: false, quantity: 0, position: 'whole' }} {...rowProps} />
      ))}
    </SubOptionRadioGroup>,
    { theme: theme() }
  )

  it('one radiogroup for the option, named by it: the rows make none of their own', () => {
    const utils = renderGroup(21)
    expect(utils.getAllByRole('radiogroup')).toHaveLength(1)
    const group = utils.getByRole('radiogroup', { name: 'Size' })
    const radios = utils.getAllByRole('radio')
    radios.forEach((radio) => expect(group).toContainElement(radio))
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false'])
  })

  it('a click on an unselected row chooses it once; one on the selected row unselects it once', () => {
    clear()
    const utils = renderGroup(21)
    fireEvent.click(utils.getByRole('radio', { name: 'Large' }))
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
    clear()
    fireEvent.click(utils.getByRole('radio', { name: 'Small' }))
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('the arrows move the focus to the next radio, and the group\'s change (what an arrow does in a browser: a click on the radio\'s hidden input) chooses it with its own handler', async () => {
    clear()
    const utils = renderGroup(21)
    utils.getByRole('radio', { name: 'Small' }).focus()
    await act(async () => { fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' }) })
    expect(utils.getByRole('radio', { name: 'Large' })).toHaveFocus()
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
    fireEvent.click(utils.container.querySelectorAll('input[type="radio"]')[1])
    expect(handlers.toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('a row sold out is not chosen by the group nor by a click', () => {
    clear()
    const utils = renderGroup(21, { isSoldOut: true })
    fireEvent.click(utils.getByRole('radio', { name: 'Large' }))
    fireEvent.click(utils.container.querySelectorAll('input[type="radio"]')[1])
    expect(handlers.toggleSelect).not.toHaveBeenCalled()
  })
})

describe('ProductOptionSubOption: the "+ price" (visibility product.options.price)', () => {
  const priced = { id: 31, name: 'Bacon', price: 2 }
  it('shown by default; hidden by the key, the name stays', () => {
    const shown = renderSub(themeWithValues(), { option: multi, suboption: priced })
    expect(shown.getByText('+ $2')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderSub(themeWithValues((values) => {
      values.visibility['product.options.price'] = false
      return values
    }), { option: multi, suboption: priced })
    expect(hidden.queryByText('+ $2')).toBeNull()
    expect(hidden.getByText('Bacon')).toBeInTheDocument()
  })
})
