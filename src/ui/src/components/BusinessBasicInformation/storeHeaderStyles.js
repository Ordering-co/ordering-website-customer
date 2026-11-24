import styled, { css } from 'styled-components'

import { themeColor } from '~/utils/themeColors'
import { themeBorderWidth, themeMedia, themePart, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { DESKTOP_MIN_WIDTH } from '../RenderProductsLayout/storePageTemplate'
import { coverOverlayAlways } from './styles'

/* The header of the store page's three designs (components.store_page.base.template): the direct menu's short cover
   with the identity under it, the showcase's large cover with the identity over it and the classic's low cover with
   the identity under it. The cover's height is a
   level of `components.media` (the px map's "banner": a fluid box with an aspect ratio on a phone, a level from
   the desktop cut); the rest is the theme's space, colors and the business header's own text. */

const desktop = (rules) => css`
  @media (min-width: ${DESKTOP_MIN_WIDTH}px) {
    ${rules}
  }
`

export const StoreHeader = styled.div`
  display: flex;
  flex-direction: column;
`

/* The cover: the store's photo (its `header`) of the card's radius; the showcase's has the identity over a
   gradient of the theme's scrim. */
export const StoreCover = styled.div.attrs(({ $image }) => ({ style: $image ? { backgroundImage: `url("${$image}")` } : undefined }))`
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background-color: ${({ theme }) => themeColor(theme, 'border_strong')};
  background-size: cover;
  background-position: center;
  ${({ theme }) => themePart(theme, 'card', { 'border-radius': 'base.radius' })}

  ${({ $variant, $closed, theme }) => $variant === 'menu'
    ? css`
      height: ${themeMedia(theme, 'lg')};
      ${desktop(css`
        height: ${themeMedia(theme, '2xl')};
      `)}
    `
    : $variant === 'cover'
      ? css`
      height: ${themeMedia(theme, 'md')};
      ${desktop(css`
        height: ${themeMedia(theme, '3xl')};
      `)}
      /* the theme's veil (business_header.base.overlay, when the store is closed or always) as a soft gradient */
      ${($closed || coverOverlayAlways(theme)) && css`
        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent, ${themeValue(theme, 'business_header', 'base.overlay')});
        }
      `}
    `
      : css`
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: ${themeMedia(theme, '4xl')};
      aspect-ratio: 16 / 10;
      padding: ${themeSpace(theme, 'lg')};
      color: ${themeColor(theme, 'on_overlay')};
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, transparent 20%, ${themeColor(theme, 'overlay')});
      }
      > * {
        position: relative;
      }
      ${desktop(css`
        aspect-ratio: auto;
        min-height: 0;
        height: ${themeMedia(theme, '5xl')};
        padding: ${themeSpace(theme, 'xxl')};
      `)}
    `}
`

/* The identity: the name, what the store is doing and its actions, and the closed notice beside them from the
   desktop cut (under them on a phone). */
export const Identity = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding-block: ${({ theme }) => themeSpace(theme, 'md')};
  ${({ $onCover }) => $onCover && css`
    padding-block: 0;
  `}
  ${({ theme, $onCover, $variant }) => desktop(css`
    grid-template-columns: minmax(0, 1fr) ${$variant === 'menu' || $variant === 'cover' || $onCover ? css`minmax(0, calc(${themeMedia(theme, '5xl')} + ${themeMedia(theme, 'lg')}))` : 'auto'};
    align-items: end;
    column-gap: ${themeSpace(theme, 'xxl')};
    padding-block: ${themeSpace(theme, 'lg')};
    ${!$onCover && $variant !== 'cover' && css`
      border-bottom: ${themeBorderWidth(theme, 'thin', { fixed: true })} solid ${themeColor(theme, 'border')};
    `}
    ${$onCover && css`
      padding-block: 0;
    `}
  `)}
`

export const IdentityMain = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

export const NameRow = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  h1 {
    margin: 0;
    min-width: 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    /* business_header.base.name and name_color */
    ${({ theme }) => themePart(theme, 'business_header', { text: 'base.name', color: 'base.name_color' })}
    ${({ $onCover, theme }) => $onCover && css`
      color: ${themeColor(theme, 'on_overlay')};
    `}
  }
`

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')} ${({ theme }) => themeSpace(theme, 'md')};
  ${({ theme }) => themeText(theme, 'body', { props: ['size'] })}
  color: ${({ theme, $onCover }) => themeColor(theme, $onCover ? 'on_overlay' : 'text_muted')};

  /* the classic's line: status, address and Info on one line, the address giving way; a dot between them */
  ${({ $line }) => $line && css`
    flex-wrap: nowrap;
    gap: ${({ theme }) => themeSpace(theme, 'xs')};
    > * {
      flex: none;
    }
    > * + *::before {
      content: '\\00b7';
      margin-inline-end: ${({ theme }) => themeSpace(theme, 'xs')};
    }
    .address {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .address-short {
      @media (min-width: ${MOBILE_WEB_MAX_WIDTH}px) {
        display: none;
      }
    }
    .address-full {
      @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 0.02}px) {
        display: none;
      }
    }
  `}

  .status {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => themeSpace(theme, 'xs')};
    font-weight: 600;
    color: ${({ theme, $onCover }) => themeColor(theme, $onCover ? 'on_overlay' : 'text')};
  }
`

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

/* The closed notice's place under a showcase's cover on a phone */
export const ClosedBelow = styled.div`
  padding-top: ${({ theme }) => themeSpace(theme, 'md')};
`
