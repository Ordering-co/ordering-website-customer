import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { AddressOrderType, AddressOrderTypeUI, ORDER_TYPE_ICONS, OrderTypeQuickSwitch } from '../index'
import { injectedCss, rebuildTheme, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CapsuleButton, CapsuleRest, OrderContextCapsule } from '../styles'
import { LUCIDE_ICON_REGISTRY } from '../../Icon/lucideRegistry'
import { ORDER_CONTEXT_GLYPHS } from '../../Icon/orderContextGlyphs'

const orderStateMock = vi.hoisted(() => ({ loading: false, options: { type: 2, address: null } }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderStateMock]
}))

vi.mock('~components/components/OrderTypeControl', () => ({
  OrderTypeControl: ({ UIComponent, ...rest }) => (
    <UIComponent
      handleChangeOrderType={vi.fn()}
      configTypes={[1, 2]}
      typeSelected={1}
      orderTypes={[
        { value: 1, text: 'DELIVERY', textDisplay: 'Delivery' },
        { value: 2, text: 'PICKUP', textDisplay: 'Pickup' }
      ]}
      setOrderTypeValue={vi.fn()}
      hideOrderTypes={false}
      {...rest}
    />
  )
}))

// the Select opens from the keyboard; jsdom has no PointerEvent: a mouse event that carries the pointer's fields
class FakePointerEvent extends MouseEvent {
  constructor (type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType
  }
}
beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent))
afterEach(() => vi.unstubAllGlobals())

describe('AddressOrderType', () => {
  it('renders order type options', () => {
    const { getByText } = renderWithProviders(<AddressOrderType />)
    expect(getByText('Delivery')).toBeInTheDocument()
    expect(getByText('Pickup')).toBeInTheDocument()
  })

  const ALL_TYPES = [
    { value: 1, text: 'Delivery', description: 'We bring your order to your door', icon: ORDER_TYPE_ICONS[1] },
    { value: 2, text: 'Pickup', description: 'Order ahead and pick it up at the store', icon: ORDER_TYPE_ICONS[2] },
    { value: 3, text: 'Eat in', description: 'Order ahead and enjoy it at the restaurant', icon: ORDER_TYPE_ICONS[3] },
    { value: 7, text: 'Catering Delivery', description: 'Food for groups, delivered to your event', icon: ORDER_TYPE_ICONS[7] },
    { value: 8, text: 'Catering Pickup', description: 'Food for groups, ready for you to pick up', icon: ORDER_TYPE_ICONS[8] }
  ]
  const renderTypes = (configTypes, typeSelected = 1, handleChangeOrderType = vi.fn(), theme) => renderWithProviders(
    <AddressOrderTypeUI
      orderTypes={ALL_TYPES}
      configTypes={configTypes}
      typeSelected={typeSelected}
      handleChangeOrderType={handleChangeOrderType}
    />,
    theme && { theme }
  )
  // the bar is a base RadioGroup segmented: a radio per type, a select segment per group
  const radio = (name) => screen.getByRole('radio', { name })
  const group = (name) => screen.getByRole('combobox', { name })
  const press = (key) => fireEvent.keyDown(document.activeElement, { key })
  const openGroup = async (name) => {
    group(name).focus()
    fireEvent.keyDown(group(name), { key: 'ArrowDown' })
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
    return list
  }
  const gone = () => waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

  it('no order type to choose (the configuration loading, or none allowed): no controls, not an empty box', () => {
    for (const configTypes of [[], [6]]) {
      const { container, unmount } = renderTypes(configTypes)
      expect(container.querySelector('[data-doc-section="header-order-types"]')).toBeNull()
      expect(container.querySelector('button')).toBeNull()
      expect(screen.queryByRole('radiogroup')).toBeNull()
      unmount()
    }
  })

  it('the bar is a radio group named Order type: one type of each group is two radios, no dropdown nor chevron', () => {
    renderTypes([1, 2])
    expect(screen.getByRole('radiogroup', { name: 'Order type' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(radio('Delivery')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Pickup')).toHaveAttribute('aria-checked', 'false')
    expect(radio('Delivery').querySelector('svg.lucide-chevron-down')).toBeNull()
  })

  it('the bar sits in the capsule: it paints no box of its own', () => {
    renderTypes([1, 2])
    const bar = screen.getByRole('radiogroup').getAttribute('class')
    expect(bar).not.toContain('ui:bg-(--ui-tabs-background)')
    expect(bar).not.toContain('--ui-tabs-shadow')
    expect(bar).toContain('ui:[border-color:transparent]!')
  })

  it('a type keeps its full text as the title when "…" cuts it, and its name is capped at 18ch', () => {
    renderTypes([1, 2])
    expect(radio('Delivery')).toHaveAttribute('title', 'Delivery')
    const label = screen.getByText('Delivery')
    const cls = [...label.classList].pop()
    const css = injectedCss().replace(/\s+/g, '')
    expect(css).toMatch(new RegExp(`\\.${cls}\\{[^}]*max-width:min\\(100%,18ch\\)`))
  })

  it('a group with more than one available type is a select segment; the other stays a radio', () => {
    renderTypes([1, 2, 8])
    expect(radio('Delivery')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Pickup/ })).toBeNull()
    const pickup = group('Pickup')
    expect(pickup.getAttribute('data-variant')).toBe('segment')
    expect(pickup.querySelector('svg.lucide-chevron-down')).not.toBeNull()
    expect(screen.queryByText('Catering Pickup')).toBeNull()
  })

  it('catering delivery available: delivery is a select segment too, and lists its types', async () => {
    renderTypes([1, 7, 2, 3])
    expect(group('Delivery').querySelector('svg.lucide-chevron-down')).not.toBeNull()
    await openGroup('Delivery')
    expect(screen.getByRole('option', { name: /Catering Delivery/ })).toBeInTheDocument()
  })

  // the header's order type slot (size, variant) on the bar
  // its tabs, so both agree
  const slotTheme = (slot) => themeWithValues((values) => {
    values.components.tabs = {
      base: { variant: 'pill', text: { size: 14, line: 1.43, weight: 500 }, icon_gap: 4, animated: false, speed: 200 },
      sizes: {
        sm: { height: 32, padding_x: 8, icon_size: 16 },
        md: { height: 40, padding_x: 12, icon_size: 20 },
        lg: { height: 48, padding_x: 16, icon_size: 24 }
      },
      variants: {
        pill: { background: '#F8F9FA', border: { width: 1, color: '#2F3032', style: 'solid' }, radius: 10, shadow: null, inset: 4, gap: 2, tab_radius: 6, tab_border: null, active_background: '#FFEBE0', active: '#FF5500', inactive: '#616161' },
        underline: { background: 'transparent', baseline: { width: 1, color: '#E9ECEF', style: 'solid' }, gap: 12, indicator: '#FF5500', indicator_thickness: 2, indicator_length: 'full', active: '#000000', inactive: '#616161' },
        plain: { background: 'transparent', gap: 8, active: '#000000', inactive: '#616161' }
      }
    }
    values.components.header = {
      ...values.components.header,
      slots: { ...(values.components.header?.slots || {}), order_type: { component: 'tabs', ...slot } }
    }
    return values
  })
  const renderWithTheme = (theme) => renderTypes([1, 2], 1, vi.fn(), theme)

  it('the bar takes the slot size and variant (header.slots.order_type)', () => {
    renderWithTheme(slotTheme({ size: 'lg', variant: 'underline' }))
    const bar = screen.getByRole('radiogroup')
    expect(bar).toHaveAttribute('data-variant', 'underline')
    expect(bar.style.getPropertyValue('--ui-tabs-height')).toBe('48px')
    expect(bar.style.getPropertyValue('--ui-tabs-gap')).toBe('12px')
    expect(radio('Delivery').style.getPropertyValue('--ui-tabs-height')).toBe('')
  })

  it('pill (md): the bar takes the md height of the tabs and its segments the pill radius', () => {
    renderWithTheme(slotTheme({ size: 'md', variant: 'pill' }))
    const bar = screen.getByRole('radiogroup')
    expect(bar).toHaveAttribute('data-variant', 'pill')
    expect(bar.style.getPropertyValue('--ui-tabs-height')).toBe('40px')
  })

  it('the header\'s own tabs (header.scope.tabs) over the global ones', () => {
    const theme = rebuildTheme(slotTheme({ size: 'md', variant: 'plain' }), (values) => {
      const global = values.components.tabs
      values.components.header.scope = { tabs: { ...global, variants: { ...global.variants, plain: { ...global.variants.plain, gap: 24 } } } }
    })
    renderWithTheme(theme)
    expect(screen.getByRole('radiogroup').style.getPropertyValue('--ui-tabs-gap')).toBe('24px')
  })

  // implementation notesswitching order type with no address used to also open this
  // component's own "Address Form" modal on top of the Header's — the
  // Header is the single owner of that modal (require_order_address).
  describe('switching order type with no address opens no modal here', () => {
    let originalConfig

    beforeEach(() => {
      originalConfig = window.__CONFIG__
      window.__CONFIG__ = {}
    })

    afterEach(() => {
      window.__CONFIG__ = originalConfig
    })

    // handleChangeOrderType resolves on a later microtask (it is awaited
    // by the segment's callback), so the modal — when the bug is present —
    // only appears after that continuation runs. A macrotask tick inside
    // act() drains the whole microtask queue first. The modal also renders
    // through a portal onto document.body, so dialogs are queried from the
    // full document.
    const clickAndFlush = async (button) => {
      await act(async () => {
        fireEvent.click(button)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }

    it('Pickup -> Delivery: only the callback runs, no modal (the Header owns the single modal)', async () => {
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2], 2, handleChangeOrderType)
      await clickAndFlush(radio('Delivery'))
      expect(handleChangeOrderType).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderType).toHaveBeenCalledWith(1)
      expect(screen.queryByText('Address Form')).toBeNull()
      expect(document.querySelectorAll('[role="dialog"]').length).toBe(0)
    })

    it('Delivery -> Pickup: opens nothing either', async () => {
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2], 1, handleChangeOrderType)
      await clickAndFlush(radio('Pickup'))
      expect(handleChangeOrderType).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderType).toHaveBeenCalledWith(2)
      expect(screen.queryByText('Address Form')).toBeNull()
      expect(document.querySelectorAll('[role="dialog"]').length).toBe(0)
    })
  })

  describe('a single allowed type', () => {
    it('is a label (icon + name), not a control', () => {
      const { getByText, container } = renderTypes([2])
      expect(getByText('Pickup')).toBeInTheDocument()
      expect(container.querySelector('button')).toBeNull()
      expect(container.querySelector('svg.lucide-shopping-bag')).toBeInTheDocument()
      expect(screen.queryByRole('radiogroup')).toBeNull()
    })
  })

  describe('the order type icons (the design system\'s Lucide, one family)', () => {
    it('every order type has an icon of the registry', () => {
      Object.entries(ORDER_TYPE_ICONS).forEach(([, name]) => {
        expect(LUCIDE_ICON_REGISTRY[name]).toBeTruthy()
      })
      // the ones that share a glyph keep sharing it (catering is its base type's)
      // the entry chunk's nine glyphs are the registry's own (a name moves in one place only)
      Object.entries(ORDER_CONTEXT_GLYPHS).forEach(([name, glyph]) => expect(LUCIDE_ICON_REGISTRY[name]).toBe(glyph))
      Object.values(ORDER_TYPE_ICONS).forEach((name) => expect(ORDER_CONTEXT_GLYPHS[name]).toBeTruthy())
      expect(ORDER_TYPE_ICONS[7]).toBe(ORDER_TYPE_ICONS[1])
      expect(ORDER_TYPE_ICONS[8]).toBe(ORDER_TYPE_ICONS[2])
    })

    it('the segments, the list\'s options and their check are decorative Lucide icons', async () => {
      renderTypes([1, 2, 8])
      expect(radio('Delivery').querySelector('svg.lucide-truck')).toHaveAttribute('aria-hidden', 'true')
      expect(group('Pickup').querySelector('svg.lucide-shopping-bag')).toHaveAttribute('aria-hidden', 'true')
      await openGroup('Pickup')
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
      options.forEach((option) => {
        expect(option.querySelector('svg.lucide-shopping-bag')).not.toBeNull()
        expect(option.querySelector('svg.lucide-check')).not.toBeNull()
      })
    })
  })

  describe('selection and ARIA', () => {
    it('the chosen single type is the checked radio, and the group segment is not marked', () => {
      renderTypes([1, 2, 8], 1)
      expect(radio('Delivery')).toHaveAttribute('aria-checked', 'true')
      expect(group('Pickup')).not.toHaveAttribute('data-checked')
    })

    it('a chosen type of a group marks its segment and no radio is checked', () => {
      renderTypes([1, 2, 8], 8)
      expect(group('Catering Pickup')).toHaveAttribute('data-checked')
      expect(radio('Delivery')).toHaveAttribute('aria-checked', 'false')
    })

    it('the group segment is a combobox with a listbox of options, the chosen one selected, each with its icon and description', async () => {
      renderTypes([1, 2, 8], 2)
      const pickup = group('Pickup')
      expect(pickup).toHaveAttribute('aria-haspopup', 'listbox')
      expect(pickup).toHaveAttribute('aria-expanded', 'false')
      await openGroup('Pickup')
      expect(pickup).toHaveAttribute('aria-expanded', 'true')
      const [chosen, other] = screen.getAllByRole('option')
      expect(chosen).toHaveAttribute('aria-selected', 'true')
      expect(chosen).toHaveTextContent('Order ahead and pick it up at the store')
      expect(other).toHaveAttribute('aria-selected', 'false')
      expect(other).toHaveAccessibleName(/Catering Pickup/)
    })

    it('a type of the list is reported when chosen', async () => {
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2, 8], 2, handleChangeOrderType)
      await openGroup('Pickup')
      press('ArrowDown')
      await waitFor(() => expect(screen.getByRole('option', { name: /Catering Pickup/ }).hasAttribute('data-highlighted')).toBe(true))
      press('Enter')
      await gone()
      await waitFor(() => expect(handleChangeOrderType).toHaveBeenCalledWith(8))
    })
  })

  describe('keyboard', () => {
    it('two stops of Tab: the radios (the chosen one, not the first) and the group\'s select', () => {
      renderTypes([1, 2, 8], 1)
      expect(radio('Delivery')).toHaveAttribute('tabindex', '0')
      expect(group('Pickup')).not.toHaveAttribute('tabindex', '-1')
    })

    it('Enter/Space/ArrowDown on the segment opens the list, with the focus on the chosen option', async () => {
      renderTypes([1, 2, 8], 2)
      await openGroup('Pickup')
      expect(document.activeElement).toBe(screen.getAllByRole('option')[0])
    })

    it('ArrowDown/Up move between options; Enter picks and closes', async () => {
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2, 3, 8], 2, handleChangeOrderType)
      await openGroup('Pickup')
      press('ArrowDown')
      await waitFor(() => expect(screen.getByRole('option', { name: /Eat in/ }).hasAttribute('data-highlighted')).toBe(true))
      press('ArrowDown')
      await waitFor(() => expect(screen.getByRole('option', { name: /Catering Pickup/ }).hasAttribute('data-highlighted')).toBe(true))
      press('Enter')
      await gone()
      await waitFor(() => expect(handleChangeOrderType).toHaveBeenCalledWith(8))
    })

    it('Escape closes the list and returns the focus to the segment', async () => {
      renderTypes([1, 2, 8])
      await openGroup('Pickup')
      press('Escape')
      await gone()
      await waitFor(() => expect(document.activeElement).toBe(group('Pickup')))
    })

    // M1: the arrows only move the focus; choosing a type is deliberate (Enter / Space / click)
    it('the arrows move the focus between the radios without choosing: Enter and Space choose', async () => {
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2], 1, handleChangeOrderType)
      radio('Delivery').focus()
      await act(async () => { fireEvent.keyDown(radio('Delivery'), { key: 'ArrowRight' }) })
      expect(document.activeElement).toBe(radio('Pickup'))
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
      expect(handleChangeOrderType).not.toHaveBeenCalled()
      await act(async () => { fireEvent.keyDown(radio('Pickup'), { key: 'Enter' }) })
      expect(handleChangeOrderType).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderType).toHaveBeenLastCalledWith(2)
      await act(async () => {
        fireEvent.keyDown(radio('Pickup'), { key: ' ' })
        fireEvent.keyUp(radio('Pickup'), { key: ' ' })
      })
      expect(handleChangeOrderType).toHaveBeenCalledTimes(2)
    })

    it.each([['LTR', false, 'ArrowRight', 'ArrowLeft'], ['RTL', true, 'ArrowLeft', 'ArrowRight']])(
      'in %s the arrows walk the radios and the group segments in the order they are seen, wrapping, and choose nothing',
      async (_, rtl, forward, back) => {
        const handleChangeOrderType = vi.fn()
        renderTypes([1, 2, 8], 1, handleChangeOrderType, rtl ? { ...themeWithValues(), rtl: true } : undefined)
        radio('Delivery').focus()
        await act(async () => { fireEvent.keyDown(document.activeElement, { key: forward }) })
        expect(document.activeElement).toBe(group('Pickup'))
        await act(async () => { fireEvent.keyDown(document.activeElement, { key: forward }) })
        expect(document.activeElement).toBe(radio('Delivery'))
        await act(async () => { fireEvent.keyDown(document.activeElement, { key: back }) })
        expect(document.activeElement).toBe(group('Pickup'))
        expect(screen.queryByRole('listbox')).toBeNull()
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
        expect(handleChangeOrderType).not.toHaveBeenCalled()
        // after the arrows Tab still enters the bar at the chosen radio, as a click would
        expect(radio('Delivery')).toHaveAttribute('aria-checked', 'true')
      }
    )
  })

  // M2: a group that does not hold the chosen type marks no option
  describe('a group that does not hold the chosen type', () => {
    it('keeps its label on the trigger and lists no option as selected; choosing the first one reports it', async () => {
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2, 8], 1, handleChangeOrderType)
      expect(group('Pickup')).not.toHaveAttribute('data-checked')
      await openGroup('Pickup')
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
      options.forEach((option) => expect(option).toHaveAttribute('aria-selected', 'false'))
      expect(options[0]).toHaveAccessibleName(/^Pickup/)
      fireEvent.click(options[0])
      await gone()
      await waitFor(() => expect(handleChangeOrderType).toHaveBeenCalledWith(2))
    })

    it('two groups never both show a selection: only the one with the chosen type does', async () => {
      renderTypes([1, 7, 2, 8], 2)
      await openGroup('Pickup')
      expect(screen.getAllByRole('option').filter((option) => option.getAttribute('aria-selected') === 'true')).toHaveLength(1)
      fireEvent.keyDown(document.activeElement, { key: 'Escape' })
      await gone()
      await openGroup('Delivery')
      expect(screen.getAllByRole('option').filter((option) => option.getAttribute('aria-selected') === 'true')).toHaveLength(0)
    })

    it('the quick switch with a type no longer allowed lists no option as selected, its trigger keeps the fallback label', async () => {
      renderWithProviders(
        <OrderTypeQuickSwitch
          ariaLabel='Order type'
          renderTrigger={(triggerProps, selected) => <a href='#order' data-testid='trigger' {...triggerProps}>{selected.text}</a>}
          orderTypes={ALL_TYPES.filter((type) => [2, 3].includes(type.value))}
          typeSelected={1}
          handleChangeOrderType={vi.fn()}
        />
      )
      expect(screen.getByTestId('trigger')).toHaveTextContent('Pickup')
      screen.getByTestId('trigger').focus()
      fireEvent.keyDown(screen.getByTestId('trigger'), { key: 'ArrowDown' })
      await screen.findByRole('listbox')
      screen.getAllByRole('option').forEach((option) => expect(option).toHaveAttribute('aria-selected', 'false'))
    })
  })

  describe('loading (orderState.loading): the switcher is disabled', () => {
    afterEach(() => {
      orderStateMock.loading = false
    })

    it('every radio and every select segment is disabled, and so is the group', () => {
      orderStateMock.loading = true
      renderTypes([1, 2, 8])
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
      expect(radio('Delivery')).toHaveAttribute('aria-disabled', 'true')
      expect(group('Pickup')).toBeDisabled()
    })

    it('a click while loading does not call handleChangeOrderType', () => {
      orderStateMock.loading = true
      const handleChangeOrderType = vi.fn()
      renderTypes([1, 2], 1, handleChangeOrderType)
      fireEvent.click(radio('Pickup'))
      expect(handleChangeOrderType).not.toHaveBeenCalled()
    })
  })

  // implementation notesthe header's capsule items are the base Button's capsule-item
  describe('the capsule\'s box is the theme\'s field box (fieldBoxProps)', () => {
    it('a group with the input\'s box classes and variables, and no legacy box rules', () => {
      renderWithProviders(<OrderContextCapsule aria-label='Your order' />, { theme: themeWithValues() })
      const capsule = screen.getByRole('group', { name: 'Your order' })
      expect(capsule.getAttribute('class')).toContain('ui:bg-(--ui-input-background)')
      expect(capsule.style.getPropertyValue('--ui-input-height')).not.toBe('')
    })
  })

  describe('the capsule\'s buttons are the base Button', () => {
    it('the address button is a capsule-item, the moment one takes the moment look and its label', () => {
      renderWithProviders(
        <>
          <CapsuleButton data-testid='address'><span>Main street</span></CapsuleButton>
          <CapsuleButton $moment data-testid='moment'><span>ASAP</span></CapsuleButton>
        </>
      )
      expect(screen.getByTestId('address')).toHaveAttribute('data-slot', 'button')
      expect(screen.getByTestId('address').getAttribute('class')).toContain('ui:flex-auto')
      expect(screen.getByTestId('moment').querySelector('div > span')).toHaveTextContent('ASAP')
      expect(screen.getByTestId('moment').getAttribute('class')).toContain('ui:shrink-0')
    })
  })

  describe('the quick switch lends the caller\'s trigger the select\'s behavior', () => {
    const renderSwitch = (handleChangeOrderType = vi.fn()) => renderWithProviders(
      <OrderTypeQuickSwitch
        ariaLabel='Order type'
        renderTrigger={(triggerProps, selected, open) => (
          <a href='#order' data-testid='trigger' data-open={open ? 'yes' : 'no'} {...triggerProps}>{selected.text}</a>
        )}
        orderTypes={ALL_TYPES}
        handleChangeOrderType={handleChangeOrderType}
      />
    )

    it('its trigger is the caller\'s own element, with no look of the piece, and opens a rich list of every type', async () => {
      renderSwitch()
      const trigger = screen.getByTestId('trigger')
      expect(trigger.tagName).toBe('A')
      expect(trigger.getAttribute('class')).toBeNull()
      expect(trigger.getAttribute('style')).toBeNull()
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      // a combobox is named by a label, not by its text
      expect(trigger).toHaveAccessibleName('Order type')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
      const list = await screen.findByRole('listbox')
      expect(screen.getByRole('option', { name: /Delivery/ })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Eat in/ })).toBeInTheDocument()
      expect(list.closest('[data-slot=select-content]')).toHaveAttribute('aria-label', 'Order type')
      expect(trigger).toHaveAttribute('data-open', 'yes')
    })

    it('choosing an option reports its type', async () => {
      const handleChangeOrderType = vi.fn()
      renderSwitch(handleChangeOrderType)
      const trigger = screen.getByTestId('trigger')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
      await screen.findByRole('listbox')
      await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
      for (let i = 0; i < 2; i++) press('ArrowDown')
      await waitFor(() => expect(screen.getByRole('option', { name: /Eat in/ }).hasAttribute('data-highlighted')).toBe(true))
      press('Enter')
      await waitFor(() => expect(handleChangeOrderType).toHaveBeenCalledWith(3))
    })
  })

  describe('the separator between the capsule\'s rows (stacked)', () => {
    const separatorCss = (theme) => {
      const { container } = renderWith(theme, <CapsuleRest $stacked data-testid='rest' />)
      const cls = [...container.firstChild.classList].pop()
      return injectedCss().replace(/\s+/g, '').match(new RegExp(`\\.${cls}\\{[^}]*\\}`, 'g')).join('')
    }

    it('is a line of the theme thin border (fixed, not the store identity box border)', () => {
      const theme = themeWithValues((values) => {
        values.tokens.border = { thin: 3, thick: 5 }
        return values
      })
      expect(separatorCss(theme)).toMatch(/border-top:3pxsolid/)
    })
  })

  // implementation notesPickup with ASAP and no address left the moment hugging the capsule's start edge
  describe('the moment alone on the stacked row', () => {
    it('spans the row and centers its content, only when stacked', () => {
      const rule = (props) => {
        const { container } = renderWith(themeWithValues(), <CapsuleRest {...props} />)
        const cls = [...container.firstChild.classList].pop()
        return injectedCss().replace(/\s+/g, '').match(new RegExp(`\\.${cls}>\\[data-doc-control='order-moment-open'\\]:only-child\\{[^}]*\\}`))?.[0]
      }
      expect(rule({ $stacked: true })).toMatch(/[{;]flex:11auto;[^}]*justify-content:center;/)
      expect(rule({})).toBeUndefined()
    })
  })
})
