import React, { useState, useEffect } from 'react'

import { useLanguage } from '~components/contexts/LanguageContext'
import { WebsocketStatus as WebsocketStatusController } from '~components/components/WebsocketStatus'
import { Alert } from '~ui/src/components/Confirm'

// Only the alert of a failed reconnection lives here, mounted once for the whole app. The socket's
// state is not drawn on the pages: it is a row of the side menu (SidebarMenu/ConnectionStatusRow).
const SocketStatusUI = (props) => {
  const { reconnectAttemptCount } = props

  const [, t] = useLanguage()

  const [alertState, setAlertState] = useState({ open: false, content: [] })

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
    window.location.reload()
  }

  useEffect(() => {
    if (reconnectAttemptCount > 3) {
      setAlertState({
        open: true,
        content: t('WEBSOCKET_CONNECT_ERROR', 'There appears to be an error in establishing the WebSocket connection. Please try reloading the page to resolve the issue.')
      })
    }
  }, [reconnectAttemptCount])

  return (
    <Alert
      title={t('ERROR', 'Error')}
      content={alertState.content}
      acceptText={t('ACCEPT', 'Accept')}
      open={alertState.open}
      onClose={() => closeAlert()}
      onAccept={() => closeAlert()}
      closeOnBackdrop={false}
    />
  )
}

export const WebsocketStatus = (props) => {
  const socketProps = {
    ...props,
    UIComponent: SocketStatusUI
  }
  return <WebsocketStatusController {...socketProps} />
}
