import { describe, expect, it } from 'vitest'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { dockOrderContextBar, orderContextBarControls, orderContextInHeader, orderContextVisible } from '../orderContextPlacement'

const themedWith = (keys = {}) => themeWithValues((values) => {
  Object.assign(values.visibility, keys)
  return values
})

describe('orderContextPlacement and the theme (visibility.order_context.*)', () => {
  it('by default the theme shows the three controls', () => {
    expect(orderContextVisible(themedWith())).toEqual({ type: true, moment: true, address: true })
  })

  it('the bar has the controls the theme shows that the row does not have', () => {
    expect(orderContextBarControls(390, themedWith())).toEqual({ type: true, moment: true, address: true })
    // below 1024px the three go together in the bar: none is in the header's row
    for (const width of [769, 820, 900, 1023]) expect(orderContextBarControls(width, themedWith()), `${width}px`).toEqual({ type: true, moment: true, address: true })
    expect(orderContextBarControls(1024, themedWith())).toEqual({ type: false, moment: false, address: false })
    expect(orderContextBarControls(390, themedWith({ 'order_context.address': false }))).toEqual({ type: true, moment: true, address: false })
  })

  it('without the theme the bar docks by the width alone', () => {
    expect(dockOrderContextBar(390)).toBe(true)
    expect(dockOrderContextBar(1024)).toBe(false)
  })

  it('with the theme, no dock when the theme hides every control left for the bar', () => {
    expect(dockOrderContextBar(390, themedWith())).toBe(true)
    const none = { 'order_context.order_type': false, 'order_context.moment': false, 'order_context.address': false }
    expect(dockOrderContextBar(390, themedWith(none))).toBe(false)
    // at 900px the bar has all three: hiding one leaves the others
    expect(dockOrderContextBar(900, themedWith({ 'order_context.address': false }))).toBe(true)
    expect(dockOrderContextBar(900, themedWith({ 'order_context.order_type': false }))).toBe(true)
    // from 1024px the row has them all: no bar
    expect(dockOrderContextBar(1024, themedWith())).toBe(false)
  })

  it('the order type also gates the address, on top of the theme', () => {
    expect(orderContextVisible(themedWith(), 1)).toEqual({ type: true, moment: true, address: true })
    expect(orderContextVisible(themedWith(), 2)).toEqual({ type: true, moment: true, address: false })
    // an unknown/undefined type keeps showing it (today's behaviour)
    expect(orderContextVisible(themedWith())).toEqual({ type: true, moment: true, address: true })
    // pickup (2): no type, no moment, no address left for the bar: no empty bar left behind
    expect(dockOrderContextBar(900, themedWith({ 'order_context.order_type': false, 'order_context.moment': false }), 2)).toBe(false)
  })
})

// implementation notesbetween 769 and 1023px the type sat in the header's row while the
// moment and the address fell to the bar, loose; now the three share one width
describe('orderContextPlacement: the three controls share one width', () => {
  it.each([769, 820, 900, 1023])('at %ipx the header\'s row has none and the bar has them all', (width) => {
    expect(orderContextInHeader(width)).toEqual({ type: false, moment: false, address: false })
    expect(dockOrderContextBar(width, themedWith(), 1)).toBe(true)
  })

  it.each([1024, 1280, 1440])('at %ipx the header\'s row has them all and there is no bar', (width) => {
    expect(orderContextInHeader(width)).toEqual({ type: true, moment: true, address: true })
    expect(dockOrderContextBar(width, themedWith(), 1)).toBe(false)
  })
})
