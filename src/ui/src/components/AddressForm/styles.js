import styled, { createGlobalStyle, css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeBorderWidth, themeIconSize, themeMedia, themePart, themeShadow, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { placesSuggestionsCss } from '~ui/src/design-system/lib/sdkStyle'
import { FieldGroup, fieldGap, fieldMessageCss } from '~ui/src/styles/Field'
import { focusRingRoomXCss } from '~ui/src/styles/Focus'
import { KEYBOARD_OPEN_IN_FLOW } from '~ui/hooks/useKeyboardOpen'
import { gpsButtonSize } from '../GoogleGpsButton/styles'

export const AddressFormContainer = styled.div`
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: clip;
  /* the clip cut the focus ring of the fields at the form's edges: room for it, the content keeps its place */
  ${({ theme }) => focusRingRoomXCss(theme)}
`

export const FormFields = styled.fieldset`
  border: none;
  padding: 0;
  margin: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex: 1 1 100%;
  align-self: stretch;
`

export const FormActions = styled.div`
  /* Use padding (not margin) so the sticky bar's opaque background covers the
     gap. Margin on sticky CTAs stays transparent and lets Address tags bleed
     through while scrolling (the address tags peeking under the button). */
  margin-top: 0;
  padding: ${props => themeSpace(props.theme, 'lg')} 0 ${props => themeSpace(props.theme, 'md')};
  display: flex;
  justify-content: space-between;
  width: 100%;
  /* pin the primary CTA to the bottom of the scrolling modal so it
     never scrolls out of view (same pattern as AddressList's ContinueButton) */
  position: sticky;
  ${KEYBOARD_OPEN_IN_FLOW}
  bottom: 0;
  background-color: ${props => themeColor(props.theme, 'surface')};
  z-index: 10;

  /* do not use bottom:65px in this modal CTA — the Modal already covers
     the NavigationBar. Seal below the bar so modal padding cannot reveal tags:
     a shadow, not a box (an ::after below the bar is scrollable overflow and
     made the modal scroll before it reached its max height). */
  /* four lg sizes of the theme reach below the bar (64px with the defaults) */
  box-shadow: 0 calc(4 * ${props => themeSpace(props.theme, 'lg')}) 0 0 ${props => themeColor(props.theme, 'surface')};

  /* Cancel (where no modal close) sits next to the always-shown save; what
     the disabled save misses on a line of its own under them */
  padding: ${({ theme }) => themeSpace(theme, 'lg')} 0 ${({ theme }) => themeSpace(theme, 'md')};
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
  flex-wrap: wrap;
  row-gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

// A button of the actions: an equal share of the row, the button fills it
export const FormAction = styled.div`
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
`

/**
 * What the disabled save misses (the empty required fields, the
 * location a typed address lacks), a muted caption under the save, a line each.
 */
export const SaveHint = styled.p`
  flex-basis: 100%;
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption')}
  /* a helper text of components.field (its place is the actions' row) */
  ${({ theme }) => `${fieldMessageCss(theme)} margin: 0;`}

  span {
    display: block;
  }
`

/**
 * The cell of a field of the form (an Input or the notes' Textarea): the
 * layout the legacy field got from the form, the look is the piece's. Its
 * margins are the form's rhythm (none inside a labeled field, whose group has
 * them); the internal number and the postal code share a row.
 */
export const FieldCell = styled.div`
  display: inline-block;
  vertical-align: top;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;

  &.internal_number {
    & + .zipcode {
      width: calc(50% - ${props => themeSpace(props.theme, 'lg')} / 2);
    }

    &:has(+ .zipcode) {
      width: calc(50% - ${props => themeSpace(props.theme, 'lg')} / 2);
      ${props => props.theme?.rtl
        ? css`
            margin-left: ${props => themeSpace(props.theme, 'lg')};
          `
        : css`
            margin-right: ${props => themeSpace(props.theme, 'lg')};
          `}
    }
  }
`

/**
 * The address field of the Mapbox alternative (an Input of the design system,
 * its suggestions under it): only its layout; the Google field is
 * WrapAddressInput, which also lays out that SDK's input.
 */
export const WrapMapboxInput = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
`

/**
 * The address the device's location found, waiting for a yes (): a content container (components.card)
 * under the field with the address and its two actions, which wrap on a narrow screen.
 */
export const LocationConfirm = styled.div`
  box-sizing: border-box;
  min-width: 0;
  margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  background-color: ${({ theme }) => themeColor(theme, 'surface')};
  ${({ theme }) => themePart(theme, 'card', { 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow' })}

  p {
    margin: 0;
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    ${({ theme }) => themeText(theme, 'caption')}
  }

  strong {
    display: block;
    margin: ${({ theme }) => themeSpace(theme, 'xs')} 0 ${({ theme }) => themeSpace(theme, 'md')};
    overflow-wrap: anywhere;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => themeSpace(theme, 'sm')};
  }

  button {
    flex: 1 1 auto;
  }
`

/** The country of the address found: a datum of the address, not a field (the geocoding gives it) */
export const CountryRow = styled.p`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  margin: 0 0 ${({ theme }) => themeSpace(theme, 'lg')};
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption')}

  strong {
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: end;
  }
`

export const FormControl = styled.form`
  padding: 0px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

  @media (min-width: 481px) {
    /* the fields start where the modal's title does (the modal's padding is
       its side) */
    padding: ${props => themeSpace(props.theme, 'sm')} 0;
  }
  /* the fields sm below and the rest of components.field's gap
     above (the gap between two: the form rhythm), the notes too */
  ${({ theme }) => css`
    ${FieldCell}, ${WrapMapboxInput} {
      margin-top: calc(${fieldGap(theme)} - ${themeSpace(theme, 'sm')});
      margin-bottom: ${themeSpace(theme, 'sm')};
    }
    /* with the labels above the fields (LabeledField): the label and its
       field are the item spaced so, label_gap between them; the address
       starts where its field did (AddressWrap's pull-up) */
    ${FieldGroup} {
      margin-top: calc(${fieldGap(theme)} - ${themeSpace(theme, 'sm')});
      margin-bottom: ${themeSpace(theme, 'sm')};
      ${FieldCell}, ${WrapMapboxInput}, .google-control, .mapbox-control {
        margin-top: 0;
        margin-bottom: 0;
      }
    }
    ${FieldGroup}.address-field {
      margin-top: calc(${fieldGap(theme)} - ${themeSpace(theme, 'sm')} - ${themeSpace(theme, 'xs')});
    }
  `}
  ${props => blockStill(props.theme)}
`

export const AddressWrap = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  margin-top: calc(-1 * ${({ theme }) => themeSpace(theme, 'xs')});

  --gps-field-inset: ${({ theme }) => themeBorderWidth(theme, 'thin', { fixed: true })};

  ${({ $hasGps }) => $hasGps && css`
    @media (pointer: coarse) {
      /* touch-target */ min-block-size: 44px;
    }
  `}

  button {
    left: auto;
    right: auto;
    inset-inline-end: var(--gps-field-inset);
  }
  ${props => blockStill(props.theme)}
`

export const WrapAddressInput = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

  i {
    padding: 0px ${props => themeSpace(props.theme, 'sm')};
    ${props => blockStill(props.theme)}
  }

  svg {
    position: absolute;
    color: ${props => primaryText(props.theme)};
    top: ${props => themeSpace(props.theme, 'xl')};
    left: ${props => themeSpace(props.theme, 'md')};
    font-size: ${props => themeIconSize(props.theme, 'md')};
    ${props => props.theme?.rtl && css`
      right: ${props => themeSpace(props.theme, 'md')};
      left: initial;
    `}
    ${props => blockStill(props.theme)}
  }

  /* the room of the pin at the end of the field, read by the field's own
     padding (index.js); none without the pin (visibility.address.gps_button) */
  ${({ $noGps, theme }) => !$noGps && css`
    /* touch-target */
    --gps-touch-floor: 44px;
    --gps-button-width: ${gpsButtonSize(theme)};

    @media (max-width: 575px) {
      --gps-button-width: ${gpsButtonSize(theme, true)};
    }
  `}
  ${props => blockStill(props.theme)}
`

// The Google suggestions (the SDK's list, in the body) as a menu of the theme
export const PlacesSuggestions = createGlobalStyle`
  ${({ theme }) => placesSuggestionsCss(theme)}
`

export const AddressTagSection = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  ${({ theme }) => css`
    margin: ${themeSpace(theme, 'md')} 0 ${themeSpace(theme, 'xs')};
    gap: ${themeSpace(theme, 'lg')};
  `}

  ${props => blockStill(props.theme)}
`

export const AddressTagsDivider = styled.div`
  width: 100%;
  display: flex;
  margin: ${props => themeSpace(props.theme, 'lg')} 0px 0px;
  margin-top: ${({ theme }) => themeSpace(theme, 'lg')};

  p {
    margin-bottom: 0px;
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const WrapperMap = styled.div`
  width: 100%;
  /* a form's map is fluid: its width, a 2:1 shape and a share of the
     screen's height (170px at 390 and at 1440 wide, measured) */
  aspect-ratio: 2 / 1;
  max-height: 19dvh;
  /* a short window cannot squeeze the map below the media scale's 2xl (the form scrolls) */
  min-height: ${props => themeMedia(props.theme, '2xl')};

  > div {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;

    &:hover {
      box-shadow: ${props => themeShadow(props.theme, 'lg', { fixed: true })};
    }
    ${props => blockStill(props.theme)}
    /* a content container (components.card), still on hover */
    ${({ theme }) => themePart(theme, 'card', { 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow' })}
    overflow: hidden;
    &:hover {
      ${({ theme }) => themePart(theme, 'card', { 'box-shadow': 'base.shadow' })}
    }
  }
  margin-bottom: ${({ theme }) => themeSpace(theme, 'sm')};
  ${props => blockStill(props.theme)}
`

export const WrapperSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => themeSpace(theme, 'sm')};

  span {
    width: 100%;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`
