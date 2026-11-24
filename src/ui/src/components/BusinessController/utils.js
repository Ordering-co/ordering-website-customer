import React from 'react'
import { Icon } from '~ui/src/design-system/components/Icon'

export const getUtils = () => {
  // delivery is the theme's icon for every project (EatStreet included),
  // sized and colored like the other icons of the row
  const getDeliveryIcon = () => <Icon name='truckDelivery' aria-hidden='true' />

  return {
    getDeliveryIcon
  }
}
