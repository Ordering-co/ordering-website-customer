import styled from 'styled-components'
import { themeIconSize } from '~/utils/themeTokens'

/* The theme sizes the box. The brand artwork keeps its own aspect ratio. */
export const BrandImage = styled.img`
  width: ${({ theme }) => themeIconSize(theme, 'lg')};
  height: ${({ theme }) => themeIconSize(theme, 'md')};
  object-fit: contain;
  flex-shrink: 0;
`

/* A card without a brand mark: the theme's credit card icon in
   the same box, in the text color around it */
export const BrandIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => themeIconSize(theme, 'lg')};
  height: ${({ theme }) => themeIconSize(theme, 'md')};
  flex-shrink: 0;
  color: inherit;

  svg {
    width: 100%;
    height: 100%;
  }
`
