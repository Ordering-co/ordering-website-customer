import styled from 'styled-components'
import { themeSpace, themeText, headingText } from '~/utils/themeTokens'

export const Container = styled.div`
  display: ${({ $isOnline }) => $isOnline ? 'none' : 'flex'};
  flex-direction: column;
  justify-content: center;
  width: 90%;
  /* the spaces of tokens.space (xxxl around the block, md under the title) */
  margin: ${({ theme }) => themeSpace(theme, 'xxxl')} auto;
  box-sizing: border-box;

  /* the page's h1 with the look of an h2, as before */
  > h1 {
    ${props => headingText(props.theme, 'h2')}
    margin: 0;
  }

  > p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin: ${({ theme }) => themeSpace(theme, 'md')} 0;
  }

  @media (min-width: 768px) {
    width: 80%;
  }

  @media (min-width: 1024px) {
    width: 60%;
  }
`

/* xxxl over the image (EmptyStateImage: its size is the empty state's) */
export const Image = styled.div`
  margin-top: ${({ theme }) => themeSpace(theme, 'xxxl')};
  display: flex;
  justify-content: center;
`

export const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  /* xxl around the button */
  margin: ${({ theme }) => themeSpace(theme, 'xxl')} 0;
`
