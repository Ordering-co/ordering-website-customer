import React, { useCallback, useEffect, useRef, useState } from 'react'
import { OrderContext, useOrder } from '~components/contexts/OrderContext'
import { markMomentSave } from './momentSave'

export const OrderMomentDraft = ({ onConfirm, onBusyChange, waiting = false, children }) => {
  const [order, actions] = useOrder()
  const draft = useRef()
  const saving = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const busy = isSaving || waiting
  const mounted = useRef(true)
  // counts the Saves that settled: a render of its own even when the Save was too quick for `isSaving` to show
  const [settled, setSettled] = useState(0)
  useEffect(() => () => { mounted.current = false }, [])
  // the dialog that holds the picker cannot be closed while it saves (as the store's: implementation notes)
  useEffect(() => {
    if (!onBusyChange) return undefined
    onBusyChange(busy)
    return () => onBusyChange(false)
  }, [busy])
  // The mark of a Save is cleared once it settled and the screen showed what it opened (the alert of its
  // rejection reads it when it opens, in the same pass as this); a rejection with no alert leaves nothing marked.
  useEffect(() => {
    if (settled > 0) markMomentSave(false)
  }, [settled])

  // Keep the controller's saved date and timezone handling, but hold its
  // changeMoment calls inside this picker until the customer confirms.
  const changeMoment = useCallback((moment) => { draft.current = moment }, [])

  const confirm = async () => {
    if (saving.current || waiting) return
    const moment = draft.current
    const formatted = moment?.toISOString().slice(0, 19).replace('T', ' ') ?? null
    const changed = moment !== undefined && formatted !== (order.options?.moment ?? null)
    if (!changed) {
      onConfirm({ changed, moment: order.options?.moment ?? null })
      return
    }
    saving.current = true
    markMomentSave(true)
    setIsSaving(true)
    let saved
    try {
      saved = await actions.changeMoment(moment, { awaitResult: true })
    } catch {
      saved = false
    } finally {
      saving.current = false
      setIsSaving(false)
      setSettled((count) => count + 1)
    }
    if (saved || !mounted.current) markMomentSave(false)
    // a picker closed meanwhile does not close whatever is open now
    if (saved && mounted.current) onConfirm({ changed, moment: formatted })
  }

  return (
    <OrderContext.Provider value={[busy ? { ...order, loading: true } : order, { ...actions, changeMoment }]}>
      {children(confirm, busy)}
    </OrderContext.Provider>
  )
}
