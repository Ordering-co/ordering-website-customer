import styled, { css } from 'styled-components'
import { getThemeComponent, getThemeMobileOverrides } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { dividerRules } from '~ui/src/styles/Divider'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'
import { layerBackground } from '~ui/src/styles/Layer'
import { KEYBOARD_OPEN_IN_FLOW } from '~ui/hooks/useKeyboardOpen'

// the theme's `components.button.base.cta_full_width`, read as the Button piece reads it (the phone's value over the screen's)
const ctaFullWidth = (theme) => {
  const phone = theme.platform ? getThemeMobileOverrides(theme, 'button')?.base?.cta_full_width : undefined
  return phone ?? getThemeComponent(theme, 'button')?.base?.cta_full_width
}

export const Wrapper = styled.div`
  .subtitle {
    margin: 0 0 ${props => themeSpace(props.theme, 'xl')};
    ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ReviewDriverContainer = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  .extra-comment-title {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const Comments = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;

  p {
    text-transform: capitalize;
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'sm')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`
export const Send = styled.div`
  align-items: center;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;

  /* keep the primary CTA visible while the review scrolls on mobile */
  @media (max-width: 768px) {
    position: sticky;
    ${KEYBOARD_OPEN_IN_FLOW}
    bottom: 0;
    background-color: ${props => layerBackground(props.theme)};
    padding: ${props => themeSpace(props.theme, 'sm')} 0;
    z-index: 10;
  }

  /* the action's width is the column's (the button fills it): the full row on
     the simple rating or when the theme's main actions are full width, 36ch otherwise and 25ch on a phone */
  display: grid;
  justify-content: center;
  grid-template-columns: ${({ useSimpleRating, theme }) => (useSimpleRating || ctaFullWidth(theme)) ? '100%' : 'min(100%, 36ch)'};
  @media (max-width: 512px) {
    grid-template-columns: ${({ theme }) => ctaFullWidth(theme) ? '100%' : 'min(100%, 25ch)'};
  }
  ${props => blockStill(props.theme)}
`

export const ReviewsProgressWrapper = styled.div`
  width: 100%;
  margin-top: ${props => themeSpace(props.theme, 'xl')};

  ${({ useSimpleRating }) => useSimpleRating && css`
    margin-top: ${props => themeSpace(props.theme, 'lg')};
  `}

  p {
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }

  .rating-container {
    display: flex;
    gap: ${props => themeSpace(props.theme, 'md')};
    justify-content: flex-start;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const LogoAndReviewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  .comments-title {
    margin-top: 0px;
    margin-bottom: 0px;
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    ${props => blockStill(props.theme)}
  }

  .driver-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .driver-text {
      p {
        margin: 0;
        ${props => themeText(props.theme, 'body', { props: ['size'] })}
        ${props => blockStill(props.theme)}
      }
      .bold {
        ${props => blockStill(props.theme)}
        /* the section's title is a heading one level below the modal's
           title, of that level's typography */
        margin: 0;
        ${props => headingText(props.theme, modalSectionLevel(props.theme))}
      }
    }
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const CommentsList = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxs')};
  display: flex;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'md')};
  margin: ${props => themeSpace(props.theme, 'sm')} 0;

  > div {
    display: flex;
    ${({ theme }) => theme.rtl && css`
      margin-inline-end: ${themeSpace(theme, 'xxxl')};
    `}
  }
  ${props => blockStill(props.theme)}
`

export const DriverInfoBlock = styled.p`
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  margin-bottom: 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  text-align: center;
  color: ${props => themeColor(props.theme, 'text')};
  ${props => blockStill(props.theme)}
`

export const Divider = styled.div`
  ${props => blockStill(props.theme)}
  /* components.divider section */
  ${props => dividerRules(props.theme, 'section')}
`
