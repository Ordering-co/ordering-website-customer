import styled, { css } from 'styled-components'
import { headingText, themeBorderWidth, themeMedia, themeSpace, blockStill } from '~/utils/themeTokens'
import { pageTitleRules } from '~ui/src/styles/Page'
import { AddressActionSlot } from '~ui/src/components/SavedAddressItem/styles'

/* The saved places are one section, "Saved addresses", over the single
   choice list of the addresses: its title has no space above of its own and
   the theme's md space down to the first address; the search button
   (SearchAddressAction) stands the theme's xl over it. */
const sectionTitleSpace = (theme) => `margin: 0 0 ${themeSpace(theme, 'md')};`

export const AddressListContainer = styled.div`
  display: flex;
  flex-direction: column;
  /* its parts (the form, the list, the empty state) a section apart */
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
  padding: 0;

  ${({ isProfile }) => !isProfile && css`
    width: 100%;
  `}

  /* none for the buttons too, which take the pointer back (the actions of
     the saved addresses, over the options' layer) */
  ${({ isLoading }) => isLoading && css`
    pointer-events: none;
    &&& ${AddressActionSlot} {
      pointer-events: none;
    }
  `}

  .address-form {
    margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
  }

  .add-address-button {
    display: flex;
    justify-content: flex-start;
  }

  ${props => blockStill(props.theme)}
`

// The box of a button that adds an address: as wide as the button (which fills it), and 12ch at least where `$minWidth` says (the legacy button's min-width)
export const AddAddressAction = styled.div`
  display: flex;
  flex-direction: column;
  ${({ $minWidth }) => $minWidth && css`
    min-width: 12ch;
  `}
`

/* The search button of the profile (over the list; beside it, at the end,
   from 768px). Its box takes the place the legacy button took in the saved
   places' column (centered, at the end from 768px) and is as wide as its label */
export const SearchAddressAction = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-self: center;
  width: fit-content;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};

  @media (min-width: 768px) {
    position: absolute;
    align-self: flex-end;
  }
`

export const AddressListUl = styled.ul`
  display: flex;
  flex-direction: column;
  padding: 0px;
  margin-top: 0px;

  ${props => blockStill(props.theme)}
`

export const WrappNotAddresses = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 80%;
  margin: ${({ theme }) => themeSpace(theme, 'xl')} auto ${({ theme }) => themeSpace(theme, 'sm')};

  ${({ isCustomerMode }) => isCustomerMode
? css`
    /* the illustration's box: the theme's 4xl media level */
    min-height: ${({ theme }) => themeMedia(theme, '4xl')};
    height: ${({ theme }) => themeMedia(theme, '4xl')};
  `
: css`
    /* the vertical illustration and message: a share of the screen */
    min-height: 40dvh;
  `}

  img {
    width: ${({ theme }) => themeMedia(theme, '4xl')};
    height: auto;
    aspect-ratio: attr(width) / attr(height);

    &:hover {
      transform: scale(1.05);
    }
    ${props => blockStill(props.theme)}
  }

  /* NotFoundSource's message (its heading): its own typography */
  h3, .not-found-title {
    margin: ${props => themeSpace(props.theme, 'xs')} 0px 0px;
    opacity: 0.5;
    text-align: center;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ContinueButton = styled.div`
  width: 100%;
  position: sticky;
  /* one hairline short of the scroller's bottom (no seam under it) */
  bottom: ${({ theme }) => themeBorderWidth(theme, 'thin', { fixed: true })};
  display: flex;
  flex-direction: column;
  ${props => blockStill(props.theme)}
`

// The titles are headings of the level `$level` gives them (the list's title
// h2 when none, its sections the next one), with the theme's typography of
// that level. Each declares its margins, so the browser's heading margins move
// nothing.
const levelAttrs = props => (props.$level ? { as: props.$level } : {})

export const AddressTitle = styled.h2.attrs(levelAttrs)`
  ${props => headingText(props.theme, props.$level || 'h2')}
  /* the title a section's space over the content */
  margin: 0 0 ${props => themeSpace(props.theme, 'xl')};
  text-align: left;
  ${props => props.theme?.rtl && css`
    text-align: right;
  `}

  /* in the profile, the title of the page (when it is its h1) */
  ${props => props.isProfile && props.$level === 'h1' && pageTitleRules(props.theme)}
  ${props => blockStill(props.theme)}
`

export const AddressSubTitle = styled.h3.attrs(levelAttrs)`
  ${props => headingText(props.theme, props.$level || 'h3')}
  margin: ${props => themeSpace(props.theme, 'md')} 0;
  ${props => sectionTitleSpace(props.theme)}
  text-align: left;
  ${props => blockStill(props.theme)}
`

export const AddressHalfContainer = styled.div`
  display: flex;
  width: 100%;
  ${props => blockStill(props.theme)}
`

export const List = styled.div`
  width: ${({ halfWidth }) => halfWidth ? '50%' : '100%'};
  padding-right: ${props => themeSpace(props.theme, 'sm')};
  padding-left: ${props => themeSpace(props.theme, 'sm')};
  ${props => blockStill(props.theme)}
`

export const AddressFormContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  ${({ addressOpen }) => !addressOpen && css`
    width: 50%;
    position: sticky;
    right: 0;
    top: 0;
    height: 100%;
    padding-left: ${props => themeSpace(props.theme, 'sm')};
  `}
  ${props => blockStill(props.theme)}
`

export const TitleFormContainer = styled.div`
  display: flex;
  align-items: flex-start;

  h2 {
    text-align: left;
    margin: 0 ${props => themeSpace(props.theme, 'md')};
    ${props => headingText(props.theme, 'h2')}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`
