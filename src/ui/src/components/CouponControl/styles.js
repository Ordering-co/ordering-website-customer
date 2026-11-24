import styled, { css } from 'styled-components'
import { onPrimary, primaryText, themeColor } from '~/utils/themeColors'
import { headingText, themeBorderWidth, themePart, themeRadius, themeText, blockStill, themeSpace, themeSize, themeIconSize } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { badgeCss } from '~ui/src/styles/Badge'
import { spinnerRules } from '~ui/src/styles/Spinner'
import { iconTileRules } from '~ui/src/styles/IconTile'

export const CouponContainer = styled.div`
  width: 100%;
  /* a card (components.card) holding the entry row; its corners clip the
     row's hover */
  ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  box-sizing: border-box;
  overflow: hidden;
`

export const CouponEntryContent = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'xxs')};
  min-width: 0;

  strong {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  }

  span {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  }
`

export const CouponModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'xxl')};
`

export const CouponSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'lg')};

  & + & {
    border-top: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${({ theme }) => themeColor(theme, 'border')};
    ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
    padding-top: ${props => themeSpace(props.theme, 'xl')};
  }
`

export const CouponSectionHeader = styled.div`
  h4,
  p {
    margin: 0;
  }

  h4 {
    color: ${({ theme }) => themeColor(theme, 'text')};
    ${props => headingText(props.theme, 'h4')}
  }

  p {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    margin-top: ${props => themeSpace(props.theme, 'xs')};
  }
`

export const CouponForm = styled.form`
  display: flex;
  gap: ${props => themeSpace(props.theme, 'md')};

  /* the field and the action stack, each as wide as the form */
  @media (max-width: 480px) {
    flex-direction: column;
  }
`

export const AppliedCoupon = styled.div`
  align-items: center;
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  display: flex;
  gap: ${props => themeSpace(props.theme, 'md')};
  justify-content: space-between;
  padding: ${props => themeSpace(props.theme, 'md')};

  > div {
    align-items: center;
    display: flex;
    flex: 1;
    gap: ${props => themeSpace(props.theme, 'md')};
    min-width: 0;

    > svg {
      color: ${({ theme }) => themeColor(theme, 'success')};
      flex: 0 0 auto;
    }
  }

  span {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  small {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  }

  /* the coupon code identifies the applied offer: it wraps to 2 lines
     before it is cut, never on one line with "…" */
  strong {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
`

export const OfferTabCount = styled.span`
  align-items: center;
  background: ${({ theme }) => themeColor(theme, 'border_strong')};
  border-radius: ${props => themeRadius(props.theme, 'full')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  display: inline-flex;
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 700 })}
  font-variant-numeric: tabular-nums;
  height: ${props => themeIconSize(props.theme, 'md')};
  justify-content: center;
  min-width: ${props => themeIconSize(props.theme, 'md')};
  padding: 0 ${props => themeSpace(props.theme, 'xs')};
  /* whole beside its tab's label, which ends in … instead */
  flex-shrink: 0;
  /* a count of components.badge (neutral, sm) */
  ${({ theme }) => badgeCss(theme, { variant: 'neutral', size: 'sm', count: true, weight: 700 })}
`

export const OfferTabDescription = styled.p`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  /* the panel starts space.lg under the tab bar, as the section's gap kept them apart */
  margin: ${props => themeSpace(props.theme, 'lg')} 0 ${props => themeSpace(props.theme, 'md')};
`

export const OfferList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'md')};
`

export const OfferLoadingState = styled.div`
  align-items: center;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  display: flex;
  flex-direction: column;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  gap: ${props => themeSpace(props.theme, 'md')};
  justify-content: center;
  min-height: calc(2.1 * ${props => themeSize(props.theme, 'xl')});
`

export const OfferSpinner = styled.span`
  /* the md spinner of the theme (components.spinner) */
  ${props => spinnerRules(props.theme, 'md')}
`

export const OfferCard = styled.article`
  align-items: center;
  display: flex;
  gap: ${props => themeSpace(props.theme, 'lg')};
  padding: ${props => themeSpace(props.theme, 'lg')};
  position: relative;

  ${({ $unavailable }) => $unavailable && css`
    background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  `}

  /* the card is not a control (its button is): it stays still */

  @media (max-width: 480px) {
    align-items: stretch;
    flex-wrap: wrap;
  }
  /* components.card */
  ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  ${props => blockStill(props.theme)}
`

// The action of a card (Apply, Remove): its Button as wide as it is; on a
// phone it takes the card's whole line and the Button fills it
export const OfferAction = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;

  @media (max-width: 480px) {
    flex-basis: 100%;
  }
`

export const OfferRate = styled.span`
  align-items: center;
  background: ${({ theme }) => themeColor(theme, 'primary')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
  color: ${({ theme }) => onPrimary(theme)};
  display: flex;
  flex: 0 0 auto;
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 700 })}
  height: ${props => themeSize(props.theme, 'lg')};
  justify-content: center;
  width: ${props => themeSize(props.theme, 'xl')};
  /* an icon tile of the theme (lg, primary) holding the rate */
  ${props => iconTileRules(props.theme, { size: 'lg', variant: 'primary' })}
`

export const AppliedOfferIcon = styled.span`
  align-items: center;
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
  color: ${({ theme }) => primaryText(theme)};
  display: flex;
  flex: 0 0 auto;
  height: ${props => themeSize(props.theme, 'lg')};
  justify-content: center;
  width: ${props => themeSize(props.theme, 'xl')};

  svg {
    height: ${props => themeIconSize(props.theme, 'md')};
    width: ${props => themeIconSize(props.theme, 'md')};
  }
  /* an icon tile of the theme (lg, subtle) */
  ${props => iconTileRules(props.theme, { size: 'lg', variant: 'subtle' })}
`

export const OfferCardContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'xs')};
  min-width: 0;

  h4,
  p {
    margin: 0;
  }

  /* the name of the offer: the title of its card */
  h4 {
    color: ${({ theme }) => themeColor(theme, 'text')};
    ${props => headingText(props.theme, 'h4')}
  }

  p,
  small {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
  }

  small {
    color: ${({ theme }) => themeColor(theme, 'danger_text')};
  }
`

export const OfferCode = styled.span`
  color: ${({ theme }) => primaryText(theme)};
  ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 700 })}
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const OfferState = styled.div`
  align-items: center;
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'sm')};
  padding: ${props => themeSpace(props.theme, 'xl')} ${props => themeSpace(props.theme, 'lg')};
  text-align: center;

  > svg {
    color: ${({ theme }) => themeColor(theme, 'text_disabled')};
    height: ${props => themeSize(props.theme, 'sm')};
    margin-bottom: ${props => themeSpace(props.theme, 'xxs')};
    width: ${props => themeSize(props.theme, 'sm')};
  }

  strong {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }

  span {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }

  button {
    margin-top: ${props => themeSpace(props.theme, 'sm')};
  }
`
