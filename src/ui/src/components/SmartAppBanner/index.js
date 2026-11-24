import React from 'react'

import { SmartAppBanner as SmartAppBannerController } from '~components/components/SmartAppBanner'
import { SmartBannerTheme } from './styles'

const SmartAppBanneUI = (props) => {
  /**
   * Options:
   * https://github.com/kudago/smart-app-banner
   * https://github.com/ain/smartbanner.js
   *
   * The library draws the banner outside React. `theme` is the app's theme
   * (App.js renders the banner outside its ThemeProvider): it draws the
   * banner from its tokens.
   */
  const { theme } = props

  return <SmartBannerTheme theme={theme} />
}

export const SmartAppBanner = (props) => {
  const smartAppBannerProps = {
    ...props,
    UIComponent: SmartAppBanneUI
  }
  return <SmartAppBannerController {...smartAppBannerProps} />
}

export default SmartAppBanner
