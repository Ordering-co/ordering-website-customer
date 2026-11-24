import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'

import {
  Container,
  Image,
  ButtonWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOnlineStatus } from '~ui/hooks/useOnlineStatus'
import { Button } from '~ui/src/design-system/components/Button'
import { EmptyStateImage } from '~ui/src/components/NotFoundSource/styles'
import { EmptyStateIcon } from '~ui/src/components/NotFoundSource'
import { themeImage } from '~/utils/themeTokens'

export const NotNetworkConnectivity = (props) => {
  const [, t] = useLanguage()
  const onlineStatus = useOnlineStatus()
  const theme = useTheme()

  const errorImage = props.image || themeImage(theme, 'empty.no_internet')
  const [base64ImageString, setBase64ImageString] = useState(null)

  const getBase64ImageFromUrl = async (imageUrl) => {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', function () {
        resolve(reader.result)
      }, false)
      reader.onerror = (error) => {
        return reject(error)
      }
      reader.readAsDataURL(blob)
    })
  }

  useEffect(() => {
    // no image (theme or prop): the icon stays, nothing to fetch
    if (!errorImage) return
    getBase64ImageFromUrl(errorImage).then(base64 => {
      setBase64ImageString(base64)
    })
  }, [])

  return (
    <>
      <Container
        id='container'
        data-doc-section='global-offline'
        data-doc-state={(props.isOnline ?? onlineStatus) ? 'online' : 'offline'}
        $isOnline={props.isOnline ?? onlineStatus}
      >
        {/* the screen's h1: while offline it is the whole page */}
        <h1>{t('MOBILE_NO_INTERNET', 'No internet connection')}</h1>
        <p>{t('NETWORK_OFFLINE_MESSAGE', 'Your connection appears to be off-line. Try to refresh the page')}</p>
        {/* decorative: the title and the text say it; the image (or icon)
            box of every empty state (components.empty_state image_size) */}
        <Image>
          {errorImage
            ? (base64ImageString && (
              <EmptyStateImage id='not-network' src={base64ImageString} alt='' width='600' height='600' loading='lazy' />
              ))
            : <EmptyStateIcon name='wifiOff' />}
        </Image>
        <ButtonWrapper>
          <Button
            size='md'
            onClick={() => window.location.reload()}
          >
            {t('REFRESH', 'Refresh')}
          </Button>
        </ButtonWrapper>
      </Container>
    </>
  )
}

export default NotNetworkConnectivity
