import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import loadable from '@loadable/component'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { slotSize } from '~/utils/themeGroups'
import { DEFAULT_CONTROL_SIZE } from '~/utils/themeTokens'
import { OrderContextChipBox, OrderContextChipText } from './styles'

// The sheet (the base Sheet and the order context's controls, with their
// modals' trees) opens on interaction: out of the entry chunk, as the header's
// other popovers and modals
const OrderContextSheet = loadable(() => import('./OrderContextSheet').then((m) => m.OrderContextSheet))

/**
 * The order context's chip in the header's row: a ghost neutral
 * `Button` of the address slot's size with the icon and the summary (`label`,
 * whole in `title`), which opens the order context in a `Sheet` (base, from
 * the bottom) titled "Your order". Tapping the moment or the address in it
 * closes the sheet and then asks the header for its usual modal
 * (`onOpenModal('moment' | 'address')`), so only one overlay is open; focus
 * comes back to the chip when the sheet closes (Esc, the backdrop, the X) and
 * when that modal does. `onBusyChange(true | false)` tells the header the
 * chip is in use, from the tap until its sheet is out: the header keeps it
 * mounted meanwhile (its own conditions may stop holding with the sheet open).
 */
export const OrderContextChip = ({ icon = 'mapMarker', label, onOpenModal, onBusyChange }) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const chipRef = useRef(null)
  // opened once, kept mounted after it so it can slide out
  const [opened, setOpened] = useState(false)
  const [open, setOpen] = useState(false)
  // the modal to open once the sheet is out (it had the focus until then)
  const pending = useRef(null)

  const pick = (kind) => {
    pending.current = kind
    setOpen(false)
  }
  const sheetClosed = (isOpen) => {
    if (isOpen) return
    const kind = pending.current
    pending.current = null
    if (kind) {
      // the modal remembers what had the focus when it opened: the chip
      chipRef.current?.focus({ preventScroll: true })
      onOpenModal(kind)
    }
    onBusyChange?.(false)
  }
  // leaving with the sheet open (the page changed) frees the header's hold
  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  return (
    <OrderContextChipBox data-doc-section='header-order-context-chip'>
      <ComponentScope group='header'>
        <Button
          ref={chipRef}
          color='neutral'
          appearance='ghost'
          size={slotSize(theme, 'header', 'address', DEFAULT_CONTROL_SIZE)}
          title={label}
          aria-label={`${t('YOUR_ORDER', 'Your order')}: ${label}`}
          aria-haspopup='dialog'
          aria-expanded={open}
          onClick={() => { setOpened(true); setOpen(true); onBusyChange?.(true) }}
        >
          <OrderIcon name={icon} aria-hidden='true' />
          <OrderContextChipText>{label}</OrderContextChipText>
        </Button>
      </ComponentScope>
      {opened && (
        <OrderContextSheet
          open={open}
          onOpenChange={setOpen}
          onOpenChangeComplete={sheetClosed}
          finalFocus={chipRef}
          onPick={pick}
        />
      )}
    </OrderContextChipBox>
  )
}
