import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { MomentContent } from '../index'

// implementation notesthe header's picker holds the chosen moment until Save
vi.mock('~components/contexts/OrderContext', async () => {
  const { createContext, useContext } = await import('react')
  const OrderContext = createContext(null)
  return { OrderContext, useOrder: () => useContext(OrderContext) }
})
vi.mock('~ui/src/components/MomentControl', async () => {
  const { useOrder } = await import('~components/contexts/OrderContext')
  return {
    MomentControl: ({ onClose }) => {
      const [, { changeMoment }] = useOrder()
      return (
        <>
          <button type='button' onClick={() => changeMoment(new Date('2026-11-22T12:30:00Z'))}>pick</button>
          <button type='button' onClick={() => onClose()}>save</button>
        </>
      )
    }
  }
})

const renderHeaderPicker = async (props, { saved = null, changeMoment = vi.fn().mockResolvedValue(true) } = {}) => {
  const { OrderContext } = await import('~components/contexts/OrderContext')
  const onClose = vi.fn()
  const order = { loading: false, options: { type: 2, moment: saved } }
  const utils = renderWithProviders(
    <OrderContext.Provider value={[order, { changeMoment }]}>
      <MomentContent isHeader onClose={onClose} {...props} />
    </OrderContext.Provider>
  )
  return { ...utils, changeMoment, onClose }
}

describe('MomentContent in the header', () => {
  it('does not apply the picked moment until Save', async () => {
    const { getByText, unmount, changeMoment, onClose } = await renderHeaderPicker()
    fireEvent.click(getByText('pick'))
    // the X only unmounts it: the order stays as it was
    unmount()
    expect(changeMoment).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('applies the picked moment once on Save and then closes', async () => {
    const { getByText, changeMoment, onClose } = await renderHeaderPicker()
    fireEvent.click(getByText('pick'))
    fireEvent.click(getByText('save'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(changeMoment).toHaveBeenCalledTimes(1)
    expect(changeMoment.mock.calls[0][1]).toEqual({ awaitResult: true })
  })

  it('closes on Save without touching the order when nothing was picked', async () => {
    const { getByText, changeMoment, onClose } = await renderHeaderPicker()
    fireEvent.click(getByText('save'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(changeMoment).not.toHaveBeenCalled()
  })

  // implementation notesthe dialog that owns the picker cannot be closed while it saves
  describe('while Save is in flight', () => {
    const deferred = () => {
      let resolve
      const promise = new Promise((_resolve) => { resolve = _resolve })
      return { promise, resolve }
    }

    it.each([
      ['ASAP', null],
      ['a saved time', '2026-11-20 09:00:00']
    ])('from %s: reports busy, sends one PUT and does not send another with a second Save', async (_name, saved) => {
      const pending = deferred()
      const changeMoment = vi.fn(() => pending.promise)
      const onBusyChange = vi.fn()
      const { getByText, onClose } = await renderHeaderPicker({ onBusyChange }, { saved, changeMoment })
      fireEvent.click(getByText('pick'))
      fireEvent.click(getByText('save'))
      await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true))
      fireEvent.click(getByText('save'))
      expect(changeMoment).toHaveBeenCalledTimes(1)
      await act(async () => pending.resolve(true))
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
      expect(onBusyChange).toHaveBeenLastCalledWith(false)
      expect(changeMoment).toHaveBeenCalledTimes(1)
    })

    it('a picker that was closed meanwhile does not close the one opened after it when its Save resolves', async () => {
      const pending = deferred()
      const changeMoment = vi.fn(() => pending.promise)
      const first = await renderHeaderPicker({}, { changeMoment })
      fireEvent.click(first.getByText('pick'))
      fireEvent.click(first.getByText('save'))
      first.unmount()
      await act(async () => pending.resolve(true))
      expect(first.onClose).not.toHaveBeenCalled()
    })
  })
})
