import styled from 'styled-components'
import { layerBackground, layerBackgroundCss } from '~ui/src/styles/Layer'
import { themeSpace, themeValue } from '~/utils/themeTokens'

/* The sheet (phones): the calendar in the side space of the menu's options,
   its actions under it */
// In the base Sheet: the sheet's own padding is the modal's; this is its layer
// (styles/Layer), so the sticky actions paint the sheet's background
export const SheetBody = styled.div`
  ${({ theme }) => layerBackgroundCss(themeValue(theme, 'modal', 'base.background'))}
`

/* Cancel and apply, one beside the other; they stay at the bottom of the
   sheet when its content scrolls (on the sheet's background) */
export const SheetActions = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding: ${({ theme }) => themeSpace(theme, 'lg')} 0;
  background: ${({ theme }) => layerBackground(theme)};

  /* one half each; the Button's own min-width is 0, so its label ends in … before the row overflows */
  > button {
    flex: 1;
  }
`
