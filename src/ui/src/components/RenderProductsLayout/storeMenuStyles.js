import styled, { css } from 'styled-components'

import { themeColor } from '~/utils/themeColors'
import { themeBorderWidth, themeMedia, themeOpacity, themePart, themeRadius, themeShadowDown, themeSpace, themeText } from '~/utils/themeTokens'
import { layerBackground } from '~ui/src/styles/Layer'
import { WrapAllCategories, productsGridCss } from '../BusinessProductsList/styles'
import { productImageCss, productInfoGap } from '../SingleProductCard/styles'
import { cardBoxCss, cardInnerControlCss, stretchedCardCss } from '~ui/src/styles/Card'
import { BusinessCartContent } from './styles'
import { badgeCss } from '~ui/src/styles/Badge'
import { focusRingCss } from '~ui/src/styles/Focus'
import { DESKTOP_MIN_WIDTH } from './storePageTemplate'

/* The store page's menu in its three designs (components.store_page.base.template): the direct menu (`menu`), the
   visual showcase (`showcase`) and the classic (`cover`): a bar with the search and the tabs, cards in columns. Everything is the theme's: its space, its radius, its colors and the product
   card's own name, description and price. The geometry (a cover's height, a column's width) is a level of
   `components.media` or a multiple of a space, as the repo's px map asks. */

const desktop = (rules) => css`
  @media (min-width: ${DESKTOP_MIN_WIDTH}px) {
    ${rules}
  }
`

const clamp = (lines) => `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
`

/* The menu: below the desktop cut one column; from it the direct menu is the categories' list, the menu and the
   cart. `--categories-sticky-top` (written by useStickyBar) is where the bars stick: under the header and the
   fixed name of the store. */
export const MenuRoot = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-top: ${({ theme }) => themeSpace(theme, 'md')};
  ${({ $aside, $cart, theme }) => $aside && desktop(css`
    grid-template-columns: ${themeMedia(theme, '4xl')} minmax(0, 1fr)${$cart ? ` ${themeMedia(theme, '5xl')}` : ''};
    column-gap: ${themeSpace(theme, 'xxl')};
    align-items: start;
  `)}
`

export const MenuMain = styled.div`
  min-width: 0;
`

/* The sections under the bar. It has no box of its own (the layout is the sections' as ever) until the search field has
   the focus on a touch screen (implementation notes, useSearchStick): then it is as tall as what is visible under the header, so the bar can
   stay stuck there with the keyboard up even when the filter leaves one product. */
export const MenuResults = styled.div`
  display: contents;
  ${({ $room }) => $room && css`
    display: block;
    min-height: calc(var(--visual-viewport-height, 100dvh) - var(--categories-sticky-top, 0px));
  `}
`

/* A bar that sticks under the header: its background is the layer's (opaque), and once it touches what is above
   it, the shadow the theme gives a bar that is fixed on scroll (components.category_tabs) around the bar. The
   classic's bar and the showcase's chips are this one. */
const stickyBarCss = css`
  position: sticky;
  top: var(--categories-sticky-top, 0px);
  z-index: 1000;
  box-sizing: border-box;
  background: ${({ theme }) => layerBackground(theme)};
`

export const StickyBar = styled.div`
  ${stickyBarCss}
  &.is-stuck {
    ${({ theme }) => themeShadowDown(theme, 'category_tabs', 'base.sticky_shadow')}
  }
`

/* The direct menu's bar: it is only as wide as the menu's column, so its fixed shadow falls under it and nowhere
   else. The shadow is the same as the StickyBar's, on a layer the bar's own size that clips everything but the
   strip below it (clip-path on the bar itself would cut the search's focus ring, which reaches the column's
   edges). */
export const MenuBar = styled.div`
  ${stickyBarCss}
  &.is-stuck::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    ${({ theme }) => themeShadowDown(theme, 'category_tabs', 'base.sticky_shadow')}
    clip-path: inset(100% 0 -100vh 0);
  }
`

export const SearchSlot = styled.div`
  padding-block: ${({ theme }) => themeSpace(theme, 'sm')};
`

/* The classic's bar: the search above the tabs on a phone; from the desktop cut the search (a column of the
   theme's media) and the tabs on one row, the tabs' hairline under both. */
export const CoverBar = styled(StickyBar)`
  ${desktop(css`
    display: grid;
    grid-template-columns: ${({ theme }) => themeMedia(theme, '5xl')} minmax(0, 1fr);
    column-gap: ${({ theme }) => themeSpace(theme, 'xl')};
    align-items: end;
    border-bottom: ${({ theme }) => themeBorderWidth(theme, 'thin', { fixed: true })} solid ${({ theme }) => themeColor(theme, 'border')};
    > div:last-child {
      border-bottom: 0;
    }
  `)}
`

/* The tabs' row fades out at its end while more wait there (no arrow), a hairline under it */
export const TabsFrame = styled.div`
  position: relative;
  border-bottom: ${({ theme }) => themeBorderWidth(theme, 'thin', { fixed: true })} solid ${({ theme }) => themeColor(theme, 'border')};
  &[data-fade] [role=tablist] {
    mask-image: linear-gradient(to ${({ theme }) => theme.rtl ? 'left' : 'right'}, currentColor calc(100% - ${({ theme }) => themeSpace(theme, 'xxxl')}), transparent);
  }
`

/* The categories' list beside the menu (direct menu, desktop): it sticks under the header and keeps its own scroll
   when the list is longer than the window. */
export const SideNav = styled.nav`
  position: sticky;
  top: calc(var(--categories-sticky-top, 0px) + ${({ theme }) => themeSpace(theme, 'md')});
  max-height: calc(100dvh - var(--categories-sticky-top, 0px) - ${({ theme }) => themeSpace(theme, 'xl')});
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  padding-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

/* The cart's box (a card of the theme, as the cart beside the products always was) in the column's width */
export const CartBox = styled(BusinessCartContent)`
  padding: ${({ theme }) => themeSpace(theme, 'lg')};
  margin-bottom: 0;
`

export const CartAside = styled.aside`
  position: sticky;
  top: calc(var(--categories-sticky-top, 0px) + ${({ theme }) => themeSpace(theme, 'md')});
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
  /* the global ring skips the boxes only a script focuses (tabindex -1); the header's cart icon focuses this one */
  &:focus-visible {
    ${({ theme }) => focusRingCss(theme)}
  }
`

/* The showcase's chips: a row that scrolls sideways under the header, the search first */
export const ChipsBar = styled(StickyBar)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  overflow-x: auto;
  scrollbar-width: none;
  padding-block: ${({ theme }) => themeSpace(theme, 'sm')};
  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    flex: none;
  }
  .search-field {
    flex: 1 0 ${({ theme }) => themeMedia(theme, '4xl')};
    ${desktop(css`
      flex: 0 0 ${({ theme }) => themeMedia(theme, '5xl')};
    `)}
  }
`

/* A section of the menu: its title (the one of every category's section) and its products */
export const Section = styled(WrapAllCategories)`
  padding-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

/* The products of a section: rows of the direct menu (two columns on the desktop), tiles of the showcase (two
   on a phone, four on the desktop) */
export const Products = styled.div`
  display: grid;
  min-width: 0;
  ${({ $cards, $tiles, theme }) => $cards
    ? productsGridCss(theme, false)
    : $tiles
    ? css`
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: ${themeSpace(theme, 'lg')} ${themeSpace(theme, 'md')};
      ${desktop(css`
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: ${themeSpace(theme, 'xl')} ${themeSpace(theme, 'lg')};
      `)}
    `
    : css`
      grid-template-columns: minmax(0, 1fr);
      ${desktop(css`
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: ${themeSpace(theme, 'xl')};
      `)}
    `}
`

/* "Featured items": a row of tiles that scrolls sideways (a phone, and the direct menu's desktop); the showcase's
   desktop has them in three columns. */
export const FeaturedStrip = styled.div`
  display: flex;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  padding-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    flex: 0 0 ${({ theme, $showcase }) => $showcase ? '78%' : themeMedia(theme, '2xl')};
    scroll-snap-align: start;
    ${({ $showcase, theme }) => $showcase
      ? desktop(css`
          flex: 0 0 calc((100% - 2 * ${themeSpace(theme, 'lg')}) / 3);
        `)
      : desktop(css`
          flex: 0 0 ${themeMedia(theme, '3xl')};
        `)}
  }
  --tile-ratio: ${({ $showcase }) => $showcase ? '16 / 10' : '4 / 3'};
  ${({ $showcase }) => $showcase && desktop(css`
    flex-wrap: wrap;
    overflow: visible;
  `)}
`

/* A product's row (direct menu): the name, the description and the price, the photo at the end */
export const ProductRow = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding-block: ${({ theme }) => themeSpace(theme, 'md')};
  border-top: ${({ theme }) => themeBorderWidth(theme, 'thin', { fixed: true })} solid ${({ theme }) => themeColor(theme, 'border')};
  text-align: start;

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => themeSpace(theme, 'xs')};
  }
  h3 {
    margin: 0;
    ${clamp(2)}
    ${({ theme }) => themePart(theme, 'product_card', { text: 'base.name', color: 'base.name_color' })}
  }
  .description {
    margin: 0;
    ${clamp(2)}
    ${({ theme }) => themePart(theme, 'product_card', { text: 'base.description', color: 'base.description_color' })}
  }
`

/* A product's card (classic): the theme's product card (its look, inner space and the gap of its info), the text
   at the start and the photo at the end. The card is a plain box: its name is the stretched button. */
export const ProductCard = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${({ theme }) => productInfoGap(theme)};
  min-width: 0;
  box-sizing: border-box;
  text-align: start;
  ${({ theme }) => stretchedCardCss(theme, 'product_card')}
  ${({ theme }) => cardBoxCss(theme, 'product_card', { padding: true })}

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => themeSpace(theme, 'xs')};
  }
  h3 {
    margin: 0;
    ${clamp(2)}
    ${({ theme }) => themePart(theme, 'product_card', { text: 'base.name', color: 'base.name_color' })}
  }
  .description {
    margin: 0;
    ${clamp(2)}
    ${({ theme }) => themePart(theme, 'product_card', { text: 'base.description', color: 'base.description_color' })}
  }
  /* the price and the favorite on one line, at the bottom of the text */
  .bottom {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => themeSpace(theme, 'xs')};
  }
`

/* The favorite's place in a card: over the stretched button, as the "+" is */
export const FavoriteSlot = styled.span`
  ${({ theme }) => cardInnerControlCss(theme)}
`

/* A tile: a large photo, the name (two lines) and the price */
export const ProductTile = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  min-width: 0;
  text-align: start;

  h3 {
    margin: 0;
    ${clamp(2)}
    ${({ theme }) => themePart(theme, 'product_card', { text: 'base.name', color: 'base.name_color' })}
  }
`

const PhotoBox = styled.div.attrs(({ $image }) => ({ style: $image ? { backgroundImage: `url("${$image}")` } : undefined }))`
  position: relative;
  /* the photo is part of the card: a click on it goes through to the card's stretched button below (implementation notes;
     positioned after the name, it would paint over that button and keep the click). The "+" takes its own back. */
  pointer-events: none;
  flex: none;
  box-sizing: border-box;
  background-color: ${({ theme }) => themeColor(theme, 'surface_alt')};
  background-size: cover;
  background-position: center;
  border-radius: ${({ theme }) => themeRadius(theme, 'md', 'product_card')};
  ${({ $tile, $card, theme }) => $tile
    ? css`
      width: 100%;
      aspect-ratio: var(--tile-ratio, 1);
    `
    : css`
      width: ${$card ? productImageCss(theme).card : themeMedia(theme, 'xs')};
      aspect-ratio: 1;
    `}
  ${({ $soldOut, theme }) => $soldOut && css`
    opacity: ${themeOpacity(theme, 'disabled')};
  `}
  /* no picture can be shown (the photo failed, and so did the placeholder): the fill of the loading placeholders (the
     border color, set globally for skeletons), still. The surface_alt above is nearly the page's own color: the box
     would read as blank */
  &[data-image-state='placeholder'] {
    background-color: ${({ theme }) => themeColor(theme, 'border')};
  }
  /* the loading placeholder (StoreProduct's photo) takes the whole box without changing it (out of the flow) and its
     rounding */
  .photo-skeleton {
    position: absolute;
    inset: 0;
    display: block;
    border-radius: inherit;
    overflow: hidden;
  }
  .photo-skeleton .react-loading-skeleton {
    display: block;
    height: 100%;
    line-height: inherit;
  }
`

export const ProductPhoto = PhotoBox

/* The "+" in the photo's corner, over the card's stretched button */
export const AddSlot = styled.span`
  position: absolute;
  pointer-events: auto;
  inset-block-end: ${({ theme }) => themeSpace(theme, 'sm')};
  inset-inline-end: ${({ theme }) => themeSpace(theme, 'sm')};
  z-index: 1;
`

export const SoldOutTag = styled.span`
  position: absolute;
  inset-block-start: ${({ theme }) => themeSpace(theme, 'sm')};
  inset-inline-end: 0;
  ${({ theme }) => badgeCss(theme, { variant: 'inverse', size: 'md', weight: 'bold' })}
  pointer-events: none;
`

export const ProductPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  ${({ theme }) => themeText(theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
  ${({ theme }) => themePart(theme, 'product_card', { text: 'base.price', color: 'base.price_color' })}
  .off-price {
    ${({ theme }) => themePart(theme, 'product_card', { color: 'base.offer_price_color' })}
  }
`

export const EmptyMenu = styled.div`
  padding-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const MoreAction = styled.div`
  padding-top: ${({ theme }) => themeSpace(theme, 'md')};
`
