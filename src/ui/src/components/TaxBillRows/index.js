import React from 'react'
import { getTaxAmount, getTaxesByTarget, getTaxKey, shouldShowTaxBillRow, shouldShowTaxRate } from '../../../utils/taxBillUtils'
import { verifyDecimals } from '../../../utils'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'

export const TaxBillRows = (props) => {
  const {
    taxes,
    target,
    setOpenTaxModal,
    parsePrice,
    parseNumber,
    t,
    iconVariant = 'icon',
    IconWrapper,
    ExclamationWrapper,
    rowClassName
  } = props

  const targetTaxes = getTaxesByTarget(taxes, target).filter(shouldShowTaxBillRow)

  if (!targetTaxes.length) return null

  const handleOpenTaxModal = (tax) => {
    setOpenTaxModal?.({ open: true, data: tax, type: 'tax' })
  }

  const InfoIcon = () => (
    <Icon name='infoCircle' size='md' />
  )

  return targetTaxes.map((tax, index) => (
    <tr key={getTaxKey(tax, index)} className={rowClassName}>
      <td className={iconVariant === 'icon' ? 'icon' : undefined}>
        {tax?.name
          ? t(tax.name.toUpperCase().replace(/ /g, '_'), tax.name)
          : t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
        {shouldShowTaxRate(tax) && (
          <span>{`(${verifyDecimals(tax.rate, parseNumber)}%)`}</span>
        )}
        {setOpenTaxModal && iconVariant === 'icon' && IconWrapper && (
          // the info is a real button (named, keyboard) of the row's text: the xs ghost icon button
          <IconWrapper>
            <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('INFORMATION', 'Information')} onClick={() => handleOpenTaxModal(tax)}>
              <Icon name='infoCircle' />
            </Button>
          </IconWrapper>
        )}
        {setOpenTaxModal && iconVariant === 'exclamation' && ExclamationWrapper && (
          <ExclamationWrapper onClick={() => handleOpenTaxModal(tax)}>
            <InfoIcon />
          </ExclamationWrapper>
        )}
      </td>
      <td>{parsePrice(getTaxAmount(tax))}</td>
    </tr>
  ))
}
