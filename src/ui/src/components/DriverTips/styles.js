import styled, { css } from 'styled-components'
import { themeText, blockStill, themeSpace, themeSize } from '~/utils/themeTokens'
import { driverTipsGap } from '~ui/src/components/Checkout/checkoutTheme'

export const DriverTipContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  width: 100%;
  /* the md space under the title (or subtitle), as inside the tips; no room
     below (the section's gap is the checkout's) */
  margin-top: ${props => themeSpace(props.theme, 'md')};
`

export const FormDriverTip = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  @media (min-width: 1396px) and (max-width: 1556px) {
    flex: 0 0 100%;
  }
`

export const DriverTipLabel = styled.label`
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  align-self: flex-start;

  ${props => props.theme?.rtl && css`
    margin-left: ${props => themeSpace(props.theme, 'xl')};
    margin-right: 0;
  `}
  ${props => blockStill(props.theme)}
`

export const WrapperInput = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'md')};
  width: 100%;
`

/* the field takes what the Apply and Cancel actions leave */
export const TipInputSlot = styled.div`
  flex: 1;
  min-width: 0;
`

export const WrapperTips = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: stretch;
  gap: ${props => themeSpace(props.theme, 'md')};
  min-height: calc(1.2 * ${props => themeSize(props.theme, 'xl')});
`

export const TipChips = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  /* the space between the amounts (driver_tips.gap) */
  gap: ${props => driverTipsGap(props.theme)};
  align-items: center;
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`
