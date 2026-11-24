import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themePart, themePartText, themeRadius, themeSize, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleGap, pageTitleRules } from '~ui/src/styles/Page'
import { fieldMessageCss } from '~ui/src/styles/Field'

export const FieldError = styled.p`
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`

// The width of the profile's content (its picture and form) from 768px
const CONTENT_WIDTH = '70%'

export const Container = styled.div`
  min-height: 55vh;

  span.bold {
    font-weight: 600;
  }

  @media (min-width: 1280px){
    > h1 {
      ${props => headingText(props.theme, 'h1')}
    }

  }
  /* the box of the account pages, the title and description
     its width */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
  ${props => css`
    > h1 {
      ${pageTitleRules(props.theme)}
    }
    > h1:empty {
      display: none;
    }
    /* the description (notifications): the theme's body text, muted, the
       title's gap over the content */
    > p {
      width: 100%;
      margin: 0 0 ${pageTitleGap(props.theme)};
      ${themeText(props.theme, 'body')}
      color: ${themeColor(props.theme, 'text_muted')};
    }
    > p:empty {
      display: none;
    }
  `}
  /* the account and the language: the title and description over the
     content (its width, centered) */
  ${props => props.$alignToContent && css`
    @media (min-width: 768px) {
      > h1, > p {
        width: ${CONTENT_WIDTH};
        margin-left: auto;
        margin-right: auto;
      }
    }
  `}
`

export const UserProfileContainer = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  text-align: center;
  /* the width of the page; $fullWidth (notifications): the
     content ends at the page's bottom space, as the other account pages */
  width: 100%;
  margin: 0 auto ${props => props.$fullWidth ? '0' : props.mbottom ? `${props.mbottom}px` : 'auto'};
`

export const ProfileOptionsList = styled.div`
  width: 100%;

  a, div {
    font-weight: normal;
  }
`

const PopoverListItemStyles = css`
  display: flex;
  padding: ${props => themeSpace(props.theme, 'sm')} 0;
  align-items: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
  color: ${props => themeColor(props.theme, 'text')};
  border-radius: ${props => themeRadius(props.theme, 'lg')};

  svg {
    margin-right: ${props => themeSpace(props.theme, 'xs')};
    ${props => props.theme?.rtl && css`
      margin-left: ${props => themeSpace(props.theme, 'xs')};
      margin-right: 0px;
    `}
  }

  :hover {
    cursor: pointer;
    background-color: ${props => themeColor(props.theme, 'surface_alt')};
  }

  :last-child {
    border-bottom: 0;
  }
`

export const ListItem = styled.div`
  ${PopoverListItemStyles}
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
`

export const ListLink = styled.a`
  ${PopoverListItemStyles}
  text-decoration: none;

  ${({ active }) => active && css`
    background-color: ${props => themeColor(props.theme, 'surface_alt')};
  `}
`

export const UserImage = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  position: relative;

  @media (min-width: 768px){
    width: ${CONTENT_WIDTH};
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
  /* a content container of the theme (components.card), still;
     its message (Update information) the profile_photo's text */
  ${({ theme }) => css`
    ${themePart(theme, 'card', {
      background: 'base.background',
      'border-radius': 'base.radius',
      border: 'base.border',
      'box-shadow': 'base.shadow'
    })}
    ${blockStill(theme)}
    && > p {
      ${themePartText(theme, 'profile_photo', 'base.text')}
      ${themePart(theme, 'profile_photo', { color: 'base.text_color' })}
    }
    /* the theme's spaces: lg inside (its message and photo; the edit button
       sits lg in), xl to the form under it (the gap between the page's
       sections) */
    margin-bottom: ${themeSpace(theme, 'xl')};
    && > p { margin: ${themeSpace(theme, 'lg')}; }
  `}
`

/* the photo of components.profile_photo, its size (a square)
   and radius (the box and the picture or placeholder in it). */
const photoCss = (theme) => {
  const { size, radius, placeholder_icon_size: icon } = getThemeCss(theme, 'profile_photo').base
  return css`
    && {
      width: ${size};
      height: ${size};
      border-radius: ${radius};
    }
    && img, && div {
      border-radius: ${radius};
    }
    && ${UploadImageIcon} svg {
      width: ${icon};
      height: ${icon};
    }
  `
}

export const Image = styled.div`
  overflow: hidden;
  cursor: -webkit-grab;
  cursor: grab;

  img,
  div {
    width: 100%;
    height: 100%;
    border: none;
    overflow: hidden;
    background: ${props => themeColor(props.theme, 'surface_alt')};
  };

  img {
    object-fit: cover;
  }
  /* lg around the photo in its card */
  padding: ${props => themeSpace(props.theme, 'lg')};
  ${props => photoCss(props.theme)}
`

export const SideForm = styled.div`
  width: 100%;

  @media (min-width: 768px) {
    width: ${CONTENT_WIDTH};
    display: flex;
    align-items: center;
  }
  /* $fullWidth (notifications): the whole page box, as the
     content of the other account pages (doubled to outrank the media query) */
  ${props => props.$fullWidth && `
    && {
      width: 100%;
    }
  `}
`

/* the pencil over the photo's card, a button that opens the
   file picker (profile_photo.slots.edit), at its end corner lg in */
export const EditPhotoAction = styled.div`
  position: absolute;
  bottom: ${props => themeSpace(props.theme, 'lg')};
  inset-inline-end: ${props => themeSpace(props.theme, 'lg')};
`

export const UserData = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;

  > * {
    margin: ${props => themeSpace(props.theme, 'xs')} 0;
  }

  /* the texts and fields take three quarters; a Button keeps its own width */
  > :not(button) {
    width: 75%;
  }

  @media (min-width: 768px){
    align-items: flex-start;
    text-align: left;
    ${props => props.theme?.rtl && css`
     text-align: right;
    `}
  }

`

export const SavedPlaces = styled.div`
  > div{
    display: flex;
    flex-direction: column-reverse;
  }

  @media (min-width: 768px){
    ul{
      width: 100%;
    }
  }

  /* the width of the page, its list at the start as the other
     pages' content (doubled to outrank the media query above) */
  && {
    width: 100%;
    margin: 0;
    text-align: start;
  }
  && > div {
    align-items: stretch;
  }
`

export const UploadImageIcon = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  span {
    margin: 0;
  }

  svg {
    width: ${props => themeSize(props.theme, 'lg')};
    height: ${props => themeSize(props.theme, 'lg')};
  }
`

export const SkeletonWrapper = styled.div`
  span {
    height: 100%;
    position: relative;
    top: calc(-1 * ${props => themeSpace(props.theme, 'xs')}); /* -2.5px, rounded to 3 (a tie of xxs/xs, up for a position) */
  }
`

export const WrapperForm = styled.div`
  @media (min-width: 768px) {
    width: 100%;
  }
`
