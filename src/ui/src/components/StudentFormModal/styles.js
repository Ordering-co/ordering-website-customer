import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeText, themeSpace } from '~/utils/themeTokens'

export const Form = styled.div`
  display: flex;
  flex-direction: column;
  /* the theme's md between the fields, the rhythm of the forms */
  gap: ${props => themeSpace(props.theme, 'md')};
  padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'sm')};

`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'sm')};

  > label {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
    color: ${({ theme }) => themeColor(theme, 'text')};
  }
`

export const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'sm')};
`

export const ChipCell = styled.div`
  display: grid;
  place-items: center;
  max-inline-size: 100%;

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
    /* Each chip's touch area stays within its own cell when the group wraps. */
    /* touch-target */ min-block-size: 44px;
    /* touch-target */ min-inline-size: 44px;
  }
`

export const Actions = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
`
