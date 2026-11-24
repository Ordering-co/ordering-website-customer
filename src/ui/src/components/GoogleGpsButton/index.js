import React from 'react'
import { GpsButton } from '~components/components/GpsButton'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'

import { GpsButtonWrap } from './styles'

const GoogleGpsButtonUI = (props) => {
  const {
    handleGPS,
    isGoogleButton,
    googleReady,
    isLoading,
    IconButton
  } = props
  const [, t] = useLanguage()

  return (
    <GpsButtonWrap className={props.className || ''}>
      <Button
        shape='icon'
        appearance='ghost'
        disabled={(isGoogleButton && !googleReady) || isLoading}
        onClick={handleGPS}
        aria-label={t('USE_CURRENT_LOCATION', 'Use my current location')}
        aria-busy={!!isLoading}
      >
        {isLoading
          ? <Icon name='loaderCircle' />
          : (IconButton ? <IconButton /> : <Icon name='mapMarker' />)}
      </Button>
    </GpsButtonWrap>
  )
}

export const GoogleGpsButton = (props) => {
  const gpsButtonProps = {
    ...props,
    UIComponent: GoogleGpsButtonUI
  }
  return (
    <GpsButton {...gpsButtonProps} />
  )
}
