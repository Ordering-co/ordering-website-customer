import React from 'react'
import styled, { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { WebsocketStatus as WebsocketStatusController } from '~components/components/WebsocketStatus'
import { Dot } from '~ui/src/design-system/components/Dot'
import { themeSpace } from '~/utils/themeTokens'
import { MenuLink, WrappContent, MenuLinkIcon, MenuLinkText, TextInfo, sidebarIconSize, sidebarShowsIcons } from './styles'

// The color of the dot of each socket status: 0 connecting, 1 connected, 2 disconnected
const DOT_COLORS = { 0: 'warning', 1: 'success', 2: 'danger' }

// The dot centered in a box of the panel's icon size, so the label lines up with the other rows' text
const DotBox = styled.span`
  display: flex;
  justify-content: center;
  width: ${({ theme }) => sidebarIconSize(theme)};
`

const LabelWithDot = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// A row that only informs (not an option): the socket's state as a dot, named by its state
const Row = ({ socketStatus, getWebsocketStatus }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const dot = <Dot color={DOT_COLORS[socketStatus]} label={getWebsocketStatus(socketStatus)} />
  // show_icons false hides the icon column: the dot goes after the label, so the state is still seen
  const withIcons = sidebarShowsIcons(theme)
  return (
    <MenuLink as='div' $static data-doc-section='sidebar-connection-status'>
      <WrappContent>
        {withIcons && <MenuLinkIcon><DotBox>{dot}</DotBox></MenuLinkIcon>}
        <MenuLinkText>
          {withIcons
            ? <TextInfo>{t('CONNECTION_STATUS', 'Connection status')}</TextInfo>
            : <LabelWithDot><TextInfo>{t('CONNECTION_STATUS', 'Connection status')}</TextInfo>{dot}</LabelWithDot>}
        </MenuLinkText>
      </WrappContent>
    </MenuLink>
  )
}

export const ConnectionStatusRow = () => <WebsocketStatusController UIComponent={Row} />
