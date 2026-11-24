import { ChartLabelButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { getThemeCss, getThemeMobileCss } from '~/utils/themeCss'
import { MOBILE_TOUCH_QUERY } from '~ui/src/styles/TouchSlot'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'
import { headingText, themePart, themeScrollbar, themeSize, themeIconSize, themeShadow, themeSpace, themeText, themeValue, blockStill } from '~/utils/themeTokens'

// The size of the icon inside the reviews' search field
// (components.search_bar's icon_size, over input's)

export const BusinessReviewsContainer = styled.div`
  width: 100%;
  overflow-x: hidden;
  padding: 0px;
  box-sizing: border-box;
  .reviews-container-column {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
`

export const ReviewOf = styled.div``

// A value of components.business_reviews (base.<key>).
const reviewsValue = (theme, key) => themeValue(theme, 'business_reviews', `base.${key}`)

// Reserve the shadow's reach at the end of the carousel (zero without a shadow).
const cardShadowEnd = (theme) => getThemeCss(theme, 'card').base.shadow.reach[theme.rtl ? 'left' : 'right']

// AutoScroll draws square sm Buttons. Their height includes their border,
// and on phones the piece takes the mobile override before the regular size.
const scrollArrowWidth = (theme) => {
  const mobileHeight = theme.platform && getThemeMobileCss(theme, 'button')?.sizes?.sm?.height
  return mobileHeight || getThemeCss(theme, 'button').sizes.sm.height
}

export const Content = styled.div`
  overflow: auto hidden;
  width: 100%;
  ::-webkit-scrollbar {
    width: ${props => themeScrollbar(props.theme).size};
    height: ${props => themeScrollbar(props.theme).size};
  }
  /* no scroll anchoring (it would correct a smooth scroll by item when the
     arrows change) */
  overflow-anchor: none;
  /* a thin scroll of the theme's colors, with the standard properties (Chrome
     ignores ::-webkit-scrollbar once scrollbar-width is set): the thumb of the
     strong border over a clear track */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => themeColor(theme, 'border_strong')} transparent;

  > div {
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    align-items: center;

    h3 {
      display: none;
    }

    @media (min-width: 480px) {
      h3 {
        display: block;
        color: ${props => primaryText(props.theme)};
        margin: 0px;
        svg {
          font-size: ${props => themeIconSize(props.theme, 'lg')};
          vertical-align: text-top;
        }
      }
    }

    #reviews > div {
      margin-inline-end: ${props => themeSpace(props.theme, 'xl')};
      /* a card of the theme (components.card), its whole border */
      ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
      /* the theme's md space above and below the cards */
      margin-top: ${({ theme }) => themeSpace(theme, 'md')};
      margin-bottom: ${({ theme }) => themeSpace(theme, 'md')};
    }

    /* The first and last cards are the scroll anchors. The arrows stay in
       flow for sticky positioning, but cancel their own width on the side
       facing the cards. Only the last card's shadow needs room at the end. */
    ${({ theme }) => css`
      #reviews > div:last-of-type {
        margin-inline-end: ${cardShadowEnd(theme)}px;
      }
      #reviews > .right-autoscroll {
        margin-inline-start: calc(-1 * ${scrollArrowWidth(theme)});
      }
      #reviews > .left-autoscroll {
        margin-inline-end: calc(-1 * ${scrollArrowWidth(theme)});
      }
      /* Keep the same flow during smooth scrolling. The hidden arrow's
         touch target must not extend the scrollable area past the cards. */
      #reviews > .hidden {
        display: inline-block;
        visibility: hidden;
        contain: paint;
        pointer-events: none;
      }
    `}

    ${({ isColumnMode }) => isColumnMode && css`
      justify-content: center;

      #reviews > div {
        margin-inline-end: 0;
      }
    `}
  }
`

export const Review = styled.div`
  padding: ${props => themeSpace(props.theme, 'lg')};
  margin: ${props => themeSpace(props.theme, 'md')} 0;
  width: ${props => getThemeCss(props.theme, 'business_reviews').base.card_width};
  height: calc(3 * ${props => themeSize(props.theme, 'xl')});
  /* transition: all 0.3s ease;
  box-shadow: ${props => themeShadow(props.theme, 'sm')};

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => themeShadow(props.theme, 'xl', { fixed: true })};
  } */

  @media (min-width: 480px) {
    margin: ${props => themeSpace(props.theme, 'xl')} 0;
  }

  ${({ reviewName, theme }) => !reviewName && css`
    height: calc(2.5 * ${themeSize(theme, 'xl')});
  `}

  ${({ isColumnMode }) => isColumnMode && css`
    height: unset;
  `}
`

export const SkeletonContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    flex: 1;

    > div {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
    }
`

export const ReviewsHeaderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  svg {
    font-size: ${props => themeSize(props.theme, 'sm')};
    color: ${props => primaryText(props.theme)};
    margin-right: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
       margin-left: ${props => themeSpace(props.theme, 'md')};
       margin-right: 0;
    `}
  }
  /* "Reviews" (the title of the section), "Ranking" (of the modal) */
  h2 {
    margin: ${props => themeSpace(props.theme, 'xl')} 0 0;
    ${props => headingText(props.theme, 'h2')}
  }
  /* the ratings count: a link, not a heading. No z-index: as a flex item it
     would stack it over the fixed cart bar (z 1006) while the page scrolls */
  p.ratings {
    ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 400 })}
    margin: 0;
    color: ${props => themeColor(props.theme, 'text')};
    span {
      cursor: pointer;
    }
  }

  ${({ noReviews }) => noReviews && css`
    svg {
      color: ${props => themeColor(props.theme, 'text_disabled')};
    }
  `}

  ${({ isColumnMode, theme }) => isColumnMode && css`
    h2 {
      margin: 0 0 0 ${themeSpace(theme, 'xxl')};
    }
  `}

  ${({ isModal, theme }) => isModal && css`
    h2 {
      margin: 0 0 ${themeSpace(theme, 'xxxl')};
      ${props => headingText(props.theme, 'h2')}
    }
  `}
  /* a section of the business page: a section title (components.section_header:
     its text and color), no space of its own above it (the page parts its
     sections by the same space) */
  ${({ isModal, isColumnMode, theme }) => !isModal && !isColumnMode && css`
    h2 {
      margin-top: 0;
      ${sectionTitleTextCss(theme, { level: 'h2' })}
    }
  `}
`

export const ReviewsProgressWrapper = styled.div`
  overflow-x: auto;

  p {
    margin-top: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

export const ReviewsProgressContent = styled.div`
  /* touch-target */ --reviews-rating-target: 44px;
  min-inline-size: calc(5 * var(--reviews-rating-target));
  min-block-size: calc(${({ theme }) => getThemeCss(theme, 'progress').sizes.sm.height} + ${({ theme }) => themeSpace(theme, 'xxl')});
  display: grid;
  grid-template-rows: minmax(${({ theme }) => themeSpace(theme, 'lg')}, auto) 1fr;
  align-items: start;
`

// Reserve one lane at the last mark and divide the remaining width evenly.
export const ReviewsRatingTargets = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(var(--reviews-rating-target), 1fr)) minmax(var(--reviews-rating-target), max-content);

  @media ${MOBILE_TOUCH_QUERY} {
    min-block-size: var(--reviews-rating-target);
  }
`

// A rating of the ranking: a button that filters the reviews by it (pressed
// while it does)
export const ReviewsMarkPoint = (props) => <ChartLabelButton {...props} />

export const ReviewTime = styled.p`
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
  margin: 0;
`

export const ReviewItemHeader = styled.div`
  display: flex;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  p {
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  }

  /* the author of the review: the title of its block */
  h3 {
    ${props => headingText(props.theme, 'h3')}
    margin: 0;
  }

  .review-info {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .review-time {
    margin-top: ${props => themeSpace(props.theme, 'xs')};
  }


`

export const ReviewItemContent = styled.div`
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${props => Math.round(reviewsValue(props.theme, 'comment_lines'))};
  overflow: hidden;
  white-space: pre-wrap;

  ${({ isEmpty }) => isEmpty && css`
    color: ${props => themeColor(props.theme, 'text_disabled')};
    font-style: italic;
  `}
`

export const SearchContainer = styled.div`
  margin: ${props => themeSpace(props.theme, 'xxl')} 0;
`

export const ReviewStars = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'xxs')};

  .star {
    ${props => blockStill(props.theme)}
  }

  ${({ reviewName }) => reviewName && css`
    > p {
      margin-left: ${props => themeSpace(props.theme, 'xs')};
    }
  `}
`

export const ReviewRatingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  /* the average rating: a figure, not a heading */
  .rating {
    margin: 0;
    ${props => themeText(props.theme, 'display', { props: ['size', 'weight', 'family'], weight: 700 })}
    color: ${props => themeColor(props.theme, 'text')};

    p {
      margin: 0;
      ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
      color: ${props => themeColor(props.theme, 'text')};
      text-align: center;
    }
  }
`

// The ratings count that opens the reviews: a button of components.link (lg).
export const RatingsLink = (props) => (
  <Button {...props} appearance='link' size='lg' />
)
