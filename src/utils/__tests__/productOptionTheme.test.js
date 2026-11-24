import { describe, expect, it } from 'vitest'
import { buildAppTheme } from '../appTheme'
import { buildCompleteValues, buildLocalTheme, envelope } from './fixtures/themeFixtures'
import {
  collapsedMode,
  groupHasImages,
  isSingleChoice,
  nestingMode,
  optionLimitText,
  optionNestingLevels,
  optionStartsCollapsed,
  reservesImageBox,
  showsOptionImage,
  showsPrice,
  showsRequiredBadge,
  shownOptionError,
  suboptionMaxReached
} from '../productOptionTheme'

const local = buildLocalTheme()
const withBase = (base = {}) => {
  const values = buildCompleteValues()
  values.components.product_option.base = { ...values.components.product_option.base, ...base }
  return buildAppTheme(local, envelope(values))
}
const t = (key, fallback) => fallback

describe('product_option: collapsed', () => {
  const required = { min: 1, max: 1 }
  const optional = { min: 0, max: 3 }

  it('none: every group open', () => {
    const theme = withBase({ collapsed: 'none' })
    expect(optionStartsCollapsed(theme, required)).toBe(false)
    expect(optionStartsCollapsed(theme, optional)).toBe(false)
  })

  it('optional: the groups with min 0', () => {
    const theme = withBase({ collapsed: 'optional' })
    expect(optionStartsCollapsed(theme, required)).toBe(false)
    expect(optionStartsCollapsed(theme, optional)).toBe(true)
  })

  it('all: every group', () => {
    const theme = withBase({ collapsed: 'all' })
    expect(optionStartsCollapsed(theme, required)).toBe(true)
    expect(optionStartsCollapsed(theme, optional)).toBe(true)
  })

  it('an unknown mode is none', () => {
    expect(collapsedMode(withBase({ collapsed: 'some' }))).toBe('none')
  })
})

describe('product_option: nesting', () => {
  const extras = [{
    options: [
      { id: 1, suboptions: [{ id: 11 }, { id: 12 }] },
      { id: 2, respect_to: 11, suboptions: [{ id: 21 }] },
      { id: 3, respect_to: 21, suboptions: [{ id: 31 }] },
      { id: 4, respect_to: 31, suboptions: [{ id: 41 }] }
    ]
  }, {
    options: [{ id: 5, respect_to: 12, suboptions: [] }, { id: 6, respect_to: 999, suboptions: [] }]
  }]

  it('one level per respect_to, at most 2 (across extras); an unknown parent is flat', () => {
    expect(optionNestingLevels(extras)).toEqual({ 1: 0, 2: 1, 3: 2, 4: 2, 5: 1, 6: 0 })
  })

  it('a cycle does not loop', () => {
    const cyclic = [{ options: [{ id: 1, respect_to: 21, suboptions: [{ id: 11 }] }, { id: 2, respect_to: 11, suboptions: [{ id: 21 }] }] }]
    const levels = optionNestingLevels(cyclic)
    expect(levels[1]).toBeLessThanOrEqual(2)
    expect(levels[2]).toBeLessThanOrEqual(2)
  })

  it('no extras: nothing', () => {
    expect(optionNestingLevels(undefined)).toEqual({})
  })

  it.each(['line', 'indent', 'none'])('mode %s', (mode) => {
    expect(nestingMode(withBase({ nesting: mode }))).toBe(mode)
  })

  it('an unknown mode is line', () => {
    expect(nestingMode(withBase({ nesting: 'tree' }))).toBe('line')
  })
})

describe('product_option: images', () => {
  const withImages = { image: 'option.png', suboptions: [{ id: 1, image: 'a.png' }, { id: 2, image: '-' }, { id: 3 }] }
  const withoutImages = { image: '-', suboptions: [{ id: 1, image: '-' }, { id: 2, image: null }] }
  const onlyDisabled = { suboptions: [{ id: 1, image: 'a.png', enabled: false }, { id: 2 }] }

  it('a group with any image reserves the box on every row', () => {
    expect(groupHasImages(withImages)).toBe(true)
    expect(reservesImageBox(withBase(), withImages)).toBe(true)
  })

  it('a group without images (or whose image is on a hidden sub-option) reserves nothing', () => {
    expect(reservesImageBox(withBase(), withoutImages)).toBe(false)
    expect(reservesImageBox(withBase(), onlyDisabled)).toBe(false)
  })

  it('visibility product.options.image false: no images', () => {
    const values = buildCompleteValues()
    values.visibility['product.options.image'] = false
    const hidden = buildAppTheme(local, envelope(values))
    expect(reservesImageBox(hidden, withImages)).toBe(false)
    expect(showsOptionImage(hidden, withImages)).toBe(false)
  })

  it('the group image: only when it exists and images are visible; never in v1', () => {
    expect(showsOptionImage(withBase(), withImages)).toBe(true)
    expect(showsOptionImage(withBase(), withoutImages)).toBe(false)
  })
})

describe('product_option: texts', () => {
  it('the required badge only when min >= 1', () => {
    expect(showsRequiredBadge({ min: 1, max: 1 })).toBe(true)
    expect(showsRequiredBadge({ min: 2, max: 4 })).toBe(true)
    expect(showsRequiredBadge({ min: 0, max: 3 })).toBe(false)
    expect(showsRequiredBadge({})).toBe(false)
  })

  it('the limits as neutral text', () => {
    expect(optionLimitText(t, { min: 2, max: 2 })).toBe('Choose 2')
    expect(optionLimitText(t, { min: 1, max: 1 })).toBe('Choose 1')
    expect(optionLimitText(t, { min: 0, max: 3 })).toBe('Max. 3')
    expect(optionLimitText(t, { min: 1, max: 0 })).toBe('Min. 1')
    expect(optionLimitText(t, { min: 1, max: 3 })).toBe('Min. 1 - Max. 3')
    expect(optionLimitText(t, { min: 0, max: 0 })).toBe('')
  })

  it('a price of 0 shows nothing', () => {
    expect(showsPrice(0)).toBe(false)
    expect(showsPrice(null)).toBe(false)
    expect(showsPrice(1.5)).toBe(true)
  })
})

describe('product_option: choices', () => {
  it('a single choice is today\'s radio group', () => {
    expect(isSingleChoice({ min: 1, max: 1 })).toBe(true)
    expect(isSingleChoice({ min: 0, max: 1 })).toBe(false)
    expect(isSingleChoice({ min: 0, max: 3 })).toBe(false)
    expect(isSingleChoice({ min: 1, max: null })).toBe(false)
  })

  it('max reached: an unselected sub-option of a full group (as today\'s alert)', () => {
    const option = { min: 0, max: 2, suboptions: [{}, {}, {}] }
    expect(suboptionMaxReached({ option, state: { selected: false }, balance: 2 })).toBe(true)
    expect(suboptionMaxReached({ option, state: { selected: true }, balance: 2 })).toBe(false)
    expect(suboptionMaxReached({ option, state: { selected: false }, balance: 1 })).toBe(false)
    expect(suboptionMaxReached({ option: { min: 1, max: 1, suboptions: [{}, {}] }, state: { selected: false }, balance: 1 })).toBe(false)
    expect(suboptionMaxReached({ option: { with_half_option: true }, state: {}, usePizzaValidation: true })).toBe(true)
  })
})

describe('product_option: errors', () => {
  it('complete theme: only after the first "Add"', () => {
    const theme = withBase()
    expect(shownOptionError(theme, true, false)).toBe(false)
    expect(shownOptionError(theme, true, true)).toBe(true)
    expect(shownOptionError(theme, undefined, true)).toBe(undefined)
  })
})
