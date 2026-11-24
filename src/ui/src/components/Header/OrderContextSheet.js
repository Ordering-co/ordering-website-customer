import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~ui/src/design-system/components/Sheet'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'

/**
 * The sheet of the header's order context chip: the order type, the moment and
 * the address are OrderContextUI's own controls (isSheet), the moment and the
 * address delegating to `onPick` so the header opens its usual modals.
 */
export const OrderContextSheet = ({ open, onOpenChange, onOpenChangeComplete, finalFocus, onPick }) => {
  const [, t] = useLanguage()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side='bottom' finalFocus={finalFocus} data-doc-section='header-order-context-sheet'>
        <SheetHeader>
          <SheetTitle>{t('YOUR_ORDER', 'Your order')}</SheetTitle>
        </SheetHeader>
        <OrderContextUI isSheet onOpenMoment={() => onPick('moment')} onOpenAddress={() => onPick('address')} />
      </SheetContent>
    </Sheet>
  )
}
