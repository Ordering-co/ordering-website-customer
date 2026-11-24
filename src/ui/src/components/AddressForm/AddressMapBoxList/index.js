import React from 'react'
import { AddressMapBoxListContainer, SuggestionContent, SuggestionDetail, SuggestionPin, SuggestionText } from './styles'
import { Icon } from '~ui/src/design-system/components/Icon'
import { MenuItemButton } from '~ui/src/design-system/components/ButtonAppearances'
import { MenuSurface } from '~ui/src/design-system/components/Menu'
import { useLanguage } from '~components/contexts/LanguageContext'

export const AddressMapBoxList = (props) => {
  const {
    mapBoxSuggests,
    retrieveSuggestResult,
    handleChangeAddress,
    onBlurInput,
    handleChangeInput,
    forwardRef,
    onUseLocation,
    locating,
    locationAddress
  } = props
  const [, t] = useLanguage()

  const handleClick = (suggest) => {
    retrieveSuggestResult(suggest?.mapbox_id, handleChangeAddress)
    handleChangeInput({ target: { name: 'address', value: suggest?.full_address || suggest?.name } })
    // the list unmounts the focused suggestion: the focus goes back to the address field first
    forwardRef?.current?.focus?.()
    onBlurInput()
  }

  return (
    <AddressMapBoxListContainer>
      {/* a group of actions, not a listbox: its rows are buttons that Tab reaches */}
      <MenuSurface role='group' aria-label={t('ADDRESS_SUGGESTIONS', 'Address suggestions')}>
        {mapBoxSuggests?.map(suggest => (
          <MenuItemButton
            key={suggest?.mapbox_id}
            onClick={() => handleClick(suggest)}
          >
            <SuggestionContent>
              <SuggestionPin><Icon name='locationPin' size='md' aria-hidden /></SuggestionPin>
              <SuggestionText>{suggest?.full_address || suggest?.name}</SuggestionText>
            </SuggestionContent>
          </MenuItemButton>
        ))}
        {/* implementation notesthe device's location, asked only when this is pressed; the row is there with the field empty */}
        {onUseLocation && (
          <MenuItemButton data-doc-control='address-use-location' disabled={locating} aria-busy={locating || undefined} onClick={onUseLocation}>
            <SuggestionContent>
              <SuggestionPin><Icon name={locating ? 'loaderCircle' : 'mapMarker'} size='md' aria-hidden /></SuggestionPin>
              <SuggestionText>
                {t('USE_CURRENT_LOCATION', 'Use my current location')}
                {/* implementation noteswith the permission already given, the address the row would use */}
                {locationAddress && <SuggestionDetail data-doc-control='address-use-location-address'>{locationAddress}</SuggestionDetail>}
              </SuggestionText>
            </SuggestionContent>
          </MenuItemButton>
        )}
      </MenuSurface>
    </AddressMapBoxListContainer>
  )
}
