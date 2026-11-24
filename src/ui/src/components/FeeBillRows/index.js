import React from 'react'
import { getFeeAmount, getFeeKey, shouldShowFeeItem, shouldShowFeeRateDetails } from '../../../utils/feeBillUtils'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'

export const FeeBillRows = (props) => {
  const {
    fees,
    setOpenTaxModal,
    parsePrice,
    t,
    iconVariant = 'icon',
    IconWrapper,
    ExclamationWrapper,
    rowClassName
  } = props

  const visibleFees = fees?.filter(shouldShowFeeItem) ?? []

  if (!visibleFees.length) return null

  const handleOpenFeeModal = (fee) => {
    setOpenTaxModal?.({ open: true, data: fee, type: 'fee' })
  }

  const InfoIcon = () => (
    <Icon name='infoCircle' size='md' />
  )

  return visibleFees.map((fee, index) => (
    <tr key={getFeeKey(fee, index)} className={rowClassName}>
      <td className={iconVariant === 'icon' ? 'icon' : undefined}>
        {fee?.name
          ? t(fee.name.toUpperCase().replace(/ /g, '_'), fee.name)
          : t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
        {shouldShowFeeRateDetails(fee) && (
          <span>
            ({fee?.fixed > 0 && `${parsePrice(fee?.fixed)}${fee.percentage > 0 ? ' + ' : ''}`}{fee.percentage > 0 && `${fee.percentage}%`})
          </span>
        )}
        {setOpenTaxModal && iconVariant === 'icon' && IconWrapper && (
          // the info is a real button (named, keyboard), with no box of its own
          <IconWrapper>
            <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('INFORMATION', 'Information')} onClick={() => handleOpenFeeModal(fee)}>
              <InfoIcon />
            </Button>
          </IconWrapper>
        )}
        {setOpenTaxModal && iconVariant === 'exclamation' && ExclamationWrapper && (
          <ExclamationWrapper onClick={() => handleOpenFeeModal(fee)}>
            <InfoIcon />
          </ExclamationWrapper>
        )}
      </td>
      <td>{parsePrice(getFeeAmount(fee))}</td>
    </tr>
  ))
}
