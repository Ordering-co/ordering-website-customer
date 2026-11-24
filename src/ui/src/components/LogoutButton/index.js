import React from 'react'
import {
  MenuLink,
  WrappContent,
  MenuLinkIcon,
  MenuLinkText,
  TextInfo
} from '../SidebarMenu/styles'

import { LogoutAction } from '~components/components/LogoutAction'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Icon } from '~ui/src/design-system/components/Icon'

const LogoutButtonUI = (props) => {
  const { onCustomClick, danger } = props
  const [, t] = useLanguage()

  const handleLogOutClick = () => {
    window.FB?.getLoginStatus((response) => {
      if (response.status === 'connected') {
        window.FB?.logout()
      }
    })

    const GoogleAuth = window?.gapi?.auth2?.getAuthInstance()
    if (GoogleAuth) {
      const signedIn = GoogleAuth.isSignedIn.get()
      if (signedIn) {
        GoogleAuth.signOut().then(() => {
          GoogleAuth.disconnect()
        })
      }
    }

    props?.handleLogoutClick()
    onCustomClick && onCustomClick()
  }

  return (
    <MenuLink as='button' type='button' id='logoutbtn' onClick={handleLogOutClick}>
      <WrappContent>
        <MenuLinkIcon $danger={danger}>
          {/* the outline of the sidebar's other icons */}
          <Icon name='logoutOutline' />
        </MenuLinkIcon>
        <MenuLinkText>
          <TextInfo $danger={danger}>
            {t('LOGOUT', 'Logout')}
          </TextInfo>
        </MenuLinkText>
      </WrappContent>
    </MenuLink>
  )
}

export const LogoutButton = (props) => {
  const logoutButtonProps = {
    ...props,
    UIComponent: LogoutButtonUI
  }
  return (
    <LogoutAction {...logoutButtonProps} />
  )
}
