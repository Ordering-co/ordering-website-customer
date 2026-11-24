import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ReviewOrder } from '..'
import { ReviewDriver } from '../../ReviewDriver'
import { ReviewProduct } from '../../ReviewProduct'
import { ReviewProfessional } from '../../ReviewProfessional'

vi.unmock('~ui/src/components/Confirm')
vi.unmock('@loadable/component')

vi.mock('~components/contexts/WebsocketContext', () => ({
  useWebsocket: () => ({ getId: () => 'test-socket' })
}))

const apiMessage = 'Unstructured internal API detail'
const order = {
  id: 1,
  business_id: 2,
  business: { id: 2, name: 'Test Store' },
  driver: { id: 3, name: 'Test Driver' },
  products: [{ id: 4, product_id: 4, name: 'Test Item', calendar_event: { professional: { id: 5, name: 'Test Professional' } } }]
}

afterEach(() => vi.unstubAllGlobals())

describe('review API errors with the real controllers', () => {
  it.each([
    ['Order', ReviewOrder, 'Continue', 'Order Review', 'closeReviewOrder', 'setIsReviewed', '/business/2/reviews', {}],
    ['Product', ReviewProduct, 'Continue', 'Product Review', 'closeReviewProduct', 'setIsProductReviewed', '/orders/1/product_reviews', {}],
    ['Driver', ReviewDriver, 'Continue', 'Driver Review', 'closeReviewDriver', 'setIsDriverReviewed', '/users/3/user_reviews', {}],
    ['Professional', ReviewProfessional, 'Send review', 'Professional Review', 'closeReviewProfessional', 'setIsProfessionalReviewed', '/users/5/user_reviews', { isProfessional: true }]
  ])('%s keeps the review editable after a failed request and finishes on retry', async (_label, Component, submitLabel, title, closeProp, reviewedProp, endpoint, props) => {
    const close = vi.fn()
    const markReviewed = vi.fn()
    const fetchReview = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ error: true, result: [apiMessage], error_codes: ['comment.max'] }) })
      .mockResolvedValueOnce({ json: async () => ({ error: false, result: [{ id: 20 }] }) })
    vi.stubGlobal('fetch', fetchReview)

    renderWithProviders(<Component order={order} defaultStar={5} {...props} {...{ [closeProp]: close, [reviewedProp]: markReviewed }} />)
    const comment = screen.getByRole('textbox')
    fireEvent.change(comment, { target: { value: 'My original review' } })
    fireEvent.click(screen.getByRole('button', { name: submitLabel }))

    const alert = await screen.findByRole('dialog', { name: title })
    expect(alert).toHaveTextContent('Please try again')
    expect(alert).not.toHaveTextContent(apiMessage)
    expect(close).not.toHaveBeenCalled()
    expect(markReviewed).not.toHaveBeenCalled()
    expect(fetchReview).toHaveBeenCalledWith(expect.stringContaining(endpoint), expect.objectContaining({ method: 'POST' }))

    fireEvent.click(within(alert).getByRole('button', { name: 'Accept' }))
    expect(comment).toHaveValue('My original review')
    fireEvent.change(comment, { target: { value: 'My corrected review' } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: submitLabel }))
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
    expect(markReviewed).toHaveBeenCalledExactlyOnceWith(true)
    expect(fetchReview).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchReview.mock.calls[1][1].body)).toEqual(expect.objectContaining(
      Component === ReviewProduct ? { reviews: expect.stringContaining('My corrected review') } : { comment: 'My corrected review' }
    ))
  })
})
