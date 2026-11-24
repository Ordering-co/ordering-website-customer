import React from 'react'
import { useTheme } from 'styled-components'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotButtonOptions } from '~/utils/themeGroups'

export const BackLink = ({ onClick, label }) => {
  const theme = useTheme()
  return (
    <Button
      {...slotButtonOptions(theme, 'business_header', 'back', { color: 'neutral', appearance: 'ghost', size: 'md' })}
      shape='icon'
      nativeButton={false}
      render={<a href='/search' />}
      id='back-arrow'
      aria-label={label}
      onClick={onClick}
    >
      {/* it points to the start of the line */}
      <Icon name={theme?.rtl ? 'arrowRight' : 'arrowLeft'} />
    </Button>
  )
}
