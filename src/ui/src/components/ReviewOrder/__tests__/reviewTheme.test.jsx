import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder, professionalFixture } from '../../__tests__/helpers/ordersTestMocks'
import { injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { ReviewOrder } from '../index'
import { ReviewDriver } from '../../ReviewDriver'
import { ReviewProduct } from '../../ReviewProduct'
import { ReviewProfessional } from '../../ReviewProfessional'

// The review modals of a finished order: their contents with the theme
// (choice options, section headings, the progress scale).

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: (fn) => (event) => {
      event.preventDefault()
      fn()
    },
    register: () => null,
    errors: {},
    formState: { errors: {} }
  })
}))

vi.mock('~components/components/OrderReview', () => ({
  OrderReview: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={pastOrder}
      stars={{ quality: 5 }}
      formState={{ loading: false, result: null }}
      handleSendReview={vi.fn()}
      setStars={vi.fn()}
      {...rest}
    />
  )
}))

vi.mock('~components/components/ReviewDriver', () => ({
  ReviewDriver: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{ ...pastOrder, professional: professionalFixture }}
      dirverReviews={{ qualification: 5 }}
      formState={{ loading: false, result: null }}
      handleSendDriverReview={vi.fn()}
      setDriverReviews={vi.fn()}
      {...rest}
    />
  )
}))

vi.mock('~components/components/ReviewProduct', () => ({
  ReviewProduct: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={{ ...pastOrder, products: [[{ id: 1, product_id: 1, name: 'Burger' }]] }}
      formState={{ changes: [] }}
      handleChangeFormState={vi.fn()}
      handleSendProductReview={vi.fn()}
      {...rest}
    />
  )
}))

const completeTheme = themeWithValues()
const { tokens, components } = completeTheme.values
const choice = components.choice
const selectedBackground = choice.variants.default.states.selected.background

const render = (ui, theme) => renderWithProviders(ui, { theme })

describe('review modals', () => {
  it('order and driver: a heading below the modal title, like / dislike options of components.choice', () => {
    for (const [ui, title, control] of [
      [<ReviewOrder key='o' />, 'Rate the business', 'order-review-like'],
      [<ReviewDriver key='d' />, 'Rate your order', 'driver-review-like']
    ]) {
      const { getByRole, container, unmount } = render(ui, completeTheme)
      // the modal title is the dialog's heading (h2): its sections are h3
      expect(getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
      const like = container.querySelector(`[data-doc-control="${control}"]`)
      const dislike = getByRole('button', { name: 'Bad' })
      expect(like.tagName).toBe('BUTTON')
      expect(like).toHaveAttribute('type', 'button')
      expect(like).toHaveAttribute('aria-pressed', 'true')
      expect(like).toHaveAccessibleName('Good')
      expect(dislike).toHaveAttribute('aria-pressed', 'false')
      // no inline color: the option's colors are the theme's
      expect(like.style.color).toBe('')
      expect(like.style.getPropertyValue('--ui-choice-selected-background')).toBe(selectedBackground)
      expect(like).toHaveClass('ui:text-[length:var(--ot-icon-lg)]')
      expect(like).toHaveClass('ui:py-sm', 'ui:px-md')
      expect(dislike.style.getPropertyValue('--ui-choice-background')).toBe(choice.base.background)
      // the options apart by tokens.space
      const wrapper = container.querySelector('.rating-container').parentElement
      const cls = wrapper.className.split(' ').pop()
      const rule = injectedCss().split('}').filter((r) => r.includes(`.${cls} .rating-container{`)).join('}')
      expect(rule).toContain(`gap:${tokens.space.md}px`)
      unmount()
    }
  })

  it('product: the like is a selected choice option, the title a heading', () => {
    const { getByRole, container } = render(<ReviewProduct />, completeTheme)
    expect(getByRole('heading', { level: 3, name: 'Rate your item' })).toBeInTheDocument()
    const like = container.querySelector('[data-doc-control="product-review-like"]')
    const dislike = container.querySelector('[data-doc-control="product-review-dislike"]')
    expect(like.tagName).toBe('BUTTON')
    expect(like).toHaveAttribute('aria-pressed', 'true')
    expect(dislike).toHaveAttribute('aria-pressed', 'false')
    expect(like.style.getPropertyValue('--ui-choice-selected-background')).toBe(selectedBackground)
  })

  it('professional: the scale is the track and fill of components.rating_scale', () => {
    const { container } = render(<ReviewProfessional />, completeTheme)
    const fill = container.querySelector('[style^="width"]')
    const scale = fill.closest('[data-slot=rating-scale]')
    expect(scale.style.getPropertyValue('--ui-rating-scale-track')).toBe(`${components.rating_scale.base.track}`)
    expect(scale.style.getPropertyValue('--ui-rating-scale-fill')).toBe(`${components.rating_scale.base.fill}`)
    expect(fill.parentElement.className).toContain('ui:bg-(--ui-rating-scale-track)')
    expect(fill.className).toContain('ui:bg-(--ui-rating-scale-fill)')
    // the rating (5) fills the whole track
    expect(fill.style.width).toBe('100%')
  })

  it('professional: the scale is a group of radios named by its question, the rating checked', () => {
    const { getByRole } = render(<ReviewProfessional />, completeTheme)
    expect(getByRole('radiogroup', { name: 'How was your service?' })).toBeInTheDocument()
    expect(getByRole('radio', { name: 'Great' })).toBeChecked()
    expect(getByRole('radio', { name: 'Terrible' })).not.toBeChecked()
  })

  it('order and driver (the scale instead of like / dislike): a group of radios of components.rating_scale', () => {
    for (const ui of [<ReviewOrder key='o' useSimpleRating={false} />, <ReviewDriver key='d' useSimpleRating={false} />]) {
      const { getByRole, unmount } = render(ui, completeTheme)
      expect(getByRole('radiogroup', { name: 'How was your order?' })).toBeInTheDocument()
      expect(getByRole('radio', { name: 'Great' })).toBeChecked()
      unmount()
    }
  })

  it('driver: the photo is components.avatar md, decorative beside its text', () => {
    const { container } = render(<ReviewDriver />, completeTheme)
    const photo = container.querySelector('img[src="driver.png"]')
    expect(photo).toBeTruthy()
    expect(photo.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(photo.parentElement.style.getPropertyValue('--ui-avatar-size')).toBe(completeTheme.css.components.avatar.sizes.md.size)
  })

  it('the comment field keeps the focus of components.input (no lift nor shadow of its own)', () => {
    for (const ui of [<ReviewOrder key='o' />, <ReviewDriver key='d' />]) {
      const { container, unmount } = render(ui, completeTheme)
      const field = container.querySelector('textarea')
      const cls = field.parentElement.className.split(' ').pop()
      const rules = injectedCss().split('}').filter((r) => r.includes(`.${cls} textarea`)).join('}')
      expect(rules).not.toContain('translateY')
      unmount()
    }
  })
})

// components.rating_scale.base.mode: how the order and the driver are rated
describe('the review modals: rating_scale.base.mode', () => {
  const withMode = (mode) => themeWithValues((values) => {
    values.components.rating_scale.base.mode = mode
    return values
  })

  it('the schema defaults (thumbs): like / dislike, no scale', () => {
    for (const ui of [<ReviewOrder key='o' />, <ReviewDriver key='d' />]) {
      const { queryByRole, unmount } = render(ui, themeWithValues())
      expect(queryByRole('radiogroup', { name: 'How was your order?' })).toBeNull()
      unmount()
    }
  })

  it('scale: the five points of components.rating_scale', () => {
    for (const ui of [<ReviewOrder key='o' />, <ReviewDriver key='d' />]) {
      const { getByRole, unmount } = render(ui, withMode('scale'))
      expect(getByRole('radiogroup', { name: 'How was your order?' })).toBeInTheDocument()
      expect(getByRole('radio', { name: 'Great' })).toBeChecked()
      unmount()
    }
  })

  it('the prop still wins over the theme', () => {
    const { queryByRole } = render(<ReviewOrder useSimpleRating />, withMode('scale'))
    expect(queryByRole('radiogroup', { name: 'How was your order?' })).toBeNull()
  })
})

describe('structured review validation delivered to the UI', () => {
  it.each([
    ['Order', ReviewOrder, 'Continue', 'radiogroup', 'How was your order?', 'delivery', true],
    ['Product', ReviewProduct, 'Continue', 'group', 'How was the Burger?', 'qualification', false],
    ['Driver', ReviewDriver, 'Continue', 'radiogroup', 'How was your order?', 'qualification', false],
    ['Professional', ReviewProfessional, 'Send review', 'radiogroup', 'How was your service?', 'qualification', false]
  ])('%s links validation to the rating and comment and clears a corrected field', (_label, Component, submit, ratingRole, ratingName, field, topLevel) => {
    const state = { loading: false, result: null, changes: [{ product_id: 1 }] }
    const view = render(<Component useSimpleRating={false} formState={state} />, completeTheme)
    fireEvent.click(view.getByRole('button', { name: submit }))
    const failure = { error: true, result: ['Internal API text'], error_codes: [`${field}.required`, 'comment.max'] }
    const formState = topLevel ? { ...state, ...failure } : { ...state, result: failure }
    view.rerender(<Component useSimpleRating={false} formState={formState} />)

    const rating = view.getByRole(ratingRole, { name: ratingName })
    const comment = view.getByRole('textbox')
    expect(rating).toHaveAttribute('aria-invalid', 'true')
    expect(rating).toHaveAccessibleDescription('Check this field and try again.')
    expect(comment).toHaveAttribute('aria-invalid', 'true')
    expect(comment).toHaveAccessibleDescription('Check this field and try again.')
    expect(view.queryByText('Internal API text')).not.toBeInTheDocument()
    expect(view.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.change(comment, { target: { value: 'Edited comment' } })
    expect(comment).not.toHaveAttribute('aria-invalid')
    expect(rating).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('product review validation with multiple items', () => {
  const order = {
    ...pastOrder,
    products: [{ id: 1, product_id: 1, name: 'Burger' }, { id: 2, product_id: 2, name: 'Pizza' }]
  }
  const failure = { error: true, result: ['Unstructured product API text'], error_codes: ['qualification.required', 'comment.max'] }

  it('assigns a structured error to the only submitted item and opens its comment', () => {
    const state = { loading: false, changes: [{ product_id: 2 }] }
    const view = render(<ReviewProduct order={order} formState={state} />, completeTheme)
    expect(view.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(view.getByRole('button', { name: 'Continue' }))
    view.rerender(<ReviewProduct order={order} formState={{ ...state, result: failure }} />)

    expect(view.getByRole('group', { name: 'How was the Pizza?' })).toHaveAttribute('aria-invalid', 'true')
    expect(view.getByRole('group', { name: 'How was the Burger?' })).not.toHaveAttribute('aria-invalid')
    const comment = view.getByRole('textbox')
    expect(comment).toHaveAccessibleDescription('Check this field and try again.')
    expect(view.queryByTestId('alert')).not.toBeInTheDocument()
    fireEvent.click(view.getAllByRole('button', { name: 'Bad', exact: true })[0])
    expect(view.getByRole('group', { name: 'How was the Pizza?' })).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(comment, { target: { value: 'Corrected Pizza review' } })
    expect(comment).not.toHaveAttribute('aria-invalid')
  })

  it('shows a form-level message when the response cannot identify which submitted item failed', () => {
    const state = { loading: false, changes: [{ product_id: 1 }, { product_id: 2 }] }
    const view = render(<ReviewProduct order={order} formState={state} />, completeTheme)
    fireEvent.click(view.getByRole('button', { name: 'Continue' }))
    view.rerender(<ReviewProduct order={order} formState={{ ...state, result: failure }} />)

    expect(view.getByTestId('alert')).toHaveTextContent('Please try again')
    expect(view.getByTestId('alert')).not.toHaveTextContent('Unstructured product API text')
    expect(view.queryByRole('textbox')).not.toBeInTheDocument()
    expect(view.getByRole('group', { name: 'How was the Pizza?' })).not.toHaveAttribute('aria-invalid')
    expect(view.getByRole('group', { name: 'How was the Burger?' })).not.toHaveAttribute('aria-invalid')
  })
})
