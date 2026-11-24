import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { buttonStill, themeFontFamily, themeMedia, themeOpacity, themeRadius, themeSize, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { motionCss } from '~/utils/themeMotion'
import { dividerLineCss } from '~ui/src/styles/Divider'
import { Button } from '~ui/src/design-system/components/Button'
import { getThemeCss } from '~/utils/themeCss'

const lineText = (theme, style) => style && themeText(theme, style, { props: ['size', 'line'] })

/* What a line softens while its product updates: its photo, name,
   amounts and actions at the theme's `disabled` opacity, fading at the
   accordion's speed. Every box is softened on its own instead of the whole
   row, because the ring beside the price (`[data-line-spinner]`) must keep its
   full strength (an opacity multiplies down its children). The summary grid
   (checkout) gives its columns to the grid, so there it is each of them. The
   chevron and the options panel keep their own motion and stay as they are. */
const softLineCss = (theme, summaryGrid) => {
  const boxes = [
    summaryGrid ? '> .accordion > .info > *' : '> .accordion > .info',
    '> .accordion > .product-info > :not(.prod-price)',
    '> .accordion > .product-info > .prod-price > :not([data-line-spinner])',
    '> .accordion > .price-section > :not(.prod-price)',
    '> .accordion > .price-section > .prod-price > :not([data-line-spinner])',
    '> .accordion > :not(.info):not(.product-info):not(.price-section):not(.accordion__icon)'
  ].join(',\n    ')
  return `
    ${boxes} {
      opacity: ${themeOpacity(theme, 'disabled')};
      ${motionCss(theme, 'accordion', ['opacity'])}
    }
  `
}

export const AccordionSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: ${props => themeSpace(props.theme, 'sm')} 0px;
  ${props => dividerLineCss(props.theme, 'item')}
  background: ${({ transBackground, theme }) => transBackground ? 'transparent' : themeColor(theme, 'surface')};
  /* the line a product add just touched, in the cart beside the menu: a tint of the primary that the caller takes
     off after a few seconds (it fades back when the theme animates; at once when it does not or motion is reduced) */
  ${({ theme }) => motionCss(theme, 'accordion', ['background-color'])}
  ${({ $highlighted, theme }) => $highlighted && css`
    background: ${themeColor(theme, 'primary_subtle')};
  `}

  ${({ noBorder }) => noBorder && css`
    border-bottom: none;
  `}
  ${props => blockStill(props.theme)}
  ${({ $updating, $summaryGrid, theme }) => $updating && softLineCss(theme, $summaryGrid)}
  /* a row of an order's summary (checkout, order details): tokens.space.md
     above and below */
  ${({ transBackground, theme }) => transBackground && `padding: ${themeSpace(theme, 'md')} 0;`}
  /* a row of an order's summary with its quantity: a grid of
     the quantity, the name and the price, its options and comment under the
     name (the row's own boxes give their children to the grid) */
  /* (with the product's image, checkout.products.image /
     confirmation.products.image: a first column of the image, tokens.space.sm
     before the quantity) */
  ${({ $summaryGrid, $summaryImage, $invalid, theme }) => $summaryGrid && `
    display: grid;
    grid-template-columns: ${$summaryImage ? 'auto ' : ''}auto minmax(0, 1fr) auto;
    align-items: start;
    > .accordion,
    > .accordion > .info {
      display: contents;
    }
    > .accordion > .info > .quantity-item {
      grid-column: ${$summaryImage ? 2 : 1};
    }
    > .accordion > .info > :not(.quantity-item):not(.summary-image) {
      grid-column: ${$summaryImage ? 3 : 2};
      width: auto;
    }
    ${$summaryImage
      ? `> .accordion > .info > .summary-image {
      grid-column: 1;
      margin-inline-end: ${themeSpace(theme, 'sm')};
      cursor: default;
    }`
      : ''}
    > .accordion > :not(.info) {
      grid-column: ${$summaryImage ? 4 : 3};
      width: auto;
      margin-inline-start: ${themeSpace(theme, 'sm')};
    }
    > .accordion-product-options {
      grid-column: ${$summaryImage ? 3 : 2} / -1;
      width: auto;
      margin: 0;
    }
    ${$invalid ? '> .accordion > .info > * { opacity: 0.5; }' : ''}
  `}
`

const AccordionStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: initial;
  margin: 0px ${props => themeSpace(props.theme, 'md')};

  /* the product's name when it opens / closes its options: a button with no
     box of the browser (its text keeps the look of the name: in :where(), so
     the name's own size and weight still win over the inherited font) */
  & :where(button.item-name) {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: start;
    cursor: pointer;
    width: 100%;
  }

  /* the chevron (ChevronIcon) at the row's end */
  .accordion__icon {
    margin-inline-start: auto;
  }

  .product-info {
    font-family: ${props => themeFontFamily(props.theme, 'body')};
    width: 100%;
    .item-name {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}
      margin: 0;
      display: -webkit-box;
      /* no align-items: Safari reads it as the box's cross axis and centers the name */
      -webkit-box-orient: vertical;
      /* the cart's line: two lines (bilingual names keep their second half) */
      -webkit-line-clamp: 2;
      overflow: hidden;

      p {
        margin: 0;
      }
    }
  }

  ${({ hideQuantitySelector }) => hideQuantitySelector && css`
    justify-content: flex-start;
    align-items: flex-start;
  `}

  ${({ noMargin }) => noMargin && css`
    margin: 0px;
  `}
  ${props => blockStill(props.theme)}
`

export const Accordion = (props) => {
  const style = {}
  return (
    <AccordionStyled
      {...props}
      style={style}
    >
      {props.children}
    </AccordionStyled>
  )
}

export const WrapperProductImage = styled.div`
  max-width: ${props => themeMedia(props.theme, 'xs')};
  max-height: ${props => themeMedia(props.theme, 'xs')};
  height: ${props => themeMedia(props.theme, 'xs')};
  width: ${props => themeMedia(props.theme, 'xs')};
  margin-right: ${props => themeSpace(props.theme, 'xl')};
  cursor: pointer;

  /* the image that edits the product: a button with no box of the browser */
  &[type='button'] {
    display: block;
    flex-shrink: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
  }

  /* The cart's line_image_size applies from 411px. Narrower screens cap it
     at size.lg, or size.xl from 361px. */
  ${({ theme, hideQuantitySelector }) => {
    if (hideQuantitySelector) return ''
    const size = getThemeCss(theme, 'cart').base.line_image_size
    const box = (value) => `max-width: ${value}; max-height: ${value}; height: ${value}; width: ${value};`
    return `
      margin-right: 0px;
      ${box(`min(${size}, ${themeSize(theme, 'lg')})`)}
      @media (min-width: 361px) { ${box(`min(${size}, ${themeSize(theme, 'xl')})`)} }
      @media (min-width: 411px) { ${box(size)} }
    `
  }}
`

/* Position of the pencil on the clickable image; Button paints the glyph. */
export const IconContainer = styled.span`
  position: absolute;
  display: inline-flex;
  inset-inline-end: ${props => themeSpace(props.theme, 'xs')};
  bottom: ${props => themeSpace(props.theme, 'xs')};
  pointer-events: none;
`

const ProductImageStyled = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  /* no gray layer over the photo (the pencil is a button in its corner,
     IconContainer) */

  ${({ hideQuantitySelector }) => hideQuantitySelector && css`
    border-radius: ${props => themeRadius(props.theme, 'xl')};
  `}
`

export const ProductImage = (props) => {
  return (
    <ProductImageStyled
      {...props}
      style={{ backgroundImage: `url("${props.bgimage}")` }}
    >
      {props.children}
    </ProductImageStyled>
  )
}

export const ContentInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-transform: capitalize;
  width: 55%;

  ${props => props.theme?.rtl && css`
    margin-right: ${props => themeSpace(props.theme, 'md')};
    margin-left: 0px;
  `}

  /* two lines before it is cut (title= in index.js keeps the whole name);
     white-space overrides the browser's default \`pre\` on a button
     (the name toggles its options), which otherwise forces one line */
  .item-name {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
    margin: 0px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  > div {
    > p {
      ${props => themeText(props.theme, 'caption', { props: ['size'] })}
      color: ${props => themeColor(props.theme, 'text_muted')};
      overflow-wrap: break-word;
    }
  }

  /* the price and actions up to 410px (only its own span: the actions are base Buttons,
     whose inner span and icon no rule of this box reaches) */
  > span {
    display: flex;
    justify-content: space-between;
    margin: 0px;

    p {
      margin: 0px;
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
    }

    div {
      display: flex;
      /* on touch the two actions (Edit, Remove) keep a lane of 44 px each: their areas never meet */
      @media (pointer: coarse), (max-width: 575px) {
        gap: ${props => themeSpace(props.theme, 'md')};
      }
    }
  }
  ${({ fullWidth }) => !fullWidth && css`
    @media (min-width: 411px) {
      width: calc(65% - ${props => themeSize(props.theme, 'xl')});
    }
  `}
  ${({ fullWidth }) => fullWidth && css`
    width: calc(100% - ${props => themeSpace(props.theme, 'md')});
    .item-name {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
    }
  `}
  ${({ $textStyle }) => $textStyle && css`
    .item-name {
      ${({ theme }) => lineText(theme, $textStyle)}
    }
  `}
`

export const AccordionContent = styled.div`
  overflow: hidden;
  /* as components.accordion (animated / speed), else at once */
  ${props => motionCss(props.theme, 'accordion', ['max-height'])}
  width: 100%;
  margin: auto;

  @media (min-width: 481px) {
    width: 80%;
    ${({ fullWidth }) => fullWidth && css`
      width: 100%;
    `}
  }
  /* an order's summary: its options and comment tokens.space.xs
     under the product's name */
  ${({ fullWidth, theme }) => fullWidth && `&& > * { margin-top: ${themeSpace(theme, 'xs')}; }`}
`

export const AccordionText = styled.div`
  ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
  padding: ${props => themeSpace(props.theme, 'lg')};
`

export const ProductComment = styled.div`
  padding-left: 0px;
  ${props => props.theme?.rtl && css`
    padding-right: 0px;
    padding-left: 0px;
  `}
  p {
    margin: 0px;
    font-weight: 400;
    ${({ theme, $textStyle }) => lineText(theme, $textStyle)}
  }

  .item-comment {
    ${({ theme, $textStyle }) => lineText(theme, $textStyle)}
    font-weight: 400;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    text-transform: capitalize;
    margin: 0px;
    text-overflow: ellipsis;
    white-space: break-spaces;
    overflow: hidden;
  }
`

export const ProductInfo = styled.div`
  display: flex;
  align-items: flex-start;

  /* two lines before it is cut (title= in index.js keeps the whole name),
     like the product-info .item-name rule above */
  h1,
  .item-name {
    overflow: hidden;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  p {
    ${props => themeText(props.theme, 'h3', { props: ['size', 'family'] })}
    margin: 0px ${props => themeSpace(props.theme, 'xs')};
  }

  ${({ isValid }) => !isValid && css`
    opacity: 0.5;
  `}

  ${({ hideQuantitySelector }) => !hideQuantitySelector && css`
    align-items: center;
    width: 100%;

    ${({ midWidth, fullWidth }) => !midWidth && !fullWidth && css`
      @media (min-width: 411px) {
        width: 80%;
      }

      @media (min-width: 481px) {
        width: 70%;
      }
    `}
    ${({ midWidth, fullWidth }) => midWidth && !fullWidth && css`
      width: 80%;
    `}
  `}
`

export const ProductError = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;

  /* its Not available (not the inner span of its actions' buttons) */
  > span {
    ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
    text-align: center;
  }

  @media (min-width: 411px){
    width: 35%;

    > span{
      text-align: right;
    }
  }
`

export const ProductActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${props => themeSpace(props.theme, 'sm')};

  p.quantity-item {
    margin: 0px ${props => themeSpace(props.theme, 'xl')} 0px ${props => themeSpace(props.theme, 'lg')};
    ${props => themeText(props.theme, 'h2', { props: ['size', 'family'] })}
  }

  ${({ hideQuantitySelector }) => hideQuantitySelector && css`
    align-items: center;
  `}
`

// The row's delete (the base Button) hides below 411px; its box (never the button) does
export const ProductActionsDeleteWrapper = styled.span`
  display: none;

  @media (min-width: 411px){
    display: inline-flex;
  }
`

// The Edit of a cart's line: a link (components.link, sm) at the start of its
// actions, the stepper at their end
export const ProductEditLink = React.forwardRef((props, ref) => (
  <Button {...props} ref={ref} appearance='link' size='sm' type='button' style={{ marginInlineEnd: 'auto' }} />
))
ProductEditLink.displayName = 'ProductEditLink'

export const ProductPriceSection = styled.div.attrs({ className: 'price-section' })`
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  span {
    white-space: nowrap;
  }
`

/* The ring beside a line's price while its product updates, in the price's row:
   after the price where the row starts at the beginning (the cart), before it
   where the row ends at the end (the summary and the wide line), so the price
   never moves when it appears. */
export const LineSpinner = styled.span`
  display: inline-flex;
  align-items: center;
  align-self: center;
  flex: none;
  ${({ theme, $before }) => $before
    ? `margin-inline-end: ${themeSpace(theme, 'sm')};`
    : `margin-inline-start: ${themeSpace(theme, 'sm')};`}
`

export const ProductPrice = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;

  p,
  span {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }

  span {
    font-weight: 500;
  }

  p {
    margin: 0px ${props => themeSpace(props.theme, 'xs')};
  }

  svg {
    cursor: pointer;
    ${props => buttonStill(props.theme)}
  }

  ${({ hideQuantitySelector }) => hideQuantitySelector && css`
    justify-content: flex-start;

    p, span {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    }
  `}
`

export const ProductNotAvailable = styled.span`
  color: ${props => themeColor(props.theme, 'danger_text')};
`

export const ProductOptionsListUl = styled.ul`
  list-style-type: none;

  .suboption {
    margin-left: calc(-1 * ${props => themeSpace(props.theme, 'xl')});
    ${props => props.theme?.rtl && css`
      margin-right: calc(-1 * ${props => themeSpace(props.theme, 'xl')});
      margin-left: 0px;
  `}
  }

  p:nth-child(1) {
    margin-bottom: 0;
  }

  p {
    font-weight: 400;
    margin: 0px;
  }

  li span {
    font-weight: 300;
  }

  li.ingredient {
    padding-left: ${props => themeSpace(props.theme, 'lg')};
    ${props => props.theme?.rtl && css`
      padding-right: ${props => themeSpace(props.theme, 'lg')};
      padding-left: 0px;
    `}
  }
`

export const ProductOptionsListDiv = styled.div`
  list-style-type: none;
  display: flex;
  flex-wrap: wrap;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  padding: 0px;
  margin: 0px;

  p:nth-child(1) {
    margin-bottom: 0;
  }

  p {
    ${({ theme, $textStyle }) => lineText(theme, $textStyle)}
    font-weight: 400;
    margin: 0px;
  }

  li span {
    font-weight: 300;
  }

  li.ingredient {
    padding-left: 0px;
    padding-right: 0px;
  }
`

export const ProductQuantity = styled.span`
  margin: 0 ${props => themeSpace(props.theme, 'xs')};
  ${({ theme, $textStyle }) => lineText(theme, $textStyle)}

  /* an order's summary: tokens.space.sm before the name, at
     the inline end (RTL too) */
  ${({ marginRight, theme }) => marginRight && `margin: 0; margin-inline-end: ${themeSpace(theme, 'sm')};`}
`

export const ScheduleInfoWrapper = styled.div`
  width: calc(100% - ${props => themeSize(props.theme, 'xl')} - ${props => themeSpace(props.theme, 'sm')});
  box-sizing: border-box;
  /* same two-line clamp as ProductInfo's .item-name (title= in index.js
     keeps the whole name) */
  .item-name {
    margin: 0px;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  padding-left: ${props => themeSpace(props.theme, 'sm')};
  ${props => props.theme?.rtl && css`
    padding-left: 0px;
    padding-right: ${props => themeSpace(props.theme, 'sm')};
  `}
`

export const ScheduleInfo = styled.div`
  span {
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight', 'line'], weight: 400 })}
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`
