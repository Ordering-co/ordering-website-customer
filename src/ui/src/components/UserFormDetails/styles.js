import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { DEFAULT_CONTROL_SIZE, themeRadius, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'
import { fieldGap, fieldLabelCss, fieldMessageCss } from '~ui/src/styles/Field'
import { layerBackground } from '~ui/src/styles/Layer'
import { IN_OVERLAY } from '~/utils/overlay'

export const FormInput = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0 auto;

  div.phone_number {
    width: 100%;
  }

  @media (min-width: 769px) {
    flex-wrap: wrap;
    flex-direction: row;
    justify-content: space-between;
  }
  ${props => blockStill(props.theme)}
`

// A notice under a field that is not an error: the helper text of components.field
export const AccountNotice = styled.p`
  display: block;
  padding: 0;
  text-align: start;
  ${({ theme }) => fieldMessageCss(theme)}
`

export const ActionsForm = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  /* keep Save/Continue visible while the profile form scrolls on mobile */
  @media (max-width: 768px) {
    position: sticky;
    bottom: 0;
    background-color: ${props => layerBackground(props.theme)};
    z-index: 10;
  }

  /* below 576px the fixed bottom NavigationBar (~65px, z-index 1005)
     sits at bottom:0 and covers this CTA. Lift it clear, matching the
     offset used by the other mobile bottom bars. */
  @media (max-width: 575px) {
    bottom: ${props => bottomNavHeight(props.theme)}px;

    /* implementation notesin a modal (it covers the NavigationBar) there is nothing to
       clear: the bar sticks to the bottom of the modal, as from 576 to 768px.
       The ancestor selector wins by specificity, whatever the order. */
    ${IN_OVERLAY} {
      bottom: 0;
    }
  }

  /* md between the buttons, sm around them while they stick */
  ${({ theme }) => css`
    gap: ${themeSpace(theme, 'md')};
    @media (max-width: 768px) {
      padding: ${themeSpace(theme, 'sm')} 0;
    }
  `}

  /* implementation notesa checkout section sits inside the StepCard (overflow hidden),
     where the sticky bar, lifted by bottom, painted over the fields above it.
     In flow and plain there, like desktop. Last, so it beats the padding above. */
  ${({ $inFlow }) => $inFlow && css`
    @media (max-width: 768px) {
      position: static;
      background: none;
      z-index: auto;
      padding: 0;
    }
  `}
`

/* The room of an action of the row (Cancel, Continue): half of it, or all when
   alone. Layout only: the button is the piece and fills it. */
export const FillAction = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`

/* The room of Save: centered in the row at the button's own width, or all of
   it when the theme makes a main action full width; beside Cancel it keeps
   its width and Cancel takes the rest. */
export const CenterAction = styled.div`
  display: flex;
  flex: ${({ $beside }) => ($beside ? '0 1 auto' : '1 1 auto')};
  justify-content: center;
  min-width: 0;
`

export const SkeletonForm = styled.div`
  width: 100%;
  justify-content: center;
  height: auto;
  display: inline-flex;
  flex-wrap: wrap;
  padding: 0;
  margin-top: 0px;

  > * {
    display: inline;

    span{
      width: 100%;
      height: 100%;
    }
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 768px){
    justify-content: flex-start;
  }
  /* a field of components.input (its height and radius), md
     apart as the form's fields */
  ${({ theme }) => css`
    && > * {
      width: 100%;
      margin: 0 0 ${themeSpace(theme, 'md')};
      height: ${getThemeCss(theme, 'input').sizes[DEFAULT_CONTROL_SIZE].height};
    }
    && > * span {
      border-radius: ${themeRadius(theme, 'lg', 'input')};
    }
  `}
  ${props => blockStill(props.theme)}
`

export const InputGroup = styled.div`
  width: 100%;

  p {
    ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 500 })}
    color: ${props => themeColor(props.theme, 'text')};
    width: 100%;
    text-align: left;
    margin: 0 0 ${props => themeSpace(props.theme, 'sm')};
    ${props => blockStill(props.theme)}
  }

  &:hover p {
    color: ${props => primaryText(props.theme)};
  }
  /* the field's label (components.field: its text, color and
     label_gap over it), still (no hover: the title is not a control), the
     field's gap under the group (the form rhythm) */
  ${({ theme }) => css`
    margin-bottom: ${fieldGap(theme)};
    && > p, && > label {
      display: block;
      color: ${themeColor(theme, 'text')};
      width: 100%;
      text-align: start;
      ${fieldLabelCss(theme)}
    }
    &:hover > p, &:hover > label {
      color: ${themeColor(theme, 'text')};
    }
  `}
  ${props => blockStill(props.theme)}
`

// The phone field (and the birthdate) group: its label and its piece; the field's box is the base InputPhone's
export const InputPhoneNumberWrapper = styled(InputGroup)``

export const LanguageSelectorWrapper = styled(InputGroup)`
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
`

export const PromotionsWrapper = styled.div`
  display: flex;
  margin: ${props => themeSpace(props.theme, 'md')} 0;
  width: 100%;

  > label {
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    cursor: pointer;

    ${props => props.theme?.rtl
? css`
      margin-right: ${props => themeSpace(props.theme, 'sm')};
    `
: css`
      margin-left: ${props => themeSpace(props.theme, 'sm')};
    `}

    > span:first-child {
      font-weight: 500;
      ${props => props.theme?.rtl
? css`
        margin-left: ${props => themeSpace(props.theme, 'sm')};
      `
: css`
        margin-right: ${props => themeSpace(props.theme, 'sm')};
      `}
      ${props => blockStill(props.theme)}
    }

    > a {
      color: ${props => primaryText(props.theme)} !important;
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 768px) {
    > label {
      ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    }
  }
  ${props => blockStill(props.theme)}
`

/* the notification settings, a list of choices
   (components.choice) the choice gap apart like the other choice lists, with no
   card of their own */
export const NotificationChoiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
  width: 100%;
  margin: 0;
  text-align: start;
`
