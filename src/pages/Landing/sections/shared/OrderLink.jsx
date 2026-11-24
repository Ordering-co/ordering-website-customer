import React from 'react'
import { useTheme } from 'styled-components'
import { useHistory } from 'react-router-dom'
import { Button } from '~ui/src/design-system/components/Button'
import { menuPath } from '~/utils/siteSettings'

const PLAIN_CLICK = (event) => !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)

/**
 * A button that is a real link to the menu (`menuPath(theme)`: /order with a full website):
 * a plain click navigates inside the SPA, a modified one (new tab, download…) is left to the browser.
 */
export const OrderLink = ({ children, ...buttonProps }) => {
  const theme = useTheme()
  const history = useHistory()
  const path = menuPath(theme)
  const onClick = (event) => {
    if (!PLAIN_CLICK(event)) return
    event.preventDefault()
    history.push(path)
  }
  return (
    <Button {...buttonProps} nativeButton={false} render={<a href={path} onClick={onClick} />}>
      {children}
    </Button>
  )
}
