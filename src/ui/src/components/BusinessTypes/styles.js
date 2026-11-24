import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderWidth, themeControlHeight, themeIconSize, themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { getThemeComponent, getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { focusRingReach, focusRingRoomCss } from '~ui/src/styles/Focus'

// The business types of the listing: components.business_types
const BUSINESS_TYPES = 'business_types'

const base = (theme) => getThemeComponent(theme, BUSINESS_TYPES).base
// …and as CSS (its view)
const baseCss = (theme) => getThemeCss(theme, BUSINESS_TYPES).base

/**
 * How the types show (`base.layout`): `pills` (chips with the name),
 * `pills_image` (chips with the type's image before the name) or `tiles`
 * (the image on top, the name below).
 */
export const businessTypesLayout = (theme, defaultLayout = 'pills') => {
  const layout = base(theme).layout
  return layout === 'auto' ? defaultLayout : layout
}

/**
 * The side of a tile's image in px (`base.image_size`).
 */
export const businessTypesImageSize = (theme) => base(theme).image_size

/**
 * The width of a tile in px (`base.tile_width`): never narrower than its image.
 */
export const businessTypesTileWidth = (theme) =>
  Math.max(base(theme).tile_width, businessTypesImageSize(theme))

/**
 * The space between the types in px (`base.gap`).
 */
export const businessTypesGap = (theme) => base(theme).gap

// A type's image, or what stands for it (the initial of its name, the icon of
// "All"): a box of the image's side, the image cropped square
const imageBoxCss = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  box-sizing: border-box;
  ${({ theme }) => themePart(theme, BUSINESS_TYPES, { background: 'base.image_background' })}

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

// Without an image: the box takes the alternate surface and its initial or
// icon the muted text (on the pill, the pill's own color)
const placeholderCss = css`
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`

export const PillImage = styled.span`
  ${imageBoxCss}
  ${({ $placeholder }) => $placeholder && css`
    ${placeholderCss}
    font-weight: 600;
    svg {
      width: 60%;
      height: 60%;
    }
  `}
`

// The tiles: each is the box of its width (TileBox) holding a base Button (its
// BusinessTypeTileButton appearance: block, the theme's radius, its focus ring around the
// picture) whose content (TileBody) is the image on top and the name below
// (two lines at most). The selected one draws its image's contour
// (`base.image_selected_border`) and its name in `label_active_color`. No
// hover of their own: the theme has none for them. The Button is not
// restyled: the box and the layout are the wrapper's and the content's.
export const TileBox = styled.span`
  display: block;
  flex-shrink: 0;
  width: ${({ theme }) => businessTypesTileWidth(theme)}px;
`

export const TileBody = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => baseCss(theme).image_gap};
  text-align: center;

  .type-image {
    width: ${({ theme }) => baseCss(theme).image_size};
    height: ${({ theme }) => baseCss(theme).image_size};
    ${({ theme }) => themePart(theme, BUSINESS_TYPES, { 'border-radius': 'base.image_radius' })}
  }

  .type-name {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    width: 100%;
    overflow-wrap: anywhere;
    ${({ theme }) => themePart(theme, BUSINESS_TYPES, { text: 'base.label', color: 'base.label_color' })}
  }

  ${({ $selected, theme }) => $selected && css`
    .type-name {
      ${themePart(theme, BUSINESS_TYPES, { color: 'base.label_active_color' })}
    }

    /* the selected one's contour, over the image's edge */
    .type-image::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-sizing: border-box;
      pointer-events: none;
      border: ${base(theme).image_selected_border
        ? baseCss(theme).image_selected_border
        : `${themeBorderWidth(theme, 'thick', { fixed: true })} solid ${themeColor(theme, 'primary')}`};
    }
  `}
`

export const TileImage = styled.span`
  ${imageBoxCss}
  ${({ $placeholder }) => $placeholder && css`
    ${placeholderCss}
    ${({ theme }) => themeText(theme, 'h3')}
    svg {
      width: ${({ theme }) => themeIconSize(theme, 'lg')};
      height: ${({ theme }) => themeIconSize(theme, 'lg')};
    }
  `}
`

export const TypeContainer = styled.div`
  display: flex;
  width: 100%;
  overflow-x: auto;
  justify-content: flex-start;
  text-align: center;
  /* no side padding: the page container sets the 20px */
  padding: 0;
  box-sizing: border-box;

  /* the 8px on top are room for the pill shadow/lift (the row scrolls, so it
     clips); as the page's first block it still starts at the page padding */
  padding: ${props => themeSpace(props.theme, 'sm')} 0 ${props => themeSpace(props.theme, 'md')};
  &:first-child {
    margin-top: calc(-1 * ${props => themeSpace(props.theme, 'sm')});
  }
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  /* the row of types */
  > div {
    margin: 0;
    width: 100% !important;
    justify-content: flex-start !important;
    height: auto;
  }

  /* without types the row takes no place. The types have no shadow or lift:
     the row (it scrolls, so it clips) keeps room only for the focus ring,
     around it and as the page's first block alike, and stays where it was */
  ${({ theme }) => css`
    &:empty {
      display: none;
    }
    ${focusRingReach(theme) > 0 && `
      &&, &&:first-child {
        ${focusRingRoomCss(theme)}
        width: calc(100% + ${2 * focusRingReach(theme)}px);
      }
    `}
  `}

  /* The chip expands beyond its painted height on phone and coarse pointers.
     Extend the scrollport by the same amount, without moving the row. */
  ${({ theme, $pillSize }) => $pillSize && css`
    @media (width < ${MOBILE_WEB_MAX_WIDTH}px), (pointer: coarse) {
      /* touch-target */ --business-types-touch-target: 44px;
      --business-types-touch-bleed: calc((var(--business-types-touch-target) - ${themeControlHeight(theme, 'chip', $pillSize)}px) / 2);
      --business-types-inline-bleed: calc((var(--business-types-touch-target) - var(--business-types-edge-width, var(--business-types-touch-target))) / 2);
      --business-types-inline-room: max(var(--business-types-inline-bleed), ${focusRingReach(theme)}px);
      &&, &&:first-child {
        padding-block: max(var(--business-types-touch-bleed), ${focusRingReach(theme)}px);
        margin-block: calc(-1 * max(var(--business-types-touch-bleed), ${focusRingReach(theme)}px));
        padding-inline: var(--business-types-inline-room);
        margin-inline: calc(-1 * var(--business-types-inline-room));
        width: calc(100% + 2 * var(--business-types-inline-room));
      }
    }
  `}
`

export const PillCategoriesRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'sm')};
  /* the space between the types (components.business_types) */
  gap: ${props => baseCss(props.theme).gap};
  width: max-content;
  /* the tiles line up by their top (a name of two lines grows down) */
  ${({ $tiles }) => $tiles && 'align-items: flex-start;'}
`

export const PillSkeletonRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'sm')};
  gap: ${props => baseCss(props.theme).gap};
  width: max-content;
`

// A tile while the types load: the image's box and a line of its name
export const TileSkeleton = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: ${({ theme }) => businessTypesTileWidth(theme)}px;
  gap: ${({ theme }) => baseCss(theme).image_gap};
`
