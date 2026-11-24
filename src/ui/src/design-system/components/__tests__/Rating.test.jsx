import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Rating, RatingScale, starFill, thumbsRating } from '../Rating'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables and behavior; how it
// looks (size, hit area, focus ring, RTL) is the design spec's (e2e/design/pieces-rating.spec.js).
// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const theme = (id) => THEMES.find((entry) => entry.id === id).theme
const defaults = theme('defaults')
const draw = (element, current = defaults) => render(<ThemeProvider theme={current}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const name = (n, of) => `${n} of ${of} stars`
// the base Icon draws starFilledAi solid (FILLED_ICONS: fill=currentColor) and starOutline at the stroke
const FILLED = 'svg[fill="currentColor"]'
const OUTLINE = 'svg:not([fill="currentColor"])'

describe.each(['defaults', 'cafe', 'grill'])('Rating in %s', (id) => {
  const current = theme(id)

  it('writes components.rating of its size on its own element', () => {
    const { getByRole } = draw(<Rating value={3} size='lg' label='3 of 5 stars' />, current)
    const group = getByRole('img')
    expect(vars(group)).toEqual(componentVars(current, 'rating', { size: 'lg' }))
    expect(vars(group)['--ui-rating-icon-size']).toBe(current.css.components.rating.sizes.lg.icon_size)
  })

  it('an unknown size is md', () => {
    const { getByRole } = draw(<Rating label='x' size='huge' />, current)
    expect(vars(getByRole('img'))['--ui-rating-icon-size']).toBe(current.css.components.rating.sizes.md.icon_size)
  })
})

describe('Rating shown', () => {
  it('is one image named by its label, its stars hidden', () => {
    const { getByRole, container } = draw(<Rating value={3.5} label='3.5 of 5 stars' size='sm' />)
    expect(getByRole('img', { name: '3.5 of 5 stars' })).toBeInTheDocument()
    const stars = container.querySelectorAll('[data-slot=rating-star]')
    expect(stars).toHaveLength(5)
    stars.forEach((star) => expect(star).toHaveAttribute('aria-hidden', 'true'))
    expect(container.querySelector('input, [role=radio]')).toBeNull()
  })

  it('is named by optionLabel when it has no label', () => {
    const { getByRole } = draw(<Rating value={4} optionLabel={name} />)
    expect(getByRole('img', { name: '4 of 5 stars' })).toBeInTheDocument()
  })

  it('fills the stars to the value, a half one cut to its part', () => {
    const { container } = draw(<Rating value={3.5} label='x' />)
    const stars = container.querySelectorAll('[data-slot=rating-star]')
    expect(stars[2].querySelector(FILLED)).toBeTruthy()
    expect(stars[2].querySelector(OUTLINE)).toBeNull()
    expect(stars[3].querySelector('[data-slot=rating-cut]').style.width).toBe('50%')
    expect(stars[3].querySelector(`[data-slot=rating-cut] ${FILLED}`)).toBeTruthy()
    expect(stars[4].querySelector('[data-slot=rating-cut]')).toBeNull()
    expect(stars[4].querySelector(OUTLINE)).toBeTruthy()
  })

  it('cuts the half star from the inline start, so a right-to-left store fills it from its right', () => {
    const { container } = draw(<Rating value={3.5} label='x' />)
    const cut = container.querySelector('[data-slot=rating-cut]').getAttribute('class')
    expect(cut).toContain('ui:[inset-inline-start:0]')
    expect(cut).not.toMatch(/\bleft\b|\bright\b/)
  })

  it('empty_style filled: the empty stars are filled stars', () => {
    const filled = { ...defaults, css: { ...defaults.css, components: { ...defaults.css.components, rating: { ...defaults.css.components.rating, base: { ...defaults.css.components.rating.base, empty_style: 'filled' } } } } }
    const { container } = draw(<Rating value={0} label='x' />, filled)
    expect(container.querySelectorAll(OUTLINE)).toHaveLength(0)
    expect(container.querySelectorAll(FILLED)).toHaveLength(5)
  })

  it('reads every value from a variable: no literal in its classes', () => {
    const { container } = draw(<Rating value={3.5} label='x' />)
    const classes = Array.from(container.querySelectorAll('[class]')).map((el) => el.getAttribute('class')).join(' ')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px|\d+ms/i)
    expect(classes).toContain('ui:gap-(--ui-rating-gap)')
    expect(classes).toContain('ui:size-(--ui-rating-icon-size)')
    expect(classes).toContain('ui:text-(color:--ui-rating-color)')
    expect(classes).toContain('ui:text-(color:--ui-rating-empty-color)')
  })
})

describe('Rating to vote', () => {
  const vote = (props) => draw(<Rating value={2} onChange={() => {}} label='Rate your order' optionLabel={name} {...props} />)

  it('is a radio group named by its label, each star a radio named by optionLabel', () => {
    const { getByRole, getAllByRole } = vote()
    expect(getByRole('radiogroup', { name: 'Rate your order' })).toBeInTheDocument()
    expect(getAllByRole('radio')).toHaveLength(5)
    expect(getByRole('radio', { name: '2 of 5 stars' })).toHaveAttribute('aria-checked', 'true')
    expect(getByRole('radio', { name: '3 of 5 stars' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the star picked, and only with a different one', () => {
    const onChange = vi.fn()
    const { getByRole } = vote({ onChange })
    fireEvent.click(getByRole('radio', { name: '4 of 5 stars' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBe(4)
    fireEvent.click(getByRole('radio', { name: '2 of 5 stars' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('fills the stars up to the vote', () => {
    const Controlled = () => {
      const [value, setValue] = useState(1)
      return <Rating value={value} onChange={setValue} label='Rate' optionLabel={name} />
    }
    const { getByRole, container } = draw(<Controlled />)
    expect(container.querySelectorAll(FILLED)).toHaveLength(1)
    fireEvent.click(getByRole('radio', { name: '3 of 5 stars' }))
    expect(getByRole('radio', { name: '3 of 5 stars' })).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelectorAll(FILLED)).toHaveLength(3)
  })

  it('the arrows move the focus along the stars (and choose, in the browser spec)', async () => {
    const { getByRole } = vote()
    const press = async (key) => { await act(async () => { fireEvent.keyDown(document.activeElement, { key }) }) }
    getByRole('radio', { name: '2 of 5 stars' }).focus()
    await press('ArrowRight')
    expect(document.activeElement).toBe(getByRole('radio', { name: '3 of 5 stars' }))
    await press('ArrowLeft')
    expect(document.activeElement).toBe(getByRole('radio', { name: '2 of 5 stars' }))
  })

  it('in a right-to-left store the arrows follow the eye', async () => {
    const { getByRole } = draw(<Rating value={2} onChange={() => {}} label='Rate' optionLabel={name} />, { ...defaults, rtl: true })
    getByRole('radio', { name: '2 of 5 stars' }).focus()
    await act(async () => { fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' }) })
    expect(document.activeElement).toBe(getByRole('radio', { name: '3 of 5 stars' }))
  })

  it('optionProps adds attributes to each radio', () => {
    const { container } = vote({ optionProps: (value) => ({ 'data-doc-control': `star-${value}` }) })
    expect(container.querySelector('[data-doc-control="star-5"]')).toHaveAttribute('role', 'radio')
  })

  it('disabled: no vote, the theme\'s disabled look', () => {
    const onChange = vi.fn()
    const { getByRole } = vote({ onChange, disabled: true })
    fireEvent.click(getByRole('radio', { name: '4 of 5 stars' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(getByRole('radio', { name: '4 of 5 stars' }).getAttribute('class')).toContain('ui:data-disabled:opacity-(--ot-opacity-disabled)')
  })

  it('reserves a 44 px touch area per star (phone and coarse pointer) around the painted star', () => {
    const { getByRole } = vote()
    const radio = getByRole('radio', { name: '2 of 5 stars' })
    const cell = radio.parentElement.getAttribute('class')
    for (const media of ['max-mobile', 'pointer-coarse']) {
      expect(cell).toContain(`ui:${media}:min-h-[44px]`)
      expect(cell).toContain(`ui:${media}:min-w-[44px]`)
    }
    // its hit area fills the cell, not the star, and the radio is the star (so the focus ring is)
    expect(radio.getAttribute('class')).toContain('ui:after:inset-none')
    expect(radio.getAttribute('class')).not.toContain('ui:relative')
  })

  it('the row to vote counts its cells for the width it may take, and never wider than its room', () => {
    const { getByRole } = vote()
    const group = getByRole('radiogroup')
    expect(group.style.getPropertyValue('--ui-rating-count')).toBe('5')
    const row = group.getAttribute('class')
    expect(row).toContain('ui:w-full')
    expect(row).toContain('ui:justify-between')
    expect(row).toContain('ui:[--ui-rating-cell-floor:var(--ui-rating-icon-size)]')
    for (const media of ['max-mobile', 'pointer-coarse']) expect(row).toContain(`ui:${media}:[--ui-rating-cell-floor:44px]`)
  })
})

describe('starFill and thumbsRating', () => {
  it('starFill: the part of each star', () => {
    expect([0, 1, 2, 3, 4].map((i) => starFill(3.5, i))).toEqual([1, 1, 1, 0.5, 0])
    expect(starFill('x', 0)).toBe(0)
  })

  it('thumbsRating: thumbs unless the theme says scale', () => {
    expect(thumbsRating(defaults)).toBe(defaults.css.components.rating_scale.base.mode !== 'scale')
    const scale = { ...defaults, css: { ...defaults.css, components: { ...defaults.css.components, rating_scale: { ...defaults.css.components.rating_scale, base: { ...defaults.css.components.rating_scale.base, mode: 'scale' } } } } }
    expect(thumbsRating(scale)).toBe(false)
  })
})

const options = [
  { value: 1, label: 'Terrible' },
  { value: 2, label: 'Bad' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' }
]

describe('RatingScale', () => {
  it('writes components.rating_scale on its own element', () => {
    const { getByRole } = draw(<RatingScale value={3} options={options} label='How was your order?' />)
    expect(vars(getByRole('radiogroup'))).toMatchObject(componentVars(defaults, 'rating_scale'))
  })

  it('is a radio group named by its label, one radio per option named by its text, the value checked', () => {
    const onChange = vi.fn()
    const { getByRole, getAllByRole } = draw(<RatingScale value={3} options={options} onChange={onChange} label='How was your order?' />)
    expect(getByRole('radiogroup', { name: 'How was your order?' })).toBeInTheDocument()
    expect(getAllByRole('radio')).toHaveLength(5)
    expect(getByRole('radio', { name: 'Okay' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(getByRole('radio', { name: 'Great' }))
    expect(onChange.mock.calls[0][0]).toBe(5)
  })

  it('fills the track up to the value and marks the middle points it has not passed', () => {
    const { container } = draw(<RatingScale value={3} options={options} label='x' />)
    const fill = container.querySelector('[style^="width"]')
    expect(fill.style.width).toBe('50%')
    // 2 and 3 passed; only 4 keeps its mark (the first and the last have none)
    expect(fill.parentElement.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
    expect(fill.getAttribute('class')).toContain('ui:bg-(--ui-rating-scale-fill)')
    expect(fill.parentElement.getAttribute('class')).toContain('ui:bg-(--ui-rating-scale-track)')
  })

  it('puts each option under its point: the first at the start, the last at the end, the picked one active', () => {
    const { getByRole } = draw(<RatingScale value={1} options={options} label='x' />)
    const first = getByRole('radio', { name: 'Terrible' })
    const middle = getByRole('radio', { name: 'Okay' })
    const last = getByRole('radio', { name: 'Great' })
    expect(first.style.left).toBe('0%')
    expect(middle.style.left).toBe('50%')
    expect(middle.style.transform).toBe('translateX(-50%)')
    expect(last.style.transform).toBe('translateX(-100%)')
    expect(first.getAttribute('class')).toContain('ui:data-checked:text-(color:--ui-rating-scale-label-active-color)')
    expect(first).toHaveAttribute('data-checked')
    expect(middle).not.toHaveAttribute('data-checked')
  })

  it('right to left: the points from the right', () => {
    const { getByRole } = draw(<RatingScale value={1} options={options} label='x' />, { ...defaults, rtl: true })
    const last = getByRole('radio', { name: 'Great' })
    expect(last.style.right).toBe('100%')
    expect(last.style.transform).toBe('translateX(100%)')
  })

  it('reserves a 44 px touch area per option and reads every value from a variable', () => {
    const { getByRole, container } = draw(<RatingScale value={1} options={options} label='x' />)
    const classes = Array.from(container.querySelectorAll('[class]')).map((el) => el.getAttribute('class')).join(' ')
    expect(getByRole('radio', { name: 'Okay' }).getAttribute('class')).toContain('ui:pointer-coarse:after:min-h-[44px]')
    expect(classes.replaceAll('[44px]', '')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px|\d+ms/i)
  })
})
