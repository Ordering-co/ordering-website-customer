import styled, { css } from 'styled-components'
import { themeDropShadow, themeIconSize, themeRadius, themeShadow, themeSpace } from '~/utils/themeTokens'

export const Container = styled.div`
  display: block;
  width: 100%;
`
export const Title = styled.div`
  display: flex;
  justify-content: center;
`

export const OrderContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 70%;
  margin: 0 auto;

  &:last-child {
    margin-bottom: 0.9em;
  }
`
export const OrderItem = styled.div`
  display: flex;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

  .item-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: ${props => themeSpace(props.theme, 'xl')};
    width: ${props => themeIconSize(props.theme, 'lg')};
    height: ${props => themeIconSize(props.theme, 'lg')};
    min-width: ${props => themeIconSize(props.theme, 'lg')};
    min-height: ${props => themeIconSize(props.theme, 'lg')};
    ${props => props.theme?.rtl && css`
        margin-left: ${themeSpace(props.theme, 'xl')};
        margin-right: 0;
    `}

    .location-icon {
      font-size: ${props => themeIconSize(props.theme, 'md')};
    }

    .clock-icon {
      font-size: ${props => themeIconSize(props.theme, 'md')};
    }

    &.card-icon {
      svg {
        font-size: ${props => themeIconSize(props.theme, 'lg')};
      }
      /* the card brand, never stretched */
      img {
        width: ${props => themeIconSize(props.theme, 'lg')};
        height: ${props => themeIconSize(props.theme, 'md')};
        object-fit: contain;
      }
    }

  }

  .item-text {
    display: flex;
    justify-content: space-between;
    width:100%;
  }

  .business-logo {
    box-shadow: ${props => themeShadow(props.theme, 'md')};
    filter: ${props => themeDropShadow(props.theme, 'sm')};
    border-radius: ${props => themeRadius(props.theme, 'xs')};
    img {
      width: ${props => themeIconSize(props.theme, 'md')};
      height: ${props => themeIconSize(props.theme, 'md')};
      border-radius: ${props => themeRadius(props.theme, 'xs')};
    }
  }
`

export const CardItemContent = styled.div`
  display: flex;
  width: 90%;
`

export const PayCardSelected = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxl')} 0px 0px;
`
