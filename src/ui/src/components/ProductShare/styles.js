import styled, { css } from 'styled-components'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeMedia, themeRadius, themeShadow, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { focusRingInsetCss } from '~ui/src/styles/Focus'
import { LEGACY_LAYERS } from '~ui/src/styles/Rules'

// AddToAny's glyphs leave a quarter of their box as margin against a sixth in Lucide's: a fifth more
// than the button's icon size makes the six read the same size. A proportion of the theme's icon size.
const ADDTOANY_GLYPH_SCALE = 1.2

/* The share control: the icon button (a Button of the design system) and, under
   it, the menu. It sits where its parent puts it (ProductForm's
   ProductShareWrapper) and the menu hangs from its own center, so every icon
   of the menu is on the axis of the button (LTR and RTL). */
export const ShareRoot = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  margin: ${({ theme }) => themeSpace(theme, 'sm')} 0 0;
  /* the legacy layer of the menu: over the product's image and its gallery arrows */
  z-index: ${LEGACY_LAYERS.shareMenu};

  ${({ $inGallery }) => $inGallery && css`
    flex: 1;
    align-self: stretch;
    align-items: flex-start;
    justify-content: flex-start;
    min-block-size: 0;
    min-inline-size: 0;
    pointer-events: none;

    > * {
      pointer-events: auto;
    }
  `}
`

/* The menu: the copy button (a Button) and AddToAny's own buttons, which it
   fills into the <a> tags once it runs (it also sets their size and colors).
   Each one has the box of the icon button above it (`$size`, `$radius`: the
   theme's, read with the Button's own function) and they are a space apart, so
   the touch target of a phone or a coarse pointer (44 px, the Button's own floor) never overlaps
   the next one. Closed it stays in the DOM (hidden): AddToAny needs it to run. */
export const ShareKit = styled.div`
  --share-target: ${({ $size }) => $size};
  --share-gap: ${({ theme }) => themeSpace(theme, 'sm')};
  --share-menu-start: calc((${({ $size }) => $size} + var(--share-target)) / 2 + var(--share-gap));

  @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px), (pointer: coarse) {
    /* touch-target */ --share-target-floor: 44px;
    --share-target: max(${({ $size }) => $size}, var(--share-target-floor));
  }

  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  position: absolute !important;
  inset-block-start: var(--share-menu-start);
  inset-inline-start: calc((${({ $size }) => $size} - var(--share-target)) / 2);
  grid-template-columns: var(--share-target);
  grid-auto-rows: var(--share-target);
  place-items: center;
  gap: var(--share-gap);

  && {
    display: grid;
  }

  ${({ $inGallery }) => $inGallery && css`
    /* Fit whole touch targets below Share, starting a new column when the gallery runs out. */
    max-block-size: calc(100% - var(--share-menu-start));
    max-inline-size: 100%;
    inline-size: max-content;
    grid-auto-flow: column;
    grid-auto-columns: var(--share-target);
    grid-template-rows: repeat(auto-fit, var(--share-target));
    overflow: auto;
  `}

  /* (three classes: AddToAny's sheet, which loads after this one, sets
     the padding, the display and the sizes of its buttons with two) */
  &&& > a {
    position: relative;
    display: flex;
    box-sizing: border-box;
    width: ${({ $size }) => $size};
    height: ${({ $size }) => $size};
    padding: 0;
    margin: 0;
    line-height: 0;
    /* (its sheet clips: the phone's touch target below reaches past the box) */
    overflow: visible;
    border-radius: ${({ $radius }) => $radius};
    &:focus-visible {
      ${({ $inGallery, theme }) => $inGallery && focusRingInsetCss(theme)}
    }
    > .a2a_svg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: ${({ $radius }) => $radius};
    }
    /* its glyphs are scaled up (ADDTOANY_GLYPH_SCALE) so the six read the same size */
    > .a2a_svg svg {
      width: calc(${({ $icon }) => $icon} * ${ADDTOANY_GLYPH_SCALE});
      height: calc(${({ $icon }) => $icon} * ${ADDTOANY_GLYPH_SCALE});
      margin: 0;
    }
    /* a phone or any coarse pointer (a tablet is wider than the cut) */
    @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px), (pointer: coarse) {
      &::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 100%;
        height: 100%;
        /* touch-target */ min-width: 44px;
        /* touch-target */ min-height: 44px;
        transform: translate(-50%, -50%);
      }
    }
  }
`
export const ProductCopyURLContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: ${props => themeSpace(props.theme, 'xxl')};

  p {
    text-align: center;
    &.name {
      ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'], weight: 600 })}
      margin-bottom: 0;
      margin-top: ${props => themeSpace(props.theme, 'lg')};
    }

    &.description {
      ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
      margin: 0;
    }
  }
`

export const CopyAction = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xxxl')};
  /* keeps the text and the confirmation states the same width */
  min-width: 12ch;

  @media (min-width: 768px) {
    width: 100%;
    margin-top: calc(2 * ${props => themeSize(props.theme, 'xl')});
  }
`

export const ProductImageWrapper = styled.div`
  width: ${props => themeMedia(props.theme, 'xs')};
  height: ${props => themeMedia(props.theme, 'xs')};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    box-shadow: ${props => themeShadow(props.theme, 'sm')};
    border-radius: ${props => themeRadius(props.theme, 'sm')};
  }

  @media (min-width: 768px) {
    width: ${props => themeMedia(props.theme, '4xl')};
    height: ${props => themeMedia(props.theme, '4xl')};
  }
`
