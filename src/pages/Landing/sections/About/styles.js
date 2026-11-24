import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeRadius, themeSpace, themeText } from '~/utils/themeTokens'

const phone = `${MOBILE_WEB_MAX_WIDTH - 1}px`

export const AboutLayout = styled.div`
  display: grid;
  grid-template-columns: ${({ $photo }) => ($photo ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)')};
  gap: ${({ theme }) => themeSpace(theme, 'xxl')};
  align-items: center;

  @media (max-width: ${phone}) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const AboutText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  max-width: 65ch;

  p {
    margin: 0;
    ${({ theme }) => themeText(theme, 'body_lg')}
  }
`

export const AboutPhoto = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: ${({ theme }) => themeRadius(theme, 'lg')};
  background: ${({ theme }) => themeColor(theme, 'surface')};
`
