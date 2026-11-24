import React from 'react'
import styled from 'styled-components'

import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { isClosedNow, isValidOrderMoment, openingLabel } from '~/utils/businessTime'

// The card is an alert of the theme (components.alert): `warning` while the store is closed, `success` once the
// person has chosen when she wants her order.
const Card = styled.div.attrs(({ $scheduled }) => alertAttrs($scheduled ? 'success' : 'warning')())`
  ${({ theme, $scheduled }) => alertRules(theme, $scheduled ? 'success' : 'warning')}
  align-items: center;
  flex-wrap: wrap;
`

const Message = styled.div`
  flex: 1 1 0;
  min-width: min-content;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  p {
    margin: 0;
  }
  .headline {
    ${({ theme }) => themeText(theme, 'label', { props: ['weight'], weight: 600 })}
  }
`

/**
 * The closed store's notice of the store page's designs, in the place the layout gives it. Closed with no moment
 * chosen: "Closed now" with the next opening and, when the store takes preorders, the button that opens the
 * moment picker (`onSchedule`, the Preorder button's own modal). Once a moment is chosen it is a confirmation
 * with that moment and a "Change" button that opens the same picker. An open store has none.
 */
export const StoreClosedCard = ({ business, loading, onSchedule, ...props }) => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [orderState] = useOrder()
  const [{ is12Hours, parseDate, preorderDateFormat, timeFormat }] = useUtils()
  const moment = orderState?.options?.moment
  // (the business reloaded for a chosen moment says it is open at it: closed is told by its own schedule)
  if (loading || !isClosedNow(business, moment)) return null

  const scheduled = isValidOrderMoment(moment)
  const canSchedule = !!onSchedule && configs?.preorder_status_enabled?.value === '1'
  const opens = openingLabel(business, t, { is12Hours, showTimezone: true })
  const chosen = scheduled && parseDate(moment, { outputFormat: `${preorderDateFormat || 'YYYY-MM-DD'} ${timeFormat || 'HH:mm'}` })

  return (
    <Card $scheduled={scheduled} data-doc-section='business-closed-card' data-doc-state={scheduled ? 'scheduled' : 'closed'} {...props}>
      <Icon name={scheduled ? 'check' : 'clock'} />
      <Message>
        {scheduled
          ? (
            <>
              <p className='headline'>{t('STORE_ORDER_SCHEDULED', 'Order scheduled')}</p>
              <p>{chosen}</p>
            </>
            )
          : (
            <>
              <p className='headline'>{t('STORE_CLOSED_NOW', 'Closed now')}</p>
              {opens && <p>{opens}</p>}
            </>
            )}
      </Message>
      {canSchedule && (
        <Button
          size='sm'
          color={scheduled ? 'neutral' : 'primary'}
          appearance={scheduled ? 'outline' : 'solid'}
          data-doc-control='business-closed-schedule'
          onClick={onSchedule}
        >
          {scheduled ? t('CHANGE', 'Change') : t('SCHEDULE_FOR_LATER', 'Schedule for later')}
        </Button>
      )}
    </Card>
  )
}
