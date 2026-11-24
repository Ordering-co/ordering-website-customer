import React from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import {
  BannerContainer,
  BannerImage,
  BannerContent,
  BannerTitle,
  BannerSubtitle
} from './styles'
import { themeImage } from '~/utils/themeTokens'
import { slotButtonOptions } from '~/utils/themeGroups'
import { Button } from '~ui/src/design-system/components/Button'

export const CustomOrderBanner = ({ onCustomOrderClick, maxHeight }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  // the theme's image (images.custom_order_banner; the bundle's default fills
  // an empty one)
  const image = themeImage(theme, 'custom_order_banner')

  return (
    <BannerContainer maxHeight={maxHeight} data-doc-section='custom-order-banner'>
      <BannerImage>
        <img src={image} alt='' />
      </BannerImage>
      <BannerContent>
        <BannerTitle>{t('CUSTOM_ORDER_BANNER_TITLE', 'Do you need a special delivery?')}</BannerTitle>
        <BannerSubtitle>{t('CUSTOM_ORDER_BANNER_SUBTITLE', 'We help you.')}</BannerSubtitle>
        <Button
          type='button'
          onClick={onCustomOrderClick}
          data-doc-control='custom-order-open'
          // components.banner.slots.action
          {...slotButtonOptions(theme, 'banner', 'action', { color: 'primary', size: 'md' })}
        >
          {t('CUSTOM_ORDER_BUTTON', 'Custom order')}
        </Button>
      </BannerContent>
    </BannerContainer>
  )
}

export default CustomOrderBanner
