import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeBorderWidth, themeControlHeight, themePart, themeRadius, themeShadowDown, themeShadowParts, themeShadowUp, themeSize, themeSpace, themeText, themeValue, headingText, blockStill } from '~/utils/themeTokens'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { galleryRatio, themeBaseNumber, themeTextKeepWeight } from '~/utils/productCartTheme'
import { slotButtonOptions } from '~/utils/themeGroups'
import { motionCss } from '~/utils/themeMotion'
import { focusRingInsetCss } from '~ui/src/styles/Focus'
import { KEYBOARD_OPEN_IN_FLOW } from '~ui/hooks/useKeyboardOpen'
import { TouchSlot } from '~ui/src/styles/TouchSlot'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { modalTheme } from '~ui/src/components/Overlay/modalTheme'

/* The side gutter of the product modal (the form, its image, its option
   navigation and its action bar; the service and custom order forms too):
   tokens.space.lg */
export const productGutter = (theme) => themeSpace(theme, 'lg')

/* Where the modal's own close sits over the form: at the modal's padding from
   the top end corner (the piece's), the button of product_modal.slots.close.
   The sizes of its box are the theme's. */
const closeHeight = (theme) => {
  const { size } = slotButtonOptions(theme, 'product_modal', 'close', { size: 'md' })
  return `${themeControlHeight(theme, 'button', size)}px`
}

/* what the close takes from the top end of the form: its inset, its height and
   a space sm (what a title or a bar under it keeps clear) */
export const closeReach = (theme) => `calc(${modalTheme(theme).padding} + ${closeHeight(theme)} + ${themeSpace(theme, 'sm')})`

/* Wide enough for the image beside the form: the modal's own desktop cut
   (not a design value: where the modal stops being one column). */
export const TWO_COLUMNS_MIN_WIDTH = 769

/* the product modal's content takes the dialog's padding back (the form has
   its own gutter, as the legacy Modal's padding 0), so the form is the box the
   dialog's body scrolls */
export const ProductModalFlush = styled.div`
  ${({ $fill }) => $fill && css`
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
  `}
  margin: calc(-1 * ${({ theme }) => modalTheme(theme).padding_top}) calc(-1 * ${({ theme }) => modalTheme(theme).padding}) calc(-1 * ${({ theme }) => modalTheme(theme).padding});
`

/* The dialog's body pads what it scrolls, and a sticky bar stops at that padding, not at the body's edge:
   at `top: 0` the form shows between the edge and the bar, and under the action bar (as ProductModalFlush,
   the form's own margin takes the padding back). The bars stick at the edge: minus the padding. */
const stickyTop = (theme) => `calc(-1 * ${modalTheme(theme).padding_top})`
const stickyBottom = (theme) => `calc(-1 * ${modalTheme(theme).padding})`

export const ProductContainer = styled.div`
  max-height: 100vh;
  max-height: 100dvh; /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  position: relative;
  /* no padding under: the action bar is the form's last row, so at the end of the scroll it rests on the
     dialog's edge, as it sticks on it while the form scrolls */
  padding: 0 ${props => productGutter(props.theme)};

  @media (min-width: 768px) {
    height: 100%;
  }

  @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
    padding: 0 ${props => productGutter(props.theme)};
    /* the image beside the form: its column and the form's (ProductMain, which
       takes the gutter) */
    ${({ $twoColumns, $showcase, theme }) => $twoColumns && css`
      display: grid;
      grid-template-columns: ${$showcase ? 'minmax(0, 1fr) minmax(0, 1fr)' : '42% minmax(0, 1fr)'};
      padding: 0;
      ${$showcase && css`
        /* Match the Dialog viewport's xl inset on both edges. */
        height: calc(100dvh - 2 * ${themeSpace(theme, 'xl')});
        grid-template-rows: minmax(0, 1fr);
      `}
    `}
  }

  ${({ $twoColumns }) => !$twoColumns && css`
    @media (min-width: 1200px) {
      flex-wrap: nowrap;
      padding-bottom: 0;
    }
  `}
  ${props => themePart(props.theme, 'product_modal', { 'border-radius': 'base.radius' })}
  ${props => blockStill(props.theme)}
  /* as tall as the form (the dialog's body scrolls it): the action bar, its
     child, sticks to the body's bottom over all of the form */
  max-height: none;

  ${({ $steps }) => $steps && css`
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
    height: auto;
  `}
`

/* The form's own column: info and actions. Beside the image (two columns) it
   is a box with the gutter the container had; otherwise it is not a box (the
   container keeps the gutter and its children are its own). */
export const ProductMain = styled.div`
  display: contents;

  @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
    ${({ $twoColumns, $showcase, theme }) => $twoColumns && css`
      display: block;
      min-width: 0;
      padding: 0 ${productGutter(theme)};
      ${$showcase && css`
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overscroll-behavior: contain;

        > * {
          flex: none;
        }

        > :first-child {
          flex-grow: 1;
        }
      `}
    `}
  }
`

export const ProductNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

// The look of a gallery arrow without the slot: a solid neutral icon button, sm
const GALLERY_ARROW = { size: 'sm', color: 'neutral', appearance: 'solid' }

/**
 * the props of a GalleryArrow, from the slot
 * `components.product_modal.slots.gallery_arrow` (its size, color and
 * appearance; a button of the icon shape), else GALLERY_ARROW. The product
 * and the service galleries share it.
 */
export const galleryArrowOptions = (theme) => slotButtonOptions(theme, 'product_modal', 'gallery_arrow', GALLERY_ARROW)

export const ProductGalleryArrow = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  ${({ $side, theme }) => $side === 'prev'
    ? `inset-inline-start: ${themeSpace(theme, 'sm')};`
    : `inset-inline-end: ${themeSpace(theme, 'sm')};`}
`

/**
 * the most of the visible height the gallery takes, in % (vh /
 * dvh), `product_modal.base.gallery_max_height`, so the product's name and
 * the action bar show when the modal opens on a short or wide screen (the
 * 4:3 gallery of an 830px modal is 622px tall); the photo keeps covering it,
 * cropped to the band that fits.
 */
export const galleryMaxHeight = (theme) => themeBaseNumber(theme, 'product_modal', 'gallery_max_height')

export const WrapperImage = styled.div`
  margin-inline-start: calc(-1 * ${props => productGutter(props.theme)});
  width: calc(100% + 2 * ${props => productGutter(props.theme)});
  position: relative;
  /* beside the form: the column's own width, whole */
  ${({ $twoColumns }) => $twoColumns && css`
    @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
      margin-inline-start: 0;
      width: 100%;
    }
  `}
  /* components.product_modal */
  ${({ $photoFirst, theme }) => !$photoFirst && themePart(theme, 'product_modal', { background: 'base.header_background' })}
`

export const SwiperWrapper = styled.div`
  position: relative;
  width: 100%;
  /* beside the form the gallery stays in view while the form scrolls */
  ${({ $twoColumns, $fullHeight, theme }) => $twoColumns && !$fullHeight && css`
    @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
      position: sticky;
      top: ${stickyTop(theme)};
    }
  `}

  img {
    ${props => props.isSoldOut && css`
        filter: grayscale(1);
    `}
    ${props => blockStill(props.theme)}
  }
  .mySwiper2:focus-visible {
    ${({ theme }) => focusRingInsetCss(theme)}
  }

  .mySwiper2 {
    width: 100%;

    .swiper-slide-active {
      border-radius: 0px;
      img {
        border-radius: 0px;
      }
    }
  }


  .swiper {
    width: 100%;
    max-height: 60dvh;
    margin-left: auto;
    margin-right: auto;
  }

  .swiper-slide {
    background-size: cover;
    background-position: center;
  }

  .product-thumb {
    --product-thumbnail-floor: 0px;
    @media (pointer: coarse), (max-width: ${MOBILE_WEB_MAX_WIDTH}px) {
      /* touch-target */ --product-thumbnail-floor: 44px;
    }
    box-sizing: border-box;
    padding: ${({ theme }) => themeSpace(theme, 'xxl')} 0;
    margin: 0 ${({ theme }) => themeSpace(theme, 'xl')};

    .swiper-slide {
      display: flex;
      background: none;
      border: 0;
      padding: 0;

      &:focus-visible {
        ${({ theme }) => focusRingInsetCss(theme)}
      }
      opacity: 0.8;
      border-radius: ${props => themeRadius(props.theme, 'sm')};
      /* Swiper measures each button and fits as many as the themed gap allows. */
      width: max(${({ theme }) => getThemeCss(theme, 'product_modal').base.thumb_size}, var(--product-thumbnail-floor));
      height: max(${({ theme }) => getThemeCss(theme, 'product_modal').base.thumb_size}, var(--product-thumbnail-floor));
      align-items: center;
      cursor: pointer;
      overflow: hidden;

      img {
        border-radius: ${props => themeRadius(props.theme, 'sm')};
      }
    }

    .swiper-slide-thumb-active {
      opacity: 1;
    }
  }

  .swiper-slide img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .active-img {
  }

  .swiper-button-next::after, .swiper-button-prev::after {
    display: none;
  }

  /* the gallery's ratio (product_modal.base.gallery_ratio, also on small
     screens unless the theme sets one of their own in platforms.mobile_web),
     its photos covering it (the product's photo is uploaded square: its
     center band shows) */
  ${({ theme }) => css`
    .mySwiper2 {
      height: auto;
      max-height: ${galleryMaxHeight(theme)}vh;
      max-height: ${galleryMaxHeight(theme)}dvh;
      aspect-ratio: ${galleryRatio(theme)};
      .swiper-slide img {
        object-fit: cover;
      }
    }
    ${galleryRatio(theme, { mobile: true }) && css`
      @media (max-width: ${MOBILE_WEB_MAX_WIDTH}px) {
        .mySwiper2 {
          aspect-ratio: ${galleryRatio(theme, { mobile: true })};
        }
      }
    `}
  `}
  /* the thumbnails' height (product_modal.base.thumb_size) */
  ${({ theme }) => css`
    .product-thumb .swiper-slide img {
      max-height: ${getThemeCss(theme, 'product_modal').base.thumb_size};
    }
  `}
  ${({ $photoFirst, $fullHeight, theme }) => $photoFirst && css`
    .product-thumb {
      position: absolute;
      z-index: 2;
      inset: auto ${themeSpace(theme, 'sm')} ${themeSpace(theme, 'sm')};
      width: auto;
      margin: 0;
      padding: 0;
    }

    ${$fullHeight && css`
      @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
        height: 100%;

        .mySwiper2 {
          height: 100%;
          max-height: none;
          aspect-ratio: auto;
        }
      }
    `}
  `}

`

export const ProductInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  ${({ $steps }) => $steps && 'flex: 1 0 auto;'}
  /* below the modal's close (closeReach) */
  ${({ noImage, theme }) => noImage && `padding-top: ${closeReach(theme)};`}
`

export const ProductFormTitle = styled.div`
  overflow-wrap: anywhere;
  ${({ $photoFirst, theme }) => $photoFirst && css`
    padding-block-start: ${themeSpace(theme, 'md')};

    ${TitleWrapper} {
      margin-block-start: 0;
    }
  `}
  /* at the top of the column beside the image: the whole heading (name, description, price) is
     clear of the modal's close, which floats over its end */
  ${({ $closeRoom, theme }) => $closeRoom && css`
    @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
      padding-inline-end: calc(${closeReach(theme)} - ${productGutter(theme)});
    }
  `}

  .price-discount {
    text-decoration: line-through;
  }
`

// the closed notice (): the business's closed status, beside the
// title/price; moved its schedule button to the footer's one
// action (ScheduleForLater, renderProductActions) — this stays text-only
export const ClosedNotice = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'sm')};
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  span {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`

export const ProductEdition = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'sm')};
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
`

export const SectionTitle = styled.h3`
  ${props => headingText(props.theme, 'h3')}
  /* the title of a group of the form (ingredients, instructions)
     is the options' group title (components.product_option title and
     title_color), with the same space above and around it */
  ${({ theme }) => `
    ${themePart(theme, 'product_option', { text: 'base.title', color: 'base.title_color' })}
    padding: ${themeSpace(theme, 'sm')} 0;
    margin: ${themeSpace(theme, 'lg')} 0 0;
  `}
`

export const ProductComment = styled.div`
  padding-block: ${({ theme }) => themeSpace(theme, 'sm')};
`

/* The slot of a footer action of the form (add address, select a student, loading, login / sold out): it takes
   the row beside the quantity control, with the width and the gap of the add button (AddAction), whatever the
   state; alone (sold out, no quantity) it fills the row. The Button inside fills it. */
export const AddActionSlot = styled.div`
  display: flex;
  position: relative;
  flex: 1 1 min(100%, calc(3 * ${({ theme }) => themeSpace(theme, 'xxxl')}));
  min-width: 0;
  ${({ $soldout }) => $soldout && 'pointer-events: none;'}
`

export const ProductActions = styled.div`
  display: flex;
  /* the quantity row and the action, as tall as one and a half of the theme's xl size */
  min-height: ${({ theme }) => `calc(1.5 * ${themeSize(theme, 'xl')})`};
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => themeSpace(theme, 'sm')} 0;
  width: 100%;
  z-index: 9999997;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  position: sticky;
  /* typing (): the bar is the end of the form, it does not sit over the field */
  ${KEYBOARD_OPEN_IN_FLOW}
  width: calc(100% + 2 * ${props => productGutter(props.theme)});
  margin-inline: calc(-1 * ${props => productGutter(props.theme)});
  bottom: ${({ theme }) => stickyBottom(theme)};
  /* the bar scrolls with the form when the theme does not pin it
     (product_modal.base.actions_sticky false) */
  ${({ theme }) => themeValue(theme, 'product_modal', 'base.actions_sticky') === false && 'position: relative;'}
  /* of the dialog's background (components.modal), as the option navigation */
  background-color: ${({ theme }) => themeValue(theme, 'modal', 'base.background')};
  /* While content scrolls under the pinned bar (useProductActionsScroll sets data-overlaid) the bar is set apart
     from it: the item divider on its top edge and the modal's shadow cast up (each one only if the theme has it).
     Never at rest or at the end of the scroll, where nothing is under it. */
  &[data-overlaid] {
    ${({ theme }) => dividerLineCss(theme, 'item', { edge: 'top' })}
    ${({ theme }) => themeShadowUp(theme, 'modal')}
  }

  div.price {
    padding-top: ${({ theme }) => themeSpace(theme, 'sm')};
    color: ${props => themeColor(props.theme, 'text')};
    /* the minimum / maximum to order, beside the quantity */
    span {
      ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
      color: ${props => themeColor(props.theme, 'danger_text')};
    }
  }

  /* the quantity stepper and, for a product sold by weight,
     its unit switch */
  div.quantity-control {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: ${props => themeSpace(props.theme, 'md')};
  }

  div.price-amount-block {
    display: flex;
    justify-content: ${({ center }) => center ? 'center' : 'space-between'};
    width: 80%;

    ${({ $twoColumns }) => !$twoColumns && css`
      @media (min-width: 1200px) {
        justify-content: space-between;
      }
    `}
  }

  svg {
    color: ${props => primaryText(props.theme)};
  }

  /* a disabled button's icon is the button's disabled color, not the primary (the stepper's − at 1) */
  button:disabled svg {
    color: inherit;
  }

  svg.disabled {
    pointer-events: none;
    color: ${props => themeColor(props.theme, 'text_disabled')};
  }

  /* the address list of a form with no address is one more action of the row (its button fills it) */
  #address_control {
    flex: 1 1 min(100%, calc(3 * ${({ theme }) => themeSpace(theme, 'xxxl')}));
    min-width: 0;
  }

  .product-address-action {
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  div#address_list {
    padding: 0;
  }

  div.add-address-button {
    padding-top: 0;
  }

  /* no quantity (sold out, a guest): nothing to leave room for */
  div.price-amount-block:empty {
    display: none;
  }

  /* the form's column beside the image is narrow: it keeps the stacked bar */
  ${({ $twoColumns }) => !$twoColumns && css`
    @media (min-width: 1200px) {
      bottom: ${({ theme }) => stickyBottom(theme)};
      flex-direction: row;
      justify-content: space-between;
      ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
      padding: ${({ theme }) => `${themeSpace(theme, 'sm')} ${productGutter(theme)}`};
      box-sizing: border-box;

      div.price {
        width: 25%;
      }
    }
  `}
  ${({ $showcase }) => $showcase && css`
    @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
      bottom: 0;
    }
  `}

  /* the bar's row (the quantity and the action, in every state of the action: add, schedule, no address, closed,
     loading); not while the loading skeleton stands in for it */
  ${({ $row, theme }) => $row && css`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: ${themeSpace(theme, 'xs')} ${themeSpace(theme, 'sm')};
    padding: ${themeSpace(theme, 'sm')} ${productGutter(theme)};
    box-sizing: border-box;
    ${dividerLineCss(theme, 'item', { edge: 'top' })}

    div.price-amount-block {
      width: auto;
      flex-wrap: wrap;
      gap: ${themeSpace(theme, 'xs')};
    }

    div.price {
      width: auto;
      padding-top: 0;
    }
  `}

`

export const SkeletonBlock = styled.div`
  width: ${({ width }) => width && `${width}%`};
  border-radius: ${props => themeRadius(props.theme, 'lg')};
  margin: auto;
  /* beside the image: in the form's column */
  ${({ $twoColumns }) => $twoColumns && css`
    @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
      grid-column: 2;
    }
  `}

  span {
    margin-bottom: ${({ theme }) => themeSpace(theme, 'md')};
  }
`

export const WrapperSubOption = styled.div`
  border-radius: ${props => themeRadius(props.theme, 'md')};
  /* the sub-options are the options of a choice list, apart */
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
`

export const SkuContent = styled.div`
  display: flex;
`

export const WrapperIngredients = styled.div`
  /* the ingredients are the options of a choice list, apart */
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
`

// the footer's one action while closed (ScheduleForLater), in the
// place and with the width of the Add to cart button it replaces
export const ScheduleForLater = styled.div`
  /* its button is a row item beside the quantity (as AddAction); the hint takes the row under them */
  display: contents;
`

// its visible hint (the button's aria-describedby points here): why it is
// the footer's only action, in the muted color, small
export const ScheduleHint = styled.span`
  flex-basis: 100%;
  margin-top: ${props => themeSpace(props.theme, 'xs')};
  text-align: center;
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`

/**
 * the option navigation, a bar of chips (the design system's Chip, one per
 * section; its size from components.product_modal.slots.navigation, the rest
 * from components.chip) stuck at the top of what scrolls the form (the
 * dialog's body), over the content (z-index 2: above the image's swiper and the
 * pulsing option's ring, under the modal's close and the share buttons). The
 * close floats over its end at the dialog's corner: the chips stop short of it
 * (closeReach).
 * Of the dialog's background so nothing shows through, across the form's
 * side padding (as the image and the actions). Its tabs and chips keep their
 * width, and the arrow moves the scrollport when shortcuts extend past it.
 */
export const ProductNavigation = styled.nav`
  position: sticky;
  top: ${({ theme }) => stickyTop(theme)};
  z-index: 2;
  margin: 0 calc(-1 * ${props => productGutter(props.theme)});
  padding: 0 ${props => productGutter(props.theme)};
  padding-inline-end: ${({ theme }) => closeReach(theme)};
  background: ${({ theme }) => themeValue(theme, 'modal', 'base.background')};

  /* Hidden, it leaves no blank band (). It cannot flicker: if the options fit with the bar,
     they fit without it (the content only rises), and a resize that overflows them shows it again. */
  ${({ $concealed }) => $concealed && 'display: none;'}

  /* Stuck, the chips sit below the band the close and the handle own (SCROLL_BAND clips it once the body
     scrolls, so chips in it could neither be seen nor pressed): the handle's grab zone on the phone Sheet
     and the close's band on a dialog or tablet sheet. 0 outside a scrolling layer (, ). */
  /* scrollContainer reads the resolved top below (not this variable: its computed text stays unresolved) to stop a section's scroll below the stuck bar */
  --sticky-top-inset: var(--layer-protected-zone, 0px);
  top: calc(${({ theme }) => stickyTop(theme)} + var(--sticky-top-inset));

  /* The tabs (card and showcase) are a row of text with a hairline under it, edge to edge: the row keeps
     the gutter itself (TabsList inset) so its tabs scroll out to the dialog's edge. Stuck, a soft shadow
     separates it from what scrolls under it (data-stuck, ProductNavigationScroll). */
  ${({ $tabs, theme }) => $tabs && css`
    padding-inline: 0;
    border-bottom: ${themeBorderWidth(theme, 'thin', { fixed: true })} solid ${themeColor(theme, 'border')};
    ${motionCss(theme, 'tabs', ['box-shadow'])}
    &[data-stuck] {
      box-shadow: ${themeShadowParts(theme, 'sm').down};
    }
  `}

  ${({ $showcase, theme }) => $showcase && css`
    @media (min-width: ${TWO_COLUMNS_MIN_WIDTH}px) {
      top: 0;
      /* the close floats over this corner: the row stops short of it */
      padding-inline-end: calc(${closeReach(theme)} - ${productGutter(theme)});
    }
  `}
`

// Give the arrow a separate column. The tabs or chips set the row's height.
export const NavigationTrack = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const NavigationViewport = styled.div`
  flex: 1;
  min-width: 0;

  /* No arrow: where the row overflows and is not at its end, it fades out on the end side (only alpha
     matters to a mask, so currentColor is the opaque stop). */
  &[data-fade] {
    mask-image: linear-gradient(to ${({ theme }) => theme.rtl ? 'left' : 'right'}, currentColor calc(100% - ${({ theme }) => themeSpace(theme, 'xxxl')}), transparent);
  }
`

// keeps the place of the tabs bar in the flow (ProductNavigationScroll tells from it when the bar is stuck)
export const NavigationSentinel = styled.span`
  display: block;
  block-size: 0;
`

// the count of choices made in a section, beside its name in the tab
export const NavigationCount = styled.span`
  display: inline-grid;
  place-items: center;
  box-sizing: border-box;
  min-inline-size: ${({ theme }) => themeSpace(theme, 'lg')};
  block-size: ${({ theme }) => themeSpace(theme, 'lg')};
  padding-inline: ${({ theme }) => themeSpace(theme, 'xs')};
  margin-inline-start: ${({ theme }) => themeSpace(theme, 'xxs')};
  border-radius: ${({ theme }) => themeRadius(theme, 'full')};
  background: ${({ theme }) => themeColor(theme, 'primary_subtle')};
  color: ${({ theme }) => primaryText(theme)};
  ${({ theme }) => themeText(theme, 'caption', { props: ['size', 'weight'], weight: 600 })}
  line-height: 1;
`

export const NavigationArrow = styled.div`
  display: flex;
  align-items: center;
  flex: none;
  block-size: 0;
`

// the row of chips: the space between them and above and below is the theme's
// (space sm / xs); each chip keeps its own width and the row scrolls sideways
export const NavigationChips = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'sm')};
  padding: ${props => themeSpace(props.theme, 'sm')} 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

// The action takes the remaining space beside the quantity.
export const AddAction = styled.div`
  flex: 1 1 min(100%, calc(3 * ${({ theme }) => themeSpace(theme, 'xxxl')}));
  min-width: 0;

  ${({ $priced, theme }) => $priced && css`
    /* Let the action take its own row when its text needs more room. */
    flex-basis: max-content;
    min-inline-size: min(100%, calc(3 * ${themeSpace(theme, 'xxxl')}));
    max-inline-size: 100%;
  `}
`

export const MissingChoices = styled.p`
  flex-basis: 100%;
  margin: 0;
  ${({ theme }) => themeText(theme, 'caption', { props: ['size', 'line'] })}
  color: ${({ theme, $attempted }) => themeColor(theme, $attempted ? 'danger_text' : 'text_muted')};

  &:empty {
    position: absolute;
  }
`

// inside the add button: its label and, when the theme shows the price
// (visibility product.add_price), the total at the other end or on the next line.
export const AddButtonContent = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: ${props => themeSpace(props.theme, 'md')};
  width: 100%;
  min-width: 0;
`

export const AddButtonLabel = styled.span`
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
`

export const AddButtonTotal = styled.span`
  margin-inline-start: auto;
  flex-shrink: 0;
  max-inline-size: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
`

export const Divider = styled.div`
  background: ${props => themeColor(props.theme, 'surface_alt')};
  /* components.divider band */
  ${props => dividerRules(props.theme, 'band')}
`

const inRow = (theme) => css`
  flex-direction: row;
  gap: ${themeSpace(theme, 'sm')};

  > div {
    margin: 0;
  }
`

/* The gallery bounds the share menu. Only the controls take pointer events,
   so the rest of the image retains its swipe and gallery actions. */
export const ProductShareWrapper = styled.div`
  position: absolute;
  top: ${props => themeSpace(props.theme, 'md')};
  inset-inline-start: ${props => themeSpace(props.theme, 'md')};
  z-index: 999999;
  border-radius: ${props => themeRadius(props.theme, 'md')};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  /* a row (a phone's, and with no image at any width): the buttons sit in the room the top of the form
     keeps for the modal's close (ProductInfo noImage), stacked they would cover the name */
  ${({ $inline, $row, theme }) => ($inline || $row) && inRow(theme)}
  ${({ $inline }) => $inline && css`
    position: static;
    flex-shrink: 0;
  `}
  ${({ $inline, theme }) => !$inline && css`
    bottom: 0;
    inset-inline-end: ${themeSpace(theme, 'md')};
    justify-content: flex-start;
    align-items: flex-start;
    pointer-events: none;

    > .favorite {
      pointer-events: auto;
    }
  `}
  @media (max-width: 449px) {
    ${({ theme }) => inRow(theme)}
  }

`
// The product's name: the window's heading (h2, the page's h1 is the
// business), its options' and groups' titles (h3) under it; the look of an h3
// (product_modal name)
export const ProductName = styled.h2`
  ${props => headingText(props.theme, 'h3')}
  display: flex;
  justify-content: space-between;
  margin: 0;
  .calories {
    ${props => headingText(props.theme, 'h3')}
    color: ${props => themeColor(props.theme, 'text_muted')};
    white-space: nowrap;
    display: flex;
    align-items: flex-end;
  }
  /* product_modal.base name and name_color, at every width */
  && {
    ${({ theme }) => themePart(theme, 'product_modal', { text: 'base.name', color: 'base.name_color' })}
  }
`
export const Properties = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
`
export const ProductDescription = styled.p`
  margin-top: ${props => themeSpace(props.theme, 'xs')};
  margin-bottom: ${props => themeSpace(props.theme, 'xs')};
  white-space: pre-wrap;
  /* product_modal.base description (a body text: the body
     font; its weight the text's own) and description_color */
  ${props => themeTextKeepWeight(props.theme, 'product_modal', 'description')}
  ${props => themePart(props.theme, 'product_modal', { color: 'base.description_color' })}
`
export const PriceContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  > p {
    ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'line', 'family'], weight: 700 })}
    margin: 0;
    /* product_modal.base price (bold, as today) and price_color */
    ${props => themeTextKeepWeight(props.theme, 'product_modal', 'price')}
    ${props => themePart(props.theme, 'product_modal', { color: 'base.price_color' })}
  }
  .offer-price {
    text-decoration: line-through;
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    /* product_modal.base.offer_price_color */
    ${props => themePart(props.theme, 'product_modal', { color: 'base.offer_price_color' })}
  }
`
export const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  span {
    /* product_modal.base meta and meta_color */
    ${props => themeTextKeepWeight(props.theme, 'product_modal', 'meta')}
    ${props => themePart(props.theme, 'product_modal', { color: 'base.meta_color' })}
  }
`
export const EstimatedPersons = styled.div`
  display: flex;
`
export const ProductTagsListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
`
export const ProductTagWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: ${props => themeSpace(props.theme, 'xs')} 0;

  img {
    /* product_modal.base tag_size, tag_radius and tag_shadow */
    ${props => themePart(props.theme, 'product_modal', { width: 'base.tag_size', height: 'base.tag_size', 'border-radius': 'base.tag_radius', 'box-shadow': 'base.tag_shadow' })}
  }

  span {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    /* sm from its image, lg to the next tag */
    ${props => `
      margin: 0 ${props.theme?.rtl ? themeSpace(props.theme, 'sm') : themeSpace(props.theme, 'lg')} 0 ${props.theme?.rtl ? themeSpace(props.theme, 'lg') : themeSpace(props.theme, 'sm')};
    `}
  }
`
// The units are chips (components.chip, sm) side by side
export const WeightUnitSwitch = styled.div`
  display: flex;
  flex-direction: row;
  width: auto;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  margin: 0;
`
// Reserve a lane for each Chip's touch target so neighboring units stay separate.
export const WeightUnitSlot = styled(TouchSlot).attrs({ $mobile: true })``

export const VideoGalleryWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  svg {
    position: absolute;
    /* the play icon of a video thumbnail (a stroke), on the image as the text on an
       overlay (on_overlay) */
    color: ${props => themeColor(props.theme, 'on_overlay')};
  }
`

export const GuestUserLink = ({ $loading, ...props }) => (
  <Button
    {...props}
    appearance='link'
    style={{
      margin: 'var(--ot-space-lg) var(--ot-space-md)',
      whiteSpace: 'nowrap',
      opacity: $loading ? 0.7 : undefined,
      pointerEvents: $loading ? 'none' : undefined
    }}
  />
)

export const LoadingWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`

/* The top bar of the `steps` layout (, option B): over the image it
   only lets the favorite and the close through; once the image has gone by it is
   a solid compact bar (the thumbnail, the name and the price) and the form keeps
   scrolling under it. Not a design value of its own: the bar is a space xxxl and
   a space sm, the thumbnail a space xxxl, its text the label and caption styles. */
export const stepsBarHeight = (theme) => `calc(${themeSpace(theme, 'xxxl')} + ${themeSpace(theme, 'sm')})`

export const StepsBar = styled.div`
  position: sticky;
  top: ${({ theme }) => stickyTop(theme)};
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  width: calc(100% + 2 * ${({ theme }) => productGutter(theme)});
  height: ${({ theme }) => stepsBarHeight(theme)};
  /* over the image (it takes no height of its own) and out to its edges */
  margin: 0 calc(-1 * ${({ theme }) => productGutter(theme)}) calc(-1 * ${({ theme }) => stepsBarHeight(theme)});
  padding: 0 ${({ theme }) => productGutter(theme)};
  /* clear of the modal's close, at the top end */
  padding-inline-end: ${({ theme }) => closeReach(theme)};
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
  background: ${({ theme, $compact }) => ($compact ? themeValue(theme, 'modal', 'base.background') : 'transparent')};
  ${({ theme, $compact }) => ($compact ? themeShadowDown(theme, 'modal') : 'box-shadow: none;')}
  ${({ theme }) => motionCss(theme, 'modal', ['background-color', 'box-shadow'])}
`

export const StepsBarInfo = styled.div`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
  opacity: ${({ $on }) => ($on ? 1 : 0)};
  visibility: ${({ $on }) => ($on ? 'visible' : 'hidden')};
  ${({ theme }) => motionCss(theme, 'modal', ['opacity'])}
`

export const StepsBarThumb = styled.img`
  flex: none;
  width: ${({ theme }) => themeSpace(theme, 'xxxl')};
  height: ${({ theme }) => themeSpace(theme, 'xxxl')};
  object-fit: cover;
  border-radius: ${({ theme }) => themeRadius(theme, 'sm')};
`

export const StepsBarText = styled.span`
  display: grid;
  min-width: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > span + span {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    font-variant-numeric: tabular-nums;
    ${({ theme }) => themeText(theme, 'caption')}
  }
`
