import styled, { css, keyframes } from 'styled-components'
import { focusRingReach } from '~ui/src/styles/Focus'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeBorderStyle, themeBorderWidth, themeRadius, themeShadow, themeSpace, themeText } from '~/utils/themeTokens'
import { themeTextKeepWeight } from '~/utils/productCartTheme'
import { motionEasing, themeMotionEnabled } from '~/utils/themeMotion'
import { bottomBarPaddingCss, bottomBarTypingCss, bottomNavDockedRules, bottomNavHeight } from '~ui/src/components/NavigationBar/styles'

export const ProductsContainer = styled.div`
  width: 95%;
  margin: ${({ theme }) => themeSpace(theme, 'xl')} auto 0;

  ${({ singleBusinessRedirect }) => singleBusinessRedirect && css`
    margin: 0px auto 0px;
  `}
  /* the store starts xl under the header, as under the order
     context docked below it on small screens (its margin); not glued to the
     header's bottom border */
  ${({ theme, $docked }) => !$docked && css`
    margin-top: ${themeSpace(theme, 'xl')};
  `}

  > svg {
    color: ${props => themeColor(props.theme, 'text')};
    ${({ theme }) => themeText(theme, 'h2', { props: ['size'] })}
    cursor: pointer;
    margin-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  }
  > div {
    background-color: ${(props) => themeColor(props.theme, 'background')};
  }
`

export const ProductLoading = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`

export const SkeletonItem = styled.div`
  width: 80%;
  margin: ${({ theme }) => themeSpace(theme, 'xxl')} auto;

  span {
    margin-bottom: ${({ theme }) => themeSpace(theme, 'md')};
  }
`
export const MOBILE_NAV_BOTTOM_OFFSET = 65

/* The bar's answer to a product add: a tint that fades back. Two identical keyframes, taken in turn
   by `data-cart-pulse` 0 / 1, so each add restarts it without remounting the bar (its button keeps the focus). They
   differ in text (`0%` / `from`): styled-components names a keyframes by its content, and one name twice would not restart.
   Off when the system reduces motion (the total and count still update) or the identity turns motion off. */
const cartBarPulseA = keyframes`
  0% { background-color: var(--cart-pulse-from); }
`
const cartBarPulseB = keyframes`
  from { background-color: var(--cart-pulse-from); }
`

export const MobileCartViewWrapper = styled.div`
  --cart-pulse-from: ${({ theme }) => themeColor(theme, 'primary_subtle')};
  position: fixed;
  width: 100%;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => themeColor(props.theme, 'surface')};
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xl')};
  /* Keep content clear of mobile browser chrome / device safe area so the bar is never clipped off-screen */
  padding-bottom: calc(${props => themeSpace(props.theme, 'lg')} + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${props => themeSpace(props.theme, 'md')};
  box-sizing: border-box;
  z-index: 1006;
  box-shadow: ${props => themeShadow(props.theme, 'lg')};

  /* the mobile bottom NavigationBar (fixed, ~65px, z-index 1005,
     rendered <576px) also sits at bottom:0 — without this offset the cart
     bar fully covers it and Home/Explore/Orders/Profile become unreachable */
  @media (max-width: 575px) {
    bottom: ${props => bottomNavHeight(props.theme)}px;
  }
  /* a bar at the bottom, docked above the bottom navigation on
     small screens: its background, its padding and its shadow cast up
     (components.bottom_nav), on every screen; its top border only where it
     is the lowest bar */
  ${props => bottomNavDockedRules(props.theme, { aboveNav: true })}
  ${props => bottomBarPaddingCss(props.theme)}
  /* while a text field is being typed in the bar gives way */
  ${props => bottomBarTypingCss(props.theme)}
  ${({ theme }) => themeMotionEnabled(theme) && css`
    @media (prefers-reduced-motion: no-preference) {
      &[data-cart-pulse='0'] {
        animation: ${cartBarPulseA} ${theme.values.tokens.motion.slow}ms ${motionEasing(theme)} 1;
      }
      &[data-cart-pulse='1'] {
        animation: ${cartBarPulseB} ${theme.values.tokens.motion.slow}ms ${motionEasing(theme)} 1;
      }
    }
  `}
`

export const MobileCartActions = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  > span {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}

    @media (min-width: 1200px) {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
    }
  }
  /* the bar's price (cart.base.bar_price, bold as today) at every width */
  ${({ theme }) => `&& > span { ${themeTextKeepWeight(theme, 'cart', 'bar_price')} }`}
`

export const BusinessCartContent = styled.div`
  background: ${props => themeColor(props.theme, 'surface')};
  padding: ${({ theme }) => themeSpace(theme, 'xxl')};
  position: relative;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xxl')};
  max-height: ${({ maxHeight }) => `${maxHeight}px`};
  overflow: auto;

  .product.accordion {
    margin: 0;
  }

  /* .accordion.active {
    padding-bottom: 10px;
  } */

  ${({ isModal }) => !isModal && css`
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};
    box-shadow: ${props => themeShadow(props.theme, 'lg')};
    border-radius: ${props => themeRadius(props.theme, 'sm')};
  `}

  @media (min-width: 1200px) {
    position: sticky;
    top: 0;
  }

  @media (min-width: 768px) {
    padding: ${({ theme }) => themeSpace(theme, 'xxl')};
  }
  /* in the cart modal: the modal's padding and background (its title row is
     the modal's), none of its own; at its sides room for the focus ring
     the products' block reaches into, so it never scrolls sideways */
  ${({ isModal, theme }) => isModal && css`
    &&& {
      padding: 0;
      margin-bottom: 0;
      background: transparent;
      margin-inline: -${focusRingReach(theme)}px;
      padding-inline: ${focusRingReach(theme)}px;
    }
  `}
`

export const EmptyCart = styled.div`
  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* the icon (EmptyStateIcon) paints and sizes itself; no rule here */

    p {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      color: ${props => themeColor(props.theme, 'text_muted')};
      margin: ${props => themeSpace(props.theme, 'xl')} 0 0 0;
    }
  }
`
export const Title = styled.h3`
  ${props => headingText(props.theme, 'h3')}
  color: ${props => themeColor(props.theme, 'text')};
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
`
export const StoreRecoveryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

export const EmptyBtnWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};

  > span:first-child {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

export const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

  ${props => props.switchFlex && css`
    flex-direction: column;
    align-items: flex-start;
  `}
`

export const OrderContextUIWrapper = styled.div`
  flex: 1;
  width: 100%;
  ${props => props.theme.rtl && css`
    margin-left: 0px;
    margin-right: ${props => themeSpace(props.theme, 'lg')};
  `}
`

export const SpinnerCart = styled.div`
  position: absolute;
  right: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`
