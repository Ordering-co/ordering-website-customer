import React from 'react'
import { useTheme } from 'styled-components'
import { Button } from '~ui/src/design-system/components/Button'
import { slotButtonOptions } from '~/utils/themeGroups'
import { SocialLinkSpacing } from './styles'

// `label`: the network's name, the link's accessible name (its icon has none)
export const SocialNetWork = ({ url, icon, label }) => {
  const theme = useTheme()
  const { size, color, appearance } = slotButtonOptions(theme, 'business_header', 'social', {
    size: 'md', color: 'neutral', appearance: 'ghost'
  })
  return (
    <SocialLinkSpacing>
      <Button
        size={size}
        color={color}
        appearance={appearance}
        shape='icon'
        render={<a href={url} target='_blank' rel='noopener noreferrer' />}
        nativeButton={false}
        data-doc-control='business-social-link'
        aria-label={label}
      >
        {icon}
      </Button>
    </SocialLinkSpacing>
  )
}
