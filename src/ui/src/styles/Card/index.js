import styled from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { cardHoverCss, themePart, themeRadius } from '~/utils/themeTokens'
import { focusRingCss } from '~ui/src/styles/Focus'

/* Cards of the theme (`components.card`, the "Content container", and the cards
   of their own: `business_card`, `product_card`, `order_card`).

   - cardBoxCss: the look of a card (background, border, radius, shadow, font)
     and, when asked, its inner space (`card.base.padding`).
   - clickableCardCss: a card that is one control (a button or a link that is
     the whole card): its look, hover and focus.
   - The stretched link, for a card with buttons inside (a favorite, a review…):
     the card is a plain box (stretchedCardCss) and the real link or button is
     its title (CardLink), whose ::after covers the whole card; the buttons
     inside sit over it (cardInnerControlCss) and work apart. The keyboard focus
     is drawn around the card (the ring of the ::after). */

// The attribute that marks the stretched control of a card
export const CARD_LINK_ATTR = 'data-card-link'

/**
 * The inner space of a card (`components.<component>.base.padding`, `card` by
 * default) as a CSS length, or null for a card without one (order_card).
 */
export const cardPadding = (theme, component = 'card') => {
  return getThemeCss(theme, component).base.padding ?? null
}

/**
 * The look of a card of `component` (`card` by default): its background,
 * border, radius, shadow and font, and with `padding` its inner space. Appended
 * last in the card's block.
 */
export const cardBoxCss = (theme, component = 'card', { padding = false } = {}) => {
  const pad = padding && cardPadding(theme, component)
  return [
    themePart(theme, component, { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' }),
    pad ? `padding: ${pad};` : ''
  ].filter(Boolean).join('\n')
}

/**
 * The focus state of a card (`variants.default.states.focus`, its shadow; none
 * when null) under `selector`: `&:focus-visible` for a card that is its own
 * control, the focus of its stretched link otherwise. Empty when the card has
 * no focus state (business_card, product_card, order_card).
 */
export const cardFocusStateCss = (theme, component = 'card', selector = '&:focus-visible') => {
  const focus = getThemeCss(theme, component).variants.default.states.focus
  if (!focus) return ''
  return `${selector} { box-shadow: ${focus.shadow.css}; }`
}

/**
 * A card that is one control, a `<button>` or a link that is the whole card (a
 * topic of the help, a student): the card's look and inner space, with the
 * reset of a button (no border or background of its own, the font and color of
 * the page, the text at the start), its hover state (`states.hover`, never a
 * movement) and the theme's focus ring and focus state on a keyboard focus.
 */
export const clickableCardCss = (theme, component = 'card') => {
  return `
    && {
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      border: none;
      background: none;
      font: inherit;
      text-align: start;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      ${cardBoxCss(theme, component, { padding: true })}
      /* hovered it is the card at rest (over the hover of its own CSS),
         changed only by the card's hover state */
      &:hover, &:active {
        transform: none;
        ${themePart(theme, component, { border: 'base.border', 'box-shadow': 'base.shadow' })}
      }
      ${cardHoverCss(theme, component)}
      &:focus-visible { ${focusRingCss(theme)} }
      ${cardFocusStateCss(theme, component)}
    }
  `
}

/**
 * The box of a card with a stretched link: it places the link's cover
 * (`position: relative`) and takes the focus state of the card while its link
 * has the keyboard focus. The card itself is not a control: no cursor of its
 * own. Its hover is the one the card has (cardHoverCss).
 */
export const stretchedCardCss = (theme, component = 'card') => {
  return `
    position: relative;
    cursor: default;
    ${cardFocusStateCss(theme, component, `&:has([${CARD_LINK_ATTR}]:focus-visible)`)}
  `
}

/**
 * A control inside a card with a stretched link (a favorite, a review, a
 * reorder): over the link's cover, so it gets its own clicks and does not open
 * the card.
 */
export const cardInnerControlCss = (_theme) => 'position: relative; z-index: 1;'

/**
 * What sits over a card with a stretched link and is not a control (a ribbon, a
 * badge, a status over the image): the pointer goes through it to the link.
 */
export const cardDecorationCss = (_theme) => 'pointer-events: none;'

/**
 * The stretched control of a card (CardLink): it reads as the text it is in
 * (the card's title), and its ::after covers the whole card (the closest box
 * with a position: the card, see stretchedCardCss), so a click anywhere on the
 * card is a click on it. Its keyboard focus is the theme's ring around the card
 * (on the ::after, with the card's radius), not around the title.
 */
export const stretchedLinkCss = (theme, component = 'card') => {
  return `
    display: inline;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: inherit;
    text-transform: inherit;
    text-decoration: none;
    cursor: pointer;
    /* a button (as='button') is one box in its line: the clamp of the
       heading it is in does not cut its text as it cuts a link's, so a long
       title wrapped past it. In a heading it takes that clamp itself (the
       same lines, the same ellipsis); a heading without one keeps all */
    h1 > &:is(button), h2 > &:is(button), h3 > &:is(button),
    h4 > &:is(button), h5 > &:is(button), h6 > &:is(button) {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: inherit;
      overflow: hidden;
      max-width: 100%;
    }
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: ${themeRadius(theme, 'md', component)};
    }
    &&:focus-visible {
      outline: none !important;
    }
    &&:focus-visible::after {
      ${focusRingCss(theme, { important: true })}
    }
  `
}

/**
 * The stretched control of a card: a link (`href`) or, with `as='button'`, a
 * button (`type='button'`) that opens what the card shows, placed in the card's
 * title. `$card` names the card's component (its radius for the focus ring),
 * `card` by default.
 */
export const CardLink = styled.a.attrs(({ as, type }) => ({
  [CARD_LINK_ATTR]: '',
  ...(as === 'button' && { type: type || 'button' })
}))`
  ${({ theme, $card }) => stretchedLinkCss(theme, $card || 'card')}
`
