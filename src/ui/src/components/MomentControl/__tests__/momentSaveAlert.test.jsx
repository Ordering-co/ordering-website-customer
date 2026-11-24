import React, { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

// implementation notesthe alert says it was the time only when it opened for the rejection of the picker's Save
vi.unmock('@loadable/component')
vi.unmock('~ui/src/components/Confirm')
vi.unmock('~ui/utils')
vi.mock('~components/contexts/OrderContext', async () => {
  const { createContext, useContext } = await import('react')
  const OrderContext = createContext(null)
  return { OrderContext, useOrder: () => useContext(OrderContext) }
})

const TIME_MESSAGE = 'We couldn\'t save that time. Choose another time or try again.'
const GENERIC = 'Something went wrong. Please try again.'
const PICKED = new Date('2026-11-22T12:30:00Z')

let OrderAlert, OrderMomentDraft, OrderContext, useOrder
beforeAll(async () => {
  ;({ OrderAlert } = await import('~/components/OrderAlert'))
  ;({ OrderMomentDraft } = await import('../OrderMomentDraft'))
  ;({ OrderContext, useOrder } = await import('~components/contexts/OrderContext'))
})

// the picker: it holds the moment it is given until Save (confirm)
const Picker = ({ confirm }) => {
  const [, { changeMoment }] = useOrder()
  return (
    <>
      <button type='button' onClick={() => changeMoment(PICKED)}>pick</button>
      <button type='button' onClick={confirm}>save</button>
    </>
  )
}

// What OrderProvider does: the alert it opens for a rejection is queued before the save's promise resolves
const Harness = ({ outcomes, onConfirm }) => {
  const [alert, setAlert] = useState({ show: false })
  const close = () => setAlert({ show: false })
  const [changeMoment] = useState(() => vi.fn(async () => {
    const next = outcomes.shift()
    if (next.alert !== undefined) setAlert({ show: true, content: next.alert })
    return next.saved
  }))
  return (
    <OrderContext.Provider value={[{ loading: false, options: { type: 2, moment: null } }, { changeMoment }]}>
      <OrderAlert open={alert.show} title='Error' content={alert.content} onAccept={close} onClose={close} />
      <OrderMomentDraft onConfirm={onConfirm}>{(confirm) => <Picker confirm={confirm} />}</OrderMomentDraft>
      <button type='button' onClick={() => setAlert({ show: true, content: [] })}>other operation fails</button>
    </OrderContext.Provider>
  )
}

const setup = (outcomes) => {
  const onConfirm = vi.fn()
  const view = renderWithProviders(<Harness outcomes={outcomes} onConfirm={onConfirm} />)
  const save = async () => {
    fireEvent.click(view.getByText('pick'))
    await act(async () => { fireEvent.click(view.getByText('save')) })
  }
  return { ...view, onConfirm, save }
}

describe('the alert of the time and the alert of another operation', () => {
  it('a rejected Save with no reason says the time, keeps the picker and a retry that succeeds closes it', async () => {
    const { findByText, getByText, save, onConfirm } = setup([{ alert: [], saved: false }, { saved: true }])
    await save()
    expect(await findByText(TIME_MESSAGE)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(getByText('Accept'))
    await act(async () => { fireEvent.click(getByText('save')) })
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('an alert of another operation after that rejection does not say the time', async () => {
    const { findByText, getByText, queryByText, save } = setup([{ alert: [], saved: false }])
    await save()
    expect(await findByText(TIME_MESSAGE)).toBeInTheDocument()
    fireEvent.click(getByText('Accept'))
    await waitFor(() => expect(queryByText(TIME_MESSAGE)).toBeNull())
    fireEvent.click(getByText('other operation fails'))
    expect(await findByText(GENERIC)).toBeInTheDocument()
    expect(queryByText(TIME_MESSAGE)).toBeNull()
  })

  it('a rejection that opens no alert leaves nothing marked for the next one', async () => {
    const { findByText, getByText, queryByText, save } = setup([{ saved: false }])
    await save()
    fireEvent.click(getByText('other operation fails'))
    expect(await findByText(GENERIC)).toBeInTheDocument()
    expect(queryByText(TIME_MESSAGE)).toBeNull()
  })
})
