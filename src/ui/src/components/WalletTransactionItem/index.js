import React from 'react'
import {
  ItemContainer,
  ItemDateBlock,
  ItemDescriptionBlock,
  ItemIcon,
  ItemContent,
  ItemRight
} from './styles'
import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'

import { capitalize } from '~ui/utils'

import { Icon } from '~ui/src/design-system/components/Icon'

export const WalletTransactionItem = (props) => {
  const {
    item,
    withFormatPrice,
    listItem
  } = props

  const [, t] = useLanguage()
  const [{ parsePrice, parseDate }] = useUtils()

  return (
    <ItemContainer data-doc-section='wallet-transaction' $listItem={listItem}>
      <ItemDateBlock>
        <div className='left-wrapper'>
          <ItemIcon className={`${item?.amount > 0 ? 'green' : ''}`}>
            {item?.amount > 0
              ? (
                  <Icon name="arrowUp"/>
                )
              : (
                  <Icon name="arrowDown" />
                )
            }
          </ItemIcon>
          <ItemRight>
            <ItemContent>
              <div className='date'>{parseDate(item?.created_at)}</div>
            </ItemContent>
              <ItemDescriptionBlock>
                <div>{item?.description ? item?.description : capitalize(`${item?.event_type} ${t('MOVEMENT', 'Movement')}`)}</div>
              </ItemDescriptionBlock>
          </ItemRight>
        </div>
        <ItemRight>
          <ItemContent>
            <div
              className={`amount ${item?.amount > 0 ? 'green' : ''}`}
            >
              {item?.amount > 0 && '+ '}{withFormatPrice ? parsePrice(item?.amount) : item?.amount}
            </div>
          </ItemContent>
        </ItemRight>
      </ItemDateBlock>
    </ItemContainer>
  )
}
