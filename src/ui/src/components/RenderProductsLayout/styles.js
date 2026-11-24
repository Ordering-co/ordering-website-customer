import styled, { css } from 'styled-components'
import { focusRingReach } from '~ui/src/styles/Focus'
import { themeColor } from '~/utils/themeColors'
import { getThemeCss } from '~/utils/themeCss'
import { headingText, themePart, themeRadius, themeShadow, themeSpace, themeText, themeScrollbar, themeSize } from '~/utils/themeTokens'
import { bottomBarTypingCss, bottomNavHeight } from '~ui/src/components/NavigationBar/styles'
import { productSectionImage } from '~ui/src/components/BusinessProductsList/styles'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

export const Title = styled.h3`
  ${props => headingText(props.theme, 'h3')}
  color: ${props => themeColor(props.theme, 'text')};
  margin-top: 0;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
`

export const WrappLayout = styled.div``

export const WrapContent = styled.div`
  padding: ${props => themeSpace(props.theme, 'xs')};
  background: ${props => themeColor(props.theme, 'background')};

  ${({ isGroceries, categoryClicked }) => !isGroceries && !categoryClicked
? css`
    margin-top: ${props => themeSpace(props.theme, 'xxxl')};
  `
: css`
    margin-top: ${props => themeSpace(props.theme, 'xxl')};
  `}

  /* no side inset under 576px either, the cards and the category titles
     line up with the banner and the category bar */
  padding-left: 0;
  padding-right: 0;

  @media (min-width: 576px) {
    padding: 0px;

    ${({ isGroceries }) => !isGroceries && css`
      margin-top: ${props => `var(--header-height, ${getThemeCss(props.theme, 'header').base.height})`};
    `}
  }

  @media (min-width: 993px) {
    ${({ isGroceries }) => !isGroceries && css`
      margin-top: ${props => `var(--header-height, ${getThemeCss(props.theme, 'header').base.height})`};
    `}
  }

  &#businessProductList {
    > div {
      margin-top: ${props => themeSpace(props.theme, 'xxl')};
    }
  }
`

export const BusinessContent = styled.div`
  margin-top: ${props => props.isCustomLayout ? 0 : themeSpace(props.theme, 'xxl')};
  display: flex;
  flex-direction: column;

  @media (min-width: 993px) {
    flex-direction: row;
  }
`

export const BusinessCategoryProductWrapper = styled.div`
  width: 100%;

  /* Hide scrollbar for Chrome, Safari and Opera */
  .category-lists::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .category-lists {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  @media (min-width: 1000px) {
    ${({ showCartOnProductList }) => showCartOnProductList && css`
      width: 70%;
    `}
  }
`

export const BusinessCategoriesContainer = styled.div`
  margin: 0;
  margin-right: ${props => themeSpace(props.theme, 'md')};
  width: 100%;
  ${(props) => !props.offSticky && css`
    top: ${props => `var(--header-height, ${getThemeCss(props.theme, 'header').base.height})`};
    position: sticky;
  `}
  @media (min-width: 993px) {
    width: calc(31% - ${props => themeSpace(props.theme, 'xl')});
  }
`

export const BusinessCartContainer = styled(BusinessCategoriesContainer)`
  display: none;
  margin-top: ${props => `var(--header-height, ${getThemeCss(props.theme, 'header').base.height})`};
  min-width: min(100%, 40ch);
  height: fit-content;
  @media (min-width: 769px) {
    ${({ isProfessional }) => isProfessional && css`
      margin-top: 0px;
    `}
  }
  @media (min-width: 1000px) and (min-height: 600px) {
    display: block;
  }
`

export const BusinessCartContent = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxl')};
  position: relative;
  margin-bottom: ${props => themeSpace(props.theme, 'xxl')};
  max-height: ${({ maxHeight }) => `${maxHeight}px`};
  overflow: auto;

  .product.accordion {
    margin: 0;
  }

  /* .accordion.active {
    padding-bottom: 10px;
  } */

  ${({ isModal }) => !isModal && css`
    /* the cart beside the products is a card (components.card)
       of the cart's background, radius and shadow (components.cart) */
    ${props => themePart(props.theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
    ${props => themePart(props.theme, 'cart', { background: 'base.background', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
  `}

  @media (min-width: 1200px) {
    position: sticky;
    top: 0;
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

export const EmptyBtnWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
`

export const EmptyCartTotal = styled.span`
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
  color: ${props => themeColor(props.theme, 'text')};
`

export const EmptyCartMessage = styled.span`
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`

export const MobileCartViewWrapper = styled.div`
  position: fixed;
  /* the viewport's width by its two sides, not 100vw: a vw unit can be wider than what the screen shows (a
     scrollbar, a viewport that changed as the Duo unfolds) and widen the page sideways () */
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => themeColor(props.theme, 'surface')};
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'xl')};
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  z-index: 1000;
  box-shadow: ${props => themeShadow(props.theme, 'lg')};

  /* keep clear of the mobile bottom NavigationBar (fixed, bottomNavHeight, z-index 1005) */
  @media (max-width: 575px) {
    bottom: ${props => bottomNavHeight(props.theme)}px;
  }

  /* while a text field is being typed in the bar gives way () */
  ${props => bottomBarTypingCss(props.theme)}

  span {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
  }
`

export const WrapperSearch = styled.div`
  margin: ${props => themeSpace(props.theme, 'lg')} 0 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  .search-bar {
    margin-right: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
      margin-right: 0;
    `}
    input {
      width: 100%;

      @media (min-width: 500px) {
        width: min(100%, 30ch);
      }
    }
  }

  div:last-child {
    text-align: right;

    ${props => props.theme?.rtl && css`
      text-align: left;
    `}
  }
`

export const ProfessionalFilterWrapper = styled.div`
  padding-bottom: ${props => themeSpace(props.theme, 'xxl')};
  ${({ isTop }) => isTop && css`
    margin-top: ${props => themeSpace(props.theme, 'xl')};
  `}
`

export const WrapperSearchAbsolute = styled.div`
  position: absolute;
  right: ${props => themeSpace(props.theme, 'xs')};
  top: 0px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  width: ${props => themeSize(props.theme, 'md')};
  height: ${props => themeSize(props.theme, 'xl')};
  background-color: ${props => themeColor(props.theme, 'background')};
  box-sizing: border-box;
  padding-bottom: ${props => themeSpace(props.theme, 'xs')};
`

/* The sections between the business and its menu (pages.business, group
   main), in the theme's order. Each one the theme's xl space under it, the space between sections. A block of blocks: the margins of
   two neighbours collapse into the larger one, so a section's own margin
   (the carousel's margin_y) is not added to it, an empty section leaves no
   gap and the space holds in any order; the last one's meets the menu's. */
export const BusinessSections = styled.div`
  && > * {
    margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};
  }
  /* in the store page's designs a section with nothing in it (an offers banner without banners) takes no space */
  ${({ $designs }) => $designs && css`
    && > *:empty {
      display: none;
    }
  `}
`

export const NearBusiness = styled.div`
  width: 100%;
`

export const PageBannerWrapper = styled.div`
  > div {
    border-radius: ${props => themeRadius(props.theme, 'sm')};
  }
`

export const BackButton = styled.div``
export const ProductsListing = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: ${({ isSubcategorySearch, theme }) => isSubcategorySearch ? 0 : themeSpace(theme, 'xxxl')};
`

export const WrapAllCategories = styled.div`
  /* "Featured items", a section of the business page like the
     categories (h2) */
  h2 {
    ${props => headingText(props.theme, 'h2')}
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0 0 ${props => themeSpace(props.theme, 'md')};
    /* a section title (section_header: its text and color) */
    ${props => sectionTitleTextCss(props.theme, { level: 'h2' })}
  }
  .category-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    padding-top: ${props => themeSpace(props.theme, 'xs')};
    padding-bottom: ${props => themeSpace(props.theme, 'md')};
    margin-left: ${props => themeSpace(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
      margin-right: ${props => themeSpace(props.theme, 'md')};
      margin-left: 0;
    `}

    img {
      border-radius: ${props => themeRadius(props.theme, 'sm')};
      min-width: ${props => themeSize(props.theme, 'md')};
      min-height: ${props => themeSize(props.theme, 'md')};
      height: ${props => themeSize(props.theme, 'md')};
      width: ${props => themeSize(props.theme, 'md')};
      margin-right: ${props => themeSpace(props.theme, 'md')};
      ${props => props.theme?.rtl && css`
        margin-left: ${props => themeSpace(props.theme, 'md')};
        margin-right: 0;
      `}
      ${props => productSectionImage(props.theme)}
    }

    @media (min-width: 993px) {
      margin: 0px;
    }
  }
`

export const ProductListWrapper = styled.div`
  overflow: auto hidden;
  width: 100%;
  ::-webkit-scrollbar {
    width: ${props => themeScrollbar(props.theme).size};
    height: ${props => themeScrollbar(props.theme).size};
  }
`

export const ProductList = styled.div`
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  align-items: center;

  #featured > div {
    width: min-content;
  }
`
