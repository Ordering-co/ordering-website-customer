import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ProductOption } from '../index'

// The controller passes its props through (the option is the test's)
vi.mock('~components/components/ProductOption', () => ({
  ProductOption: ({ UIComponent, ...rest }) => <UIComponent error={false} {...rest} />
}))

const ERROR = '#C00011'
const theme = (base = {}) => themeWithValues((values) => {
  values.components.product_option.base = {
    ...values.components.product_option.base,
    background: '#FAFAFA',
    border: { width: 1, color: '#DDDDDD', style: 'solid' },
    radius: 10,
    title: { size: 19, line: 1.26, weight: 700 },
    title_color: '#101010',
    description: { size: 13, line: 1.38, weight: 400 },
    description_color: '#707070',
    error: ERROR,
    nesting_line: { width: 2, color: '#ABABAB', style: 'solid' },
    ...base
  }
  values.components.badge.variants.neutral = { background: '#EEEEEE', color: '#222222' }
  values.components.badge.variants.danger = { background: '#FFE5E5', color: '#B00000' }
  return values
})

const required = { id: 1, name: 'Size', min: 1, max: 1, image: 'size.png' }
const optional = { id: 2, name: 'Extras', min: 0, max: 3 }

const renderOption = (t, props) => renderWithProviders(
  <ProductOption {...props}>
    <div data-testid='suboptions'>suboptions</div>
  </ProductOption>,
  { theme: t }
)

describe('ProductOption (components.product_option)', () => {
  it('the "Required" badge (neutral) only when min >= 1, the limits apart as neutral text', () => {
    const req = renderOption(theme(), { option: required })
    const badge = req.getByText('Required')
    expect(cssFor(badge)).toContain('background:#EEEEEE')
    expect(cssFor(badge)).toContain('color:#222222')
    const limit = req.getByText('Choose 1')
    expect(cssFor(limit)).toContain('color:#707070')
    expect(cssFor(limit)).toContain('font-size:13px')
    req.rerender(<ProductOption option={required} error requiredInvalid />)
    expect(cssFor(req.getByText('Required'))).toContain('background:#FFE5E5')
    req.unmount()

    const opt = renderOption(theme(), { option: optional })
    expect(opt.queryByText('Required')).toBeNull()
    expect(opt.getByText('Max. 3')).toBeInTheDocument()
  })

  it('uses the variant stored by the shop before the customer tries to add', () => {
    const stored = themeWithValues((values) => {
      values.components.product_option.slots.required.variant = 'warning'
      return values
    })
    const view = renderOption(stored, { option: required })
    expect(view.getByText('Required')).toHaveAttribute('data-doc-variant', 'warning')
  })

  it("the options' shadow fits inside the collapse's clip (room on its side)", () => {
    const t = themeWithValues((values) => {
      values.components.choice.base = { ...values.components.choice.base, shadow: { x: 3, y: 4, blur: 0, spread: 0, color: '#000000', opacity: 1 } }
      return values
    })
    const { getByTestId } = renderOption(t, { option: optional })
    expect(cssFor(getByTestId('suboptions').parentElement)).toContain('padding:0px 3px 4px 0px')
  })

  it('collapsed, the clip keeps no room: no edge of the options shows', () => {
    const t = themeWithValues((values) => {
      values.components.choice.base = { ...values.components.choice.base, shadow: { x: 3, y: 4, blur: 0, spread: 0, color: '#000000', opacity: 1 } }
      return values
    })
    const { getByTestId, getByRole } = renderOption(t, { option: optional })
    fireEvent.click(getByRole('button', { name: 'Extras' }))
    const css = cssFor(getByTestId('suboptions').parentElement)
    expect(css).toContain('max-height:0')
    expect(css).toContain('padding:0')
    expect(css).not.toContain('padding:0px 3px 4px 0px')
  })

  it('the group: its background, border, radius and title', () => {
    const { container, getByText } = renderOption(theme(), { option: optional })
    const group = container.querySelector('#id_2')
    const css = cssFor(group)
    expect(css).toContain('background:#FAFAFA')
    expect(css).toContain('border:1px solid #DDDDDD')
    expect(css).toContain('border-radius:10px')
    const title = cssFor(getByText('Extras').closest('h3'))
    expect(title).toContain('color:#101010')
    expect(title).toContain('font-size:19px')
  })

  it('a transparent background (in any spelling) and no border: no box, no background', () => {
    ;['transparent', 'rgba(0,0,0,0)', '#FFFFFF00'].forEach((background) => {
      const { container, unmount } = renderOption(theme({ background, border: null }), { option: optional })
      const css = cssFor(container.querySelector('#id_2'))
      expect(css, background).not.toContain('background:')
      expect(css, background).not.toContain('border:')
      unmount()
    })
    const { container } = renderOption(theme({ background: 'rgba(0,0,0,0.04)', border: null }), { option: optional })
    const css = cssFor(container.querySelector('#id_2'))
    expect(css).toContain('background:rgba(0,0,0,0.04)')
    expect(css).toContain('border:1px solid transparent')
  })

  // implementation notesthe reserve and the pulse's reach are named rules, fixed across theme scales
  it('the room of a borderless box and the pulse reach do not follow tokens.border.thin or tokens.space.md', () => {
    const scaled = themeWithValues((values) => {
      values.components.product_option.base = { ...values.components.product_option.base, background: 'rgba(0,0,0,0.04)', border: null, error: ERROR }
      values.tokens.border.thin = 4
      values.tokens.space.md = 20
      return values
    })
    const { container } = renderOption(scaled, { option: optional })
    expect(cssFor(container.querySelector('#id_2'))).toContain('border:1px solid transparent')
    const all = [...document.querySelectorAll('style')].map((node) => node.textContent).join('')
    expect(all).toMatch(/0 0 0 12px var\(--error-pulse-fade\)/)
  })

  it.each([
    ['none', false, false],
    ['optional', false, true],
    ['all', true, true]
  ])('collapsed %s: required starts collapsed %s, optional %s', (mode, requiredCollapsed, optionalCollapsed) => {
    const req = renderOption(theme({ collapsed: mode }), { option: required })
    expect(req.getByRole('button')).toHaveAttribute('aria-expanded', String(!requiredCollapsed))
    req.unmount()
    const opt = renderOption(theme({ collapsed: mode }), { option: optional })
    expect(opt.getByRole('button')).toHaveAttribute('aria-expanded', String(!optionalCollapsed))
  })

  it('the header toggles the group: its name is a real button in its heading (the keyboard), a click anywhere on the header too', () => {
    const utils = renderOption(theme({ collapsed: 'all' }), { option: optional })
    const toggle = utils.getByRole('button')
    expect(toggle.tagName).toBe('BUTTON')
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-controls', 'content_2')
    expect(toggle.closest('h3')).not.toBeNull()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(utils.container.querySelector('svg.lucide-chevron-down'))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('one chevron, chevronDown, whatever its state (it turns; no box around it)', () => {
    const utils = renderOption(theme({ collapsed: 'all' }), { option: optional })
    expect([...utils.container.querySelectorAll('svg.lucide')].map((icon) => icon.getAttribute('class').split(' ')[1])).toEqual(['lucide-chevron-down'])
    fireEvent.click(utils.getByRole('button'))
    expect([...utils.container.querySelectorAll('svg.lucide')].map((icon) => icon.getAttribute('class').split(' ')[1])).toEqual(['lucide-chevron-down'])
  })

  it('a group with an error always opens; its border and limits take the error color', () => {
    const utils = renderOption(theme({ collapsed: 'all' }), { option: required, error: true })
    expect(utils.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    expect(cssFor(utils.container.querySelector('#id_1'))).toContain(`border-color:${ERROR}`)
    expect(cssFor(utils.getByText('Choose 1'))).toContain(`color:${ERROR}`)
  })

  it('without an error shown, no error color', () => {
    const utils = renderOption(theme(), { option: required, error: false })
    expect(cssFor(utils.container.querySelector('#id_1'))).not.toContain(`border-color:${ERROR}`)
    expect(cssFor(utils.getByText('Choose 1'))).not.toContain(`color:${ERROR}`)
  })

  it('the group image: shown when it exists and images are visible (visibility product.options.image)', () => {
    const shown = renderOption(theme(), { option: required })
    expect(shown.container.querySelector('[src="size.png"]')).not.toBeNull()
    shown.unmount()
    const hidden = renderOption(themeWithValues((values) => { values.visibility['product.options.image'] = false; return values }), { option: required })
    expect(hidden.container.querySelector('[src="size.png"]')).toBeNull()
  })

  // The frame around the group: its first element
  const frameCss = (utils) => cssFor(utils.container.querySelector('#id_2').parentElement)

  it('nesting line: indented with the nesting_line rule', () => {
    const utils = renderOption(theme({ nesting: 'line' }), { option: optional, nestingLevel: 1 })
    const css = frameCss(utils)
    expect(css).toContain('border-inline-start:2px solid #ABABAB')
    expect(css).toContain('margin-inline-start:4px')
    expect(css).toContain('padding-inline-start:10px')
  })

  it('nesting line, level 2: deeper', () => {
    const utils = renderOption(theme({ nesting: 'line' }), { option: optional, nestingLevel: 2 })
    expect(frameCss(utils)).toContain('margin-inline-start:20px')
  })

  it('nesting indent: indented only', () => {
    const utils = renderOption(theme({ nesting: 'indent' }), { option: optional, nestingLevel: 1 })
    const css = frameCss(utils)
    expect(css).toContain('margin-inline-start:16px')
    expect(css).not.toContain('border-inline-start')
  })

  it('nesting none, or a top-level group: flat', () => {
    const none = renderOption(theme({ nesting: 'none' }), { option: optional, nestingLevel: 2 })
    expect(frameCss(none)).not.toContain('margin-inline-start')
    none.unmount()
    const top = renderOption(theme({ nesting: 'line' }), { option: optional, nestingLevel: 0 })
    expect(frameCss(top)).not.toContain('border-inline-start')
  })
})

// Opening a group scrolls it into view after its expand (100ms)
describe('ProductOption: opening a group scrolls it into view', () => {
  const rect = (top, height = 0) => () => ({ top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top })

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Another modal's dialog first in the document; the group inside its own
  // scrolling dialog
  const renderInDialogs = (t) => {
    const utils = renderWithProviders(
      <>
        <div className='popup-dialog' data-testid='other' style={{ overflowY: 'auto' }} />
        <div className='popup-dialog' data-testid='dialog' style={{ overflowY: 'auto' }}>
          <div>
            <ProductOption option={optional}>
              <div data-testid='suboptions'>suboptions</div>
            </ProductOption>
          </div>
        </div>
      </>,
      { theme: t }
    )
    const other = utils.getByTestId('other')
    const dialog = utils.getByTestId('dialog')
    other.scrollTo = vi.fn()
    dialog.scrollTo = vi.fn()
    other.getBoundingClientRect = rect(0, 800)
    dialog.getBoundingClientRect = rect(100, 600)
    dialog.scrollTop = 30
    utils.container.querySelector('#id_2').getBoundingClientRect = rect(500)
    return { ...utils, other, dialog }
  }

  it('in its own scroll container, its top right under the pinned row and the sticky bar', () => {
    const utils = renderInDialogs(theme({ collapsed: 'all' }))
    const pinned = document.createElement('div')
    pinned.style.position = 'fixed'
    pinned.getBoundingClientRect = rect(100, 70)
    const bar = document.createElement('nav')
    bar.setAttribute('data-sticky-top', '')
    Object.defineProperty(bar, 'offsetHeight', { configurable: true, value: 48 })
    utils.dialog.prepend(pinned, bar)

    fireEvent.click(utils.getByRole('button'))
    vi.advanceTimersByTime(100)
    // 30 scrolled + 500 - 100 (the dialog's top) - (70 pinned + 48 the bar)
    expect(utils.dialog.scrollTo).toHaveBeenCalledWith({ top: 312, behavior: expect.any(String) })
    expect(utils.other.scrollTo).not.toHaveBeenCalled()
  })

  it('without anything covering the top, its top at the container\'s top', () => {
    const utils = renderInDialogs(theme({ collapsed: 'all' }))
    fireEvent.click(utils.getByRole('button'))
    vi.advanceTimersByTime(100)
    expect(utils.dialog.scrollTo).toHaveBeenCalledWith({ top: 430, behavior: expect.any(String) })
  })

  it('closing does not scroll', () => {
    const utils = renderInDialogs(theme({ collapsed: 'none' }))
    fireEvent.click(utils.getByRole('button'))
    vi.advanceTimersByTime(100)
    expect(utils.dialog.scrollTo).not.toHaveBeenCalled()
  })
})

describe('ProductOption: the "Required" badge and the limits (visibility product.options.required_badge)', () => {
  it('shown by default; hidden by the key, the name stays', () => {
    const shown = renderOption(themeWithValues(), { option: required })
    expect(shown.getByText('Required')).toBeInTheDocument()
    expect(shown.getByText('Choose 1')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderOption(themeWithValues((values) => {
      values.visibility['product.options.required_badge'] = false
      return values
    }), { option: required })
    expect(hidden.queryByText('Required')).toBeNull()
    expect(hidden.queryByText('Choose 1')).toBeNull()
    expect(hidden.getByText('Size')).toBeInTheDocument()
  })
})
