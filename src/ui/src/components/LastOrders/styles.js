import { OrderCardButton } from '~ui/src/design-system/components/ButtonAppearances'
import styled, { css, useTheme } from 'styled-components'
import React from 'react'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeMedia, themePart, themePartText, themeRadius, themeSize, themeSpace } from '~/utils/themeTokens'

/* The texts of the last order's card from components.order_card,
   as the cards of /profile/orders: the business name (name, name_color), the
   facts under it (meta, meta_color: number and date, status and type), the
   status (status_color) and the total (total, total_color; its weight kept). */
const lastOrderTextsCss = (theme) => {
  return css`
    && .line {
      ${themePart(theme, 'order_card', { text: 'base.meta', color: 'base.meta_color' })}
    }
    && .business-name {
      ${themePart(theme, 'order_card', { text: 'base.name', color: 'base.name_color' })}
    }
    && .green {
      ${themePart(theme, 'order_card', { color: 'base.status_color' })}
    }
    && .order-price .line {
      ${themePartText(theme, 'order_card', 'base.total', { weight: 600 })}
      ${themePart(theme, 'order_card', { color: 'base.total_color' })}
    }
  `
}

export const LastOrdersContainer = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
`

// The old orders list spaces its rows independently of the button's surface.
export const OrderCardRow = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

  .line {
    display: block;
  }

  .order-container {
    display: flex;
    gap: ${props => themeSpace(props.theme, 'lg')};
    position: relative;
  }

  .line {
    margin: 0px;
  }

  .order-type-status {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .order-header-left {
    display: flex;
    align-items: center;
  }

  .order-header-right {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .order-price {
    display: flex;
    justify-content: flex-end;
  }

  /* the texts of components.order_card */
  ${props => lastOrderTextsCss(props.theme)}
`
const OrderCardContents = styled.span`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
`

export const OrderCard = ({ active, children, ...props }) => {
  const theme = useTheme()
  return (
    <OrderCardRow>
      {/* the summary's minimum accommodates its image and facts */}
      <OrderCardButton {...props} cardActive={active} style={{ minHeight: `calc(1.25 * ${themeSize(theme, 'xl')})` }}>
        <OrderCardContents>{children}</OrderCardContents>
      </OrderCardButton>
    </OrderCardRow>
  )
}

export const WrapperImage = styled.span`
  display: block;
  max-width: ${props => themeSize(props.theme, 'lg')};
  max-height: ${props => themeSize(props.theme, 'lg')};
  height: ${props => themeSize(props.theme, 'lg')};
  width: ${props => themeSize(props.theme, 'lg')};
  ${({ isSkeleton }) => !isSkeleton && css`
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
    border-radius: ${props => themeRadius(props.theme, 'md')};
  `}
  ${({ hideContent }) => hideContent && css`
    max-width: ${props => themeMedia(props.theme, '3xs')};
    max-height: ${props => themeMedia(props.theme, '3xs')};
    height: ${props => themeMedia(props.theme, '3xs')};
    width: ${props => themeMedia(props.theme, '3xs')};
  `}
  svg {
    width: 100%;
    height: 100%;
    padding: ${props => themeSpace(props.theme, 'sm')};
    box-sizing: border-box;
    border-radius: ${props => themeRadius(props.theme, 'full')};
  }
`

const ImageStyled = styled.span`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'md')};
`
export const Image = (props) => {
  return (
    <ImageStyled
      {...props}
      style={{ backgroundImage: `url("${props.bgimage}")` }}
    >
      {props.children}
    </ImageStyled>
  )
}

export const OrderHeader = styled.span`
  display: block;

  > .line {
    margin-top: ${props => themeSpace(props.theme, 'xs')};
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`
