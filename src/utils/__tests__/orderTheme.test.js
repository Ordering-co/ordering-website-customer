import { describe, expect, it } from 'vitest'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ORDER_DETAILS, ORDER_TRACKING, orderButtonProps, orderChipProps } from '../orderTheme'

const themed = themeWithValues((values) => {
  values.components.order_tracking.slots.survey_chip = { component: 'chip', size: 'sm' }
  return values
})

describe('orderTheme', () => {
  it('orderButtonProps: the slot\'s size, color and appearance (none with v1)', () => {
    expect(orderButtonProps(themed, ORDER_DETAILS, 'directions')).toEqual({ $size: 'md', $color: 'primary', $appearance: 'outline' })
  })

  it('orderChipProps: the size of a chip slot (none with v1)', () => {
    expect(orderChipProps(themed, ORDER_TRACKING, 'survey_chip')).toEqual({ $size: 'sm' })
  })
})
