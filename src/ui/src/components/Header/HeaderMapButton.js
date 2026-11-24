import React from 'react'
import { useTheme } from 'styled-components'
import { Button } from '~ui/src/design-system/components/Button'
import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { slotButtonOptions } from '~/utils/themeGroups'

// What the map button looks like without a slot (header.slots.map): the
// neutral ghost md icon button it always was
const DEFAULT_LOOK = { color: 'neutral', appearance: 'ghost', size: 'md' }

/**
 * The header's businesses map button: a base `Button` of the header group with
 * the look of `header.slots.map`, always the icon shape (a square of its
 * height). It needs its `aria-label`; the rest (`onClick`) goes to the button.
 */
export const HeaderMapButton = (props) => {
  const theme = useTheme()
  return (
    <ComponentScope group='header'>
      <Button {...slotButtonOptions(theme, 'header', 'map', DEFAULT_LOOK)} shape='icon' {...props}>
        <HeaderIcon name='pinMapFill' />
      </Button>
    </ComponentScope>
  )
}
