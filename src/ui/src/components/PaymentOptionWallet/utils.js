import React from 'react'
import { useTheme } from 'styled-components'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { themeIconSize } from '~/utils/themeTokens'

// The wallet's artwork (credits or points) as an image, at the theme's lg icon size: the banner showed it at that size
const WalletIllustration = ({ type }) => {
  const theme = useTheme()
  const size = parseInt(themeIconSize(theme, 'lg'), 10)
  const { walletCredits, walletPoints } = BUNDLED_IMAGES.illustrations
  return <img src={type === 'cash' ? walletCredits : walletPoints} alt='' width={size} height={size} style={{ objectFit: 'contain' }} />
}

export const getUtils = () => {
  const getIcon = (type) => <WalletIllustration type={type} />
  return {
    getIcon
  }
}
