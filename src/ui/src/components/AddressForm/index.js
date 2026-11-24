import React, { useState, useEffect, useRef, useId } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useForm } from 'react-hook-form'

import {
  AddressFormContainer,
  FormControl,
  FormFields,
  FormActions,
  FormAction,
  FieldCell,
  AddressWrap,
  WrapAddressInput,
  WrapMapboxInput,
  AddressTagSection,
  WrapperMap,
  WrapperSkeleton,
  AddressTagsDivider,
  SaveHint,
  PlacesSuggestions,
  LocationConfirm,
  CountryRow
} from './styles'

import { AddressForm as AddressFormController } from '~components/components/AddressForm'
import { AutocompleteInput as GoogleAutocompleteInput } from '~components/components/GoogleAutocompleteInput'
import { useLanguage } from '~components/contexts/LanguageContext'
import { GoogleMaps as GoogleMapsMap } from '~components/components/GoogleMaps'
import { useSession } from '~components/contexts/SessionContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useConfig } from '~components/contexts/ConfigContext'

import { Alert } from '~ui/src/components/Confirm'
import { Button } from '~ui/src/design-system/components/Button'
import { Input } from '~ui/src/design-system/components/Input'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { SdkField } from '~ui/src/design-system/components/SdkField'
import { Chip } from '~ui/src/design-system/components/Chip'
import { LabeledField } from '~ui/src/styles/Field'
import { GoogleGpsButton } from '~ui/src/components/GoogleGpsButton'
import { StaticMap } from '~ui/src/components/StaticMap'
import { Icon } from '~ui/src/design-system/components/Icon'
import { ErrorMsg } from '~ui/src/components/InputPhoneNumber/styles'

import { AddressMapBoxList } from './AddressMapBoxList'
import { ADDRESS_TAG_ICONS, addressTagName } from '~ui/src/components/SavedAddressItem/tags'
import { getGoogleMapImage } from '~ui/utils'
import { useGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { getFormApiFeedback } from '~/utils/formApiFeedback'
import { themeVisible } from '~/utils/themeVisibility'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { reverseGeocodeMapbox } from '~/utils/mapboxReverseGeocode'
import { composeAddress, streetLineOf } from '~/utils/addressParts'
import { ModalTitleContext } from '~ui/src/components/Overlay/ModalHeading'
import { themeControlHeight, themeSpace } from '~/utils/themeTokens'

// The visibility key (product.schema.json) of each optional field
const FIELD_VISIBILITY = {
  internal_number: 'address.internal_number',
  zipcode: 'address.zipcode',
  address_notes: 'address.notes'
}

// The room the GPS pin takes at the end of the address field (the variables are WrapAddressInput's)
const GPS_ROOM = 'calc(max(var(--gps-touch-floor), var(--gps-button-width)) + var(--gps-field-inset))'

// implementation notesthe Mapbox field says it is an address (`address-line1`) where the autofill sits in the phone's
// keyboard bar, so it never covers the suggestions below the field. With a mouse the browser's autofill list is a
// popup over those suggestions (and the coordinates only come from picking one): there it stays `off`.
// shortcut: the pointer is read once per render; upgrade if a device can switch it while the form is open.
const addressSearchAutoComplete = (withMouse) =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches ? 'address-line1' : withMouse

// `part`: a piece of the address found, shown once an address was chosen and kept in the payload fields
// the API already takes (city, state, zipcode)
const inputNames = [
  { name: 'address', code: 'Address' },
  { name: 'internal_number', code: 'APT / Suite' },
  { name: 'city', code: 'City', part: true },
  { name: 'state', code: 'State / Province', part: true },
  { name: 'zipcode', code: 'Postal Code' },
  { name: 'address_notes', code: 'Address notes' }
]

// What the phone's keyboard offers to fill in. The notes are free text: no suggestion of an address fits them.
const FIELD_AUTOCOMPLETE = {
  internal_number: 'address-line2',
  city: 'address-level2',
  state: 'address-level1',
  zipcode: 'postal-code'
}

/**
 * Whether a save would go through and, when not, what it misses.
 * It goes through only when something changed, the address the save sends is
 * not empty (an edit or a guest's order address keep the saved one; a new
 * address or a new guest send only the changes), every required field has the
 * value react-hook-form validates, and a typed address has a location when
 * the config requires picking a suggestion (onSubmit). `missing`: the field
 * names (inputNames) and 'location', in the form's order.
 */
export const getSubmitState = ({
  changes,
  savedAddress,
  keepsSavedAddress,
  isLocationRequired,
  isRequiredField,
  showField,
  isLocked
}) => {
  const missing = []
  const addressToSave = changes.address ?? (keepsSavedAddress ? savedAddress?.address : '') ?? ''
  if (String(addressToSave).trim() === '') missing.push('address')
  inputNames.forEach(({ name, part }) => {
    if (part || missing.includes(name)) return
    if (isRequiredField(name) && showField(name) && (changes[name] ?? savedAddress?.[name] ?? '') === '') {
      missing.push(name)
    }
  })
  if (changes.address && !changes.location && isLocationRequired) missing.push('location')
  return {
    canSubmit: !isLocked && Object.keys(changes).length > 0 && missing.length === 0,
    missing
  }
}

const AddressFormUI = (props) => {
  const {
    addressesList,
    googleMapsControls,
    formState,
    addressState,
    isRequiredField,
    showField,
    updateChanges,
    onCancel,
    handleChangeInput,
    saveAddress,
    setIsEdit,
    userCustomerSetup,
    getSuggestedResult,
    mapBoxSuggests,
    retrieveSuggestResult
  } = props

  const [configState] = useConfig()
  const [orderState] = useOrder()
  const [languageState, t] = useLanguage()
  const formMethods = useForm()
  const [{ auth }] = useSession()
  const theme = useTheme()
  const [state, setState] = useState({ selectedFromAutocomplete: true })
  const [addressTag, setAddressTag] = useState(addressTagName(addressState?.address?.tag))
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [addressValue, setAddressValue] = useState(formState.changes?.address ?? addressState.address?.address ?? '')
  const [inputFocused, setInputFocused] = useState(false)
  // What the API said when the save failed, as the theme says it: { fields, message }
  const [apiFeedback, setApiFeedback] = useState(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  // the geocoded address waiting for the draft to hold it before it is saved
  const [geocodedSave, setGeocodedSave] = useState(null)
  useEffect(() => {
    if (!geocodedSave) return
    setGeocodedSave(null)
    // this render's controller sees the draft with the result in it
    Promise.resolve(saveAddress(geocodedSave, userCustomerSetup)).finally(() => setIsGeocoding(false))
  }, [geocodedSave])
  // "Use my location" with Mapbox: null, 'locating', or what went wrong ('denied' | 'unavailable' | 'not_found')
  const [locationStatus, setLocationStatus] = useState(null)
  // implementation noteswhere the address in the form came from once one is chosen: 'pick' (a suggestion) or 'gps' (the device).
  // The GPS decides: correcting its text keeps its point and details; only choosing another address changes them.
  const [chosen, setChosen] = useState(null)
  // what the person typed in the street field since the last choice (the field shows the street line, the payload `address` the whole)
  const [streetEdit, setStreetEdit] = useState(null)
  // the location permission ('granted' | 'prompt' | 'denied'), the address it would use (when granted) and the one waiting for a yes
  const [permission, setPermission] = useState(null)
  const [preview, setPreview] = useState(null)
  const [confirm, setConfirm] = useState(null)
  // implementation notesthe place (a suggestion, the device, the pin) and its details go with the address text they were found
  // for. `located` is the last one applied; editing the text drops what it set (`locationDropped`: a new place must be
  // picked); `ticket` counts every edit and pick, so an answer that arrives after one is not applied over it.
  const located = useRef(null)
  const ticket = useRef(0)
  const [locationDropped, setLocationDropped] = useState(false)
  const googleInputRef = useRef()
  const mapBoxContainerRef = useRef()
  const [firstLocationNoEdit, setFirstLocationNoEdit] = useState({ value: null })
  const isEditing = !!addressState.address?.id

  const [locationChange, setLocationChange] = useState(
    isEditing
      ? addressState?.address?.location
      : formState.changes?.location ?? null
  )

  const isHideMap = !themeVisible(theme, 'address.map')
  const isHideIcons = !themeVisible(theme, 'address.icons')
  // the button that finds the user's location (visibility.address.gps_button)
  const showGpsButton = themeVisible(theme, 'address.gps_button')

  const maxLimitLocation = configState?.configs?.meters_to_change_address?.value
  const googleMapsApiKey = configState?.configs?.google_maps_api_key?.value
  const googleMapsFailed = useGoogleMapsFailed(googleMapsApiKey)
  const isLocationRequired = configState.configs?.google_autocomplete_selection_required?.value === '1' ||
    configState.configs?.google_autocomplete_selection_required?.value === 'true'
  const useAlternativeMap = configState?.configs?.use_alternative_to_google_maps?.value === '1'
  // implementation notesonce the edited text dropped its place, saving needs a suggestion unless Google can geocode the new text
  const needsPickedPlace = isLocationRequired || (locationDropped && !window.google?.maps?.Geocoder)
  const mapboxToken = configState?.configs?.map_box_token?.value
  const googleMapsWorking = !!googleMapsApiKey && !googleMapsFailed
  const hasMapLocation = !!locationChange && !!(addressState?.address?.location || formState?.changes?.location)
  // the flag already hides the map entirely (as today); a working Google
  // draws the interactive pin, else a still Mapbox shot of the same point
  const showGoogleMap = !useAlternativeMap && !isHideMap && googleMapsWorking && hasMapLocation
  const showStaticMapFallback = !useAlternativeMap && !isHideMap && !googleMapsWorking && hasMapLocation
  const staticMapSources = [mapboxStaticUrl(getGoogleMapImage(locationChange, '', { height: 170 }), mapboxToken)]
  const mapErrors = {
    ERROR_NOT_FOUND_ADDRESS: 'Sorry, we couldn\'t find an address',
    ERROR_MAX_LIMIT_LOCATION: `Sorry, You can only set the position to ${maxLimitLocation}m`,
    ERROR_GPS_BUTTON: 'Error to get result with gps button'
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  /**
   * Returns true when the user made no changes
   * @param {object} address
   */
  const checkAddress = (address, addressToCompare) => {
    const props = ['address', 'address_notes', 'zipcode', 'location', 'internal_number']
    const values = []
    props.forEach(prop => {
      if (addressToCompare[prop]) {
        if (prop === 'location') {
          values.push(address[prop]?.lat === addressToCompare[prop]?.lat &&
            address[prop]?.lng === addressToCompare[prop]?.lng)
        } else {
          values.push(address[prop] === addressToCompare[prop])
        }
      } else {
        values.push(!address[prop])
      }
    })
    return values.every(value => value)
  }

  const getAddressFormatted = (addressChange) => {
    const geocoder = window.google && new window.google.maps.Geocoder()
    if (!geocoder) {
      setAlertState({
        open: true,
        content: [t('ERROR_FAILED_LOAD_GEOCODER', 'Failed to load geocoder, please try again.')]
      })
      return
    }
    // lock the form while the async geocode is in flight so a second
    // submit can't fire another saveAddress and create a duplicate address.
    setIsGeocoding(true)
    const data = { address: null, error: null }
    geocoder.geocode({ address: addressChange }, async (results, status) => {
      let postalCode = null
      let handedOff = false
      try {
        if (status === 'OK' && results && results.length > 0) {
          for (const component of results?.[0].address_components) {
            const addressType = component.types?.[0]
            if (addressType === 'postal_code') {
              postalCode = component.short_name
              break
            }
          }
          data.address = {
            address: addressChange,
            location: { lat: results?.[0].geometry.location.lat(), lng: results?.[0].geometry.location.lng() },
            utc_offset: results?.[0].utc_offset_minutes ?? 0,
            map_data: {
              library: 'google',
              place_id: results?.[0].place_id
            }
          }
          if (postalCode) {
            data.address.zipcode = postalCode
          }
          // implementation noteswhat Google just resolved is the place of the text the person typed. The draft holds nulls for
          // the place it dropped (location, map_data, zipcode) and the controller lets the draft win over what it is
          // given, so the result goes into the draft first, under whatever the person set themselves.
          const typed = Object.fromEntries(Object.entries(formState?.changes || {}).filter(([, value]) => value != null))
          const effective = { ...data.address, ...typed }
          const arrayList = isEditing
            ? addressesList.filter(address => address.id !== addressState.address?.id) || []
            : addressesList || []
          const addressToCompare = isEditing
            ? { ...addressState.address, ...effective }
            : effective

          const isAddressAlreadyExist = arrayList.map(address => checkAddress(address, addressToCompare)).some(value => value) ?? false
          if (!isAddressAlreadyExist) {
            // saved by the effect below, once the draft has the result: the form stays locked until then
            updateChanges(effective)
            setGeocodedSave(effective)
            handedOff = true
            return
          }

          setAlertState({
            open: true,
            content: [t('ADDRESS_ALREADY_EXIST', 'The address already exists')]
          })
        } else {
          setAlertState({
            open: true,
            content: [t('ERROR_NOT_FOUND_ADDRESS', 'Error, address not found')]
          })
        }
      } finally {
        if (!handedOff) setIsGeocoding(false)
      }
    })
  }

  // The address of the device's position (Mapbox's reverse geocoding); rejects with the geolocation error (code 1: denied)
  const findMyAddress = () => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve(reverseGeocodeMapbox(
      { lat: coords.latitude, lng: coords.longitude },
      { token: mapboxToken, language: languageState?.language?.code?.slice?.(0, 2) }
    )),
    reject,
    { timeout: 10000, enableHighAccuracy: true }
  ))

  const applyFound = (found) => {
    setConfirm(null)
    formMethods.setValue('address', found.address)
    handleChangeAddress(found, true, true)
    googleInputRef.current?.focus?.()
    setInputFocused(false)
  }

  // The device's location, asked only when the person presses "Use my location". With the permission already given the
  // row showed the address it uses, so pressing it applies that. Without it the browser asks and the address
  // found waits for a yes (confirm); when it cannot be had the field stays as it was, to type in. Nothing is saved.
  const locateMe = async () => {
    if (locationStatus === 'locating') return
    if (preview?.found) return applyFound(preview.found)
    setLocationStatus('locating')
    const mine = ++ticket.current
    try {
      const found = await findMyAddress()
      // the person typed or picked an address meanwhile: that is the one that counts
      if (mine !== ticket.current) return setLocationStatus(null)
      if (!found) return setLocationStatus('not_found')
      setLocationStatus(null)
      if (permission === 'granted') applyFound(found)
      else setConfirm(found)
    } catch (error) {
      setLocationStatus(mine !== ticket.current ? null : error?.code === 1 ? 'denied' : 'unavailable')
    }
  }

  const checkKeyDown = (e) => {
    const keyCode = e.keyCode ? e.keyCode : e.which
    // only a field's Enter would submit the form; a button (a suggestion, a tag) keeps its own activation
    if (keyCode === 13 && e.target.tagName === 'INPUT') { e.preventDefault() }
  }

  const onSubmit = async () => {
    if (formState.loading || isGeocoding) return

    if (!auth && formState?.changes?.address === '' && addressState?.address?.address) {
      setAlertState({
        open: true,
        content: [t('VALIDATION_ERROR_ADDRESS_REQUIRED', 'The field Address is required')]
      })
      setLocationChange(null)
      return
    }

    if (formState?.changes?.address && !formState?.changes?.location) {
      if (needsPickedPlace) {
        setAlertState({
          open: true,
          content: [t('ADDRESS_REQUIRE_LOCATION', 'The address needs a location, please select one of the suggested')]
        })
        return
      }
      getAddressFormatted(formState?.changes?.address)
      return
    }

    const arrayList = isEditing
      ? addressesList?.filter(address => address?.id !== addressState?.address?.id) || []
      : addressesList || []
    const addressToCompare = isEditing
      ? { ...addressState.address, ...formState.changes }
      : formState?.changes

    const isAddressAlreadyExist = arrayList.map(address => checkAddress(address, addressToCompare)).some(value => value) ?? false

    if (!isAddressAlreadyExist) {
      await saveAddress({}, userCustomerSetup)
      return
    }

    setAlertState({
      open: true,
      content: [t('ADDRESS_ALREADY_EXIST', 'The address already exists')]
    })
  }

  const handleAddressTag = (tag) => {
    setAddressTag(tag)
    handleChangeInput({
      target: {
        name: 'tag',
        value: tag
      }
    })
  }

  const handleChangeAddress = (address, forceUpdate, gps) => {
    ticket.current++
    located.current = address
    setChosen(gps ? 'gps' : 'pick')
    setStreetEdit(null)
    setConfirm(null)
    setLocationDropped(false)
    setState({
      ...state,
      selectedFromAutocomplete: true
    })
    updateChanges({
      ...address,
      address: forceUpdate || useAlternativeMap ? address?.address : (googleInputRef?.current?.value || address?.address)
    })
    if (forceUpdate && !useAlternativeMap && googleInputRef.current) {
      googleInputRef.current.value = address?.address
    }
  }

  // The text of the address was edited: the place and details found for the previous one (and only what they set, not
  // what the person typed in their fields) no longer describe it. Saving then needs a place for the new text.
  const dropLocated = () => {
    ticket.current++
    // implementation notesthe GPS decides, correcting its text keeps its point and details
    if (chosen === 'gps') return
    const previous = located.current
    located.current = null
    setChosen(null)
    if (!previous) return
    const drop = {}
    Object.keys(previous).forEach(key => {
      if (key !== 'address' && formState.changes?.[key] != null && formState.changes[key] === previous[key]) drop[key] = null
    })
    if (Object.keys(drop).length === 0) return
    updateChanges(drop)
    setLocationDropped(true)
  }

  // a suggestion picked is the newest answer: the one retrieved late for an older pick or edit is not applied
  const retrievePick = (mapboxId, callback) => {
    const mine = ++ticket.current
    return retrieveSuggestResult(mapboxId, (address) => mine === ticket.current && callback(address))
  }

  const setMapErrors = (errKey) => {
    setAlertState({
      open: true,
      content: !(errKey === 'ERROR_MAX_LIMIT_LOCATION')
        ? [t(errKey, mapErrors[errKey])]
        : `${[t(errKey, mapErrors[errKey])]} ${maxLimitLocation} ${[t('METTERS', 'meters')]}`
    })
  }

  const showFieldWithTheme = (name) => {
    return !FIELD_VISIBILITY[name] || themeVisible(theme, FIELD_VISIBILITY[name])
  }

  useEffect(() => {
    if (Object.keys(formState.changes || {}).length === 0) {
      setLocationDropped(false)
      setChosen(null)
      setStreetEdit(null)
    }
    if (!auth) {
      setLocationChange(formState?.changes?.location ?? orderState?.options?.address?.location ?? '')
      setAddressValue(formState?.changes?.address ?? orderState?.options?.address?.address ?? '')
      inputNames.forEach(field =>
        formMethods.setValue(
          field.name,
          formState?.changes[field.name] ||
          (orderState?.options?.address && orderState?.options?.address[field.name]) ||
          ''
        )
      )
      return
    }

    if (!formState.loading && formState.result?.error) {
      setAlertState({
        open: true,
        content: formState.result?.result || [t('ERROR', 'Error')]
      })
    }

    setAddressValue(formState?.changes?.address ?? addressState.address?.address ?? '')
    formMethods.setValue('address', formState?.changes?.address ?? addressState.address?.address ?? '')
    if (!isEditing) {
      inputNames.forEach(field => formMethods.setValue(field.name, formState?.changes[field.name] || ''))
      formState?.changes?.address && setLocationChange(formState?.changes?.location)
      if (
        formState?.changes?.address &&
        formState?.changes?.address !== firstLocationNoEdit?.address &&
        formState?.changes?.location &&
        formState?.changes?.location?.lat !== firstLocationNoEdit.value?.lat &&
        formState?.changes?.location?.lng !== firstLocationNoEdit.value?.lng
      ) {
        setFirstLocationNoEdit({
          value: formState?.changes?.location,
          address: formState?.changes?.address
        })
      }
    }

    if (isEditing) {
      if (formState?.changes?.location) {
        const prevLocation = {
          lat: locationChange?.lat?.toFixed(5),
          lng: locationChange?.lng?.toFixed(5)
        }
        const newLocation = {
          lat: formState?.changes?.location?.lat?.toFixed(5),
          lng: formState?.changes?.location?.lng?.toFixed(5)
        }
        // persist the pin move when EITHER coordinate differs. With &&
        // a single-axis change (only lat or only lng) was ignored, so the moved
        // marker never updated locationChange.
        if (
          prevLocation?.lat !== newLocation?.lat ||
          prevLocation?.lng !== newLocation?.lng
        ) {
          setLocationChange(formState?.changes?.location)
        }
      }
    }
  }, [formState])

  // A failed save is told in the form's words, never the API's own text; editing the form clears it
  useEffect(() => {
    setApiFeedback(!formState.loading && formState.error
      ? getFormApiFeedback(t, { error: true, result: formState.error }, { fields: inputNames.map(field => field.name) })
      : null)
  }, [formState.loading, formState.error])

  const editedChanges = useRef(formState.changes)
  useEffect(() => {
    if (editedChanges.current === formState.changes) return
    editedChanges.current = formState.changes
    setApiFeedback(null)
  }, [formState.changes])

  useEffect(() => {
    if (isEditing) {
      setIsEdit && setIsEdit(true)
      setAddressValue(addressState.address?.address)
    } else {
      setIsEdit && setIsEdit(false)
    }
  }, [addressState])

  useEffect(() => {
    if (!auth) {
      setLocationChange(formState?.changes?.location ?? orderState?.options?.address?.location ?? '')
    }

    return () => {
      setFirstLocationNoEdit({ value: null })
    }
  }, [])

  /** Form events control */

  useEffect(() => {
    if (Object.keys(formMethods.errors).length > 0) {
      setAlertState({
        open: true,
        content: Object.values(formMethods.errors).map(error => error.message)
      })
    }
  }, [formMethods.errors])

  useEffect(() => {
    inputNames.filter(field => !field.part).forEach(field => {
      formMethods.register(field.name, {
        required: isRequiredField(field.name) && showField(field.name)
          ? t(`VALIDATION_ERROR_${field.name}_REQUIRED`, `The field ${field.code} is required`)
          : null
      })
      formMethods.setValue(field.name, formState.changes?.[field.name] ?? addressState.address?.[field.name] ?? '')
    })
  }, [formMethods])

  const handleClickOutside = (e) => {
    const outsideContainer = !mapBoxContainerRef.current?.contains(e.target)
    if (outsideContainer) {
      setInputFocused(false)
    }
  }

  useEffect(() => {
    if (!useAlternativeMap) return
    window.addEventListener('mouseup', handleClickOutside)
    return () => window.removeEventListener('mouseup', handleClickOutside)
  }, [useAlternativeMap])

  const isSaving = formState.loading
  const isSubmitting = isSaving || isGeocoding
  const isLoadingExistingAddress = isEditing && addressState.loading
  const showBootstrapSkeleton = configState.loading || isLoadingExistingAddress
  const isFormLocked = isSubmitting || showBootstrapSkeleton

  // Inside a modal that shows its own close (the Modal provides its title
  // context only then) Cancel is redundant, so it is not rendered.
  const hasModalClose = !!React.useContext(ModalTitleContext)
  // The save button is always shown and enabled only when a submit
  // would go through (getSubmitState)
  const changes = formState?.changes || {}
  const mapboxAddressValue = changes.address ?? formState?.result?.result?.address ?? addressValue ?? ''
  const { canSubmit, missing } = getSubmitState({
    changes,
    savedAddress: addressState.address,
    keepsSavedAddress: isEditing || (!auth && !props.createGuestOnSave),
    isLocationRequired: needsPickedPlace,
    isRequiredField,
    showField,
    isLocked: isFormLocked
  })
  // What the disabled save misses, under it: the empty required
  // fields (by the names their inputs show) and the location the typed address
  // lacks (the messages the submit's alerts gave). Not while the form is
  // locked, nor untouched (nothing to save yet is not something wrong).
  const saveHintId = useId()
  // with the labels above the fields: the id each label points at
  const fieldsId = useId()
  // what the API found wrong with a field: under it, named by it
  // the row of the device's location: Mapbox's field, the theme's pin button, a browser that can give a location
  const canUseLocation = useAlternativeMap && showGpsButton && !!mapboxToken && typeof navigator !== 'undefined' && !!navigator.geolocation
  // implementation notesthe permission is only read (never asked) so the row can show the address it would use
  useEffect(() => {
    if (!canUseLocation || !navigator.permissions?.query) return
    let status
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      status = result
      setPermission(result.state)
      result.onchange = () => setPermission(result.state)
    }).catch(() => {})
    return () => { if (status) status.onchange = null }
  }, [canUseLocation])
  const previewRequested = useRef(false)
  useEffect(() => {
    if (!canUseLocation || permission !== 'granted' || !inputFocused || previewRequested.current) return
    previewRequested.current = true
    // shortcut: read once per open form; upgrade if the person moves while it is open
    findMyAddress().then((found) => setPreview(found ? { found } : null)).catch(() => {})
  }, [canUseLocation, permission, inputFocused])
  // the address of the field is a street line and its pieces once one is chosen
  const showParts = useAlternativeMap && !!chosen
  const partsOf = (from) => ({ city: from.city, state: from.state, zipcode: from.zipcode, country: from.country })
  const streetText = streetEdit ?? streetLineOf(mapboxAddressValue)
  const changePart = (name, value) => {
    ticket.current++
    const patch = { [name]: value }
    if (name === 'state') patch.region = value
    if (showParts) patch.address = composeAddress(streetText, partsOf({ ...changes, ...patch }))
    formMethods.setValue(name, value)
    updateChanges(patch)
  }
  const changeStreet = (text) => {
    setStreetEdit(text)
    setConfirm(null)
    // typing is searching again, also after an address was chosen (that left the field focused with its list closed)
    setInputFocused(true)
    // the GPS keeps its point: the text is corrected in the address that goes with it; a picked suggestion drops its place
    handleChangeInput({ target: { name: 'address', value: chosen === 'gps' ? composeAddress(text, partsOf(changes)) : text } })
    dropLocated()
    if (locationStatus !== 'locating') setLocationStatus(null)
    getSuggestedResult(text)
  }
  const locationMessage = {
    denied: t('LOCATION_PERMISSION_DENIED', 'Location access is blocked. Type your address or allow location in your browser settings.'),
    unavailable: t('LOCATION_UNAVAILABLE', 'We couldn\'t get your location. Type your address instead.'),
    not_found: t('ERROR_NOT_FOUND_ADDRESS', 'Error, address not found')
  }[locationStatus]
  // the pieces' labels as static keys, so the catalog scan finds them
  const partLabel = { city: t('CITY', 'City'), state: t('STATE', 'State / Province') }
  const fieldLabel = (field) => partLabel[field.name] ?? t(field.name.toUpperCase(), field.code)
  const apiFieldError = (name) => apiFeedback?.fields?.[name]
  const apiFieldProps = (name) => apiFieldError(name) ? { invalid: true, 'aria-describedby': `${fieldsId}-${name}-error` } : {}
  const apiFieldMessage = (name) => apiFieldError(name) && <ErrorMsg id={`${fieldsId}-${name}-error`}>{apiFieldError(name)}</ErrorMsg>
  const showSaveHint = !isFormLocked && Object.keys(changes).length > 0 && missing.length > 0
  const missingLabels = missing
    .filter(name => name !== 'location')
    .map(name => name === 'address_notes'
      ? t('ADDRESS_NOTES', 'Address Notes')
      : t(name.toUpperCase(), inputNames.find(field => field.name === name).code))
  const mapControls = {
    ...googleMapsControls,
    isMarkerDraggable: !isFormLocked
  }

  // The Enter key of the phone's keyboard says "next" until the last field of the form
  const shownNames = inputNames.filter(field => showField && showField(field.name) &&
    (field.name === 'address' || isRequiredField(field.name) || showFieldWithTheme(field.name))).map(field => field.name)
  const enterHint = (name) => name === shownNames[shownNames.length - 1] ? 'done' : 'next'

  return (
    <AddressFormContainer
      className='address-form'
      data-doc-section='address-form'
      data-doc-state={showBootstrapSkeleton ? 'loading' : isSubmitting ? 'saving' : 'ready'}
      data-doc-mode={isEditing ? 'edit' : 'add'}
    >
      {showBootstrapSkeleton && (
        <WrapperSkeleton>
          {/* an input's height (components.input md) and the fields' space */}
          <Skeleton
            height={themeControlHeight(theme, 'input')}
            count={5}
            style={{ marginBottom: themeSpace(theme, 'lg') }}
          />
        </WrapperSkeleton>
      )}

      {!showBootstrapSkeleton && !useAlternativeMap && <PlacesSuggestions />}

      {!showBootstrapSkeleton && (
        <FormControl
          onSubmit={formMethods.handleSubmit(onSubmit)}
          onKeyDown={(e) => checkKeyDown(e)}
          aria-busy={isSaving}
        >
          <FormFields disabled={isFormLocked}>
          {inputNames.map(field => showField && showField(field.name) && (
            field.name === 'address'
              ? (
                <React.Fragment key={field.name}>
                  <LabeledField className='address-field' label={t('ADDRESS', 'Address')} htmlFor={`${fieldsId}-address`}>
                    <AddressWrap className={useAlternativeMap ? 'mapbox-control' : 'google-control'} $hasGps={!useAlternativeMap && showGpsButton}>
                      {!useAlternativeMap && (
                        <>
                          <WrapAddressInput data-doc-control='address-search' $noGps={!showGpsButton}>
                            {/* the field of the theme around the input Google Places creates */}
                            <SdkField id={`${fieldsId}-address`} error={apiFieldError('address')}>
                              {(field) => (
                                <GoogleAutocompleteInput
                                  {...field}
                                  name='address'
                                  // the room of the GPS pin at the end of the field (its measures: WrapAddressInput)
                                  style={showGpsButton ? { ...field.style, paddingInlineEnd: GPS_ROOM } : field.style}
                                  apiKey={googleMapsApiKey}
                                  placeholder={t('ADDRESS', 'Address')}
                                  onChangeAddress={(e) => {
                                    formMethods.setValue('address', e.address)
                                    handleChangeAddress(e)
                                  }}
                                  onChange={(e) => {
                                    handleChangeInput({ target: { name: 'address', value: e.target.value } })
                                    dropLocated()
                                    setAddressValue(e.target.value)
                                  }}
                                  childRef={(ref) => {
                                    googleInputRef.current = ref
                                  }}
                                  defaultValue={
                                    formState?.result?.result
                                      ? formState?.result?.result?.address
                                      : formState?.changes?.address ?? addressValue
                                  }
                                  // as Mapbox's: off with a mouse (the browser's autofill list would cover Google Places' suggestions),
                                  // `new-password` because Chrome ignores `off`. NOTE: AutocompleteInput (the components submodule)
                                  // forces autoComplete='new-field' after its props, so this has no effect until it honors the prop.
                                  autoComplete={addressSearchAutoComplete('new-password')}
                                  enterKeyHint={enterHint('address')}
                                  countryCode={configState?.configs?.country_autocomplete?.value || '*'}
                                  disabled={isFormLocked}
                                />
                              )}
                            </SdkField>
                          </WrapAddressInput>
                          {showGpsButton && (
                            <GoogleGpsButton
                              className='gps-button'
                              apiKey={googleMapsApiKey}
                              onAddress={(e) => {
                                formMethods.setValue('address', e.address)
                                handleChangeAddress(e, true)
                              }}
                              onError={setMapErrors}
                              IconButton={() => <Icon name='locationPin' />}
                              disabled={isFormLocked}
                            />
                          )}
                        </>
                      )}
                      {useAlternativeMap && (
                        <WrapMapboxInput data-doc-control='address-search' ref={mapBoxContainerRef}>
                          <Input
                            id={`${fieldsId}-address`}
                            name='address'
                            placeholder={t('ADDRESS', 'Address')}
                            onChange={(e) => changeStreet(e.target.value)}
                            onFocus={() => setInputFocused(true)}
                            value={showParts ? streetText : mapboxAddressValue}
                            autoComplete={addressSearchAutoComplete('off')}
                            enterKeyHint={enterHint('address')}
                            disabled={isFormLocked}
                            ref={googleInputRef}
                            {...apiFieldProps('address')}
                          />
                          {apiFieldMessage('address')}
                          {locationMessage && <ErrorMsg role='alert' data-doc-control='address-location-error'>{locationMessage}</ErrorMsg>}
                          {confirm && (
                            <LocationConfirm role='group' aria-label={t('ADDRESS_FOUND', 'We found this address')} data-doc-control='address-location-confirm'>
                              <p>{t('ADDRESS_FOUND', 'We found this address')}</p>
                              <strong>{confirm.address}</strong>
                              <div>
                                <Button type='button' color='primary' size='md' data-doc-control='address-location-accept' onClick={() => applyFound(confirm)}>
                                  {t('USE_THIS_ADDRESS', 'Use this address')}
                                </Button>
                                <Button type='button' color='neutral' appearance='outline' size='md' data-doc-control='address-location-reject' onClick={() => { setConfirm(null); googleInputRef.current?.focus?.() }}>
                                  {t('ADDRESS_NOT_CORRECT', 'It\'s not correct')}
                                </Button>
                              </div>
                            </LocationConfirm>
                          )}
                          {!confirm && inputFocused && (mapboxAddressValue.length > 0 || canUseLocation) && (
                            <AddressMapBoxList
                              mapBoxSuggests={mapboxAddressValue.length > 0 ? mapBoxSuggests : []}
                              onUseLocation={canUseLocation ? locateMe : undefined}
                              locating={locationStatus === 'locating'}
                              locationAddress={preview?.found?.address}
                              retrieveSuggestResult={retrievePick}
                              handleChangeAddress={handleChangeAddress}
                              onBlurInput={() => setInputFocused(false)}
                              handleChangeInput={handleChangeInput}
                              forwardRef={googleInputRef}
                            />
                          )}
                        </WrapMapboxInput>
                      )}
                    </AddressWrap>
                  </LabeledField>

                  {showGoogleMap && (
                    <WrapperMap>
                      <GoogleMapsMap
                        apiKey={googleMapsApiKey}
                        location={locationChange}
                        fixedLocation={!isEditing ? firstLocationNoEdit.value : null}
                        mapControls={mapControls}
                        handleChangeAddressMap={handleChangeAddress}
                        setErrors={setMapErrors}
                        maxLimitLocation={parseInt(maxLimitLocation, 10)}
                      />
                    </WrapperMap>
                  )}
                  {showStaticMapFallback && (
                    <StaticMap
                      sources={staticMapSources}
                      alt={t('LOCATION_MAP', 'Location map')}
                      loading='lazy'
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      // WrapperMap's `> div` carries the card look (radius,
                      // border, shadow); wrapping in a plain div reuses it
                      wrap={(img) => <WrapperMap><div>{img}</div></WrapperMap>}
                    />
                  )}
                </React.Fragment>
                )
              : (
                <React.Fragment key={field.name}>
                  {(field.part ? showParts : (isRequiredField(field.name) || showFieldWithTheme(field.name))) && (
                    <>
                      {field.name !== 'address_notes'
                        ? (
                          <LabeledField label={fieldLabel(field)} htmlFor={`${fieldsId}-${field.name}`}>
                            <FieldCell className={field.name}>
                              <Input
                                id={`${fieldsId}-${field.name}`}
                                name={field.name}
                                placeholder={fieldLabel(field)}
                                value={formState.changes?.[field.name] ?? addressState.address?.[field.name] ?? ''}
                                onChange={(e) => {
                                  if (showParts && (field.part || field.name === 'zipcode')) return changePart(field.name, e.target.value)
                                  formMethods.setValue(field.name, e.target.value)
                                  handleChangeInput({ target: { name: field.name, value: e.target.value } })
                                }}
                                autoComplete={FIELD_AUTOCOMPLETE[field.name]}
                                enterKeyHint={enterHint(field.name)}
                                maxLength={30}
                                disabled={isFormLocked}
                                {...apiFieldProps(field.name)}
                              />
                              {apiFieldMessage(field.name)}
                            </FieldCell>
                          </LabeledField>
                          )
                        : (
                          <LabeledField label={t('ADDRESS_NOTES', 'Address Notes')} htmlFor={`${fieldsId}-address_notes`}>
                            <FieldCell className='address_notes'>
                              <Textarea
                                id={`${fieldsId}-address_notes`}
                                name='address_notes'
                                rows={3}
                                placeholder={t('ADDRESS_NOTES', 'Address Notes')}
                                value={formState.changes?.address_notes ?? addressState.address.address_notes ?? ''}
                                onChange={(e) => {
                                  formMethods.setValue('address_notes', e.target.value)
                                  handleChangeInput({ target: { name: 'address_notes', value: e.target.value } })
                                }}
                                autoComplete='off'
                                maxLength={250}
                                disabled={isFormLocked}
                                {...apiFieldProps('address_notes')}
                              />
                              {apiFieldMessage('address_notes')}
                            </FieldCell>
                          </LabeledField>
                          )}
                    </>
                  )}
                  {field.name === 'zipcode' && showParts && (changes.country ?? addressState.address?.country) && (
                    <CountryRow data-doc-control='address-country'>
                      <span>{t('COUNTRY', 'Country')}</span>
                      <strong>{changes.country ?? addressState.address?.country}</strong>
                    </CountryRow>
                  )}
                </React.Fragment>
                )
          ))}

          {apiFeedback?.message && <ErrorMsg role='alert' data-doc-control='address-save-error'>{apiFeedback.message}</ErrorMsg>}
          {!isHideIcons && (
            <>
              <AddressTagsDivider>
                <p>{t('ADDRESS_LABELS', 'Address labels')}</p>
              </AddressTagsDivider>
              <AddressTagSection>
                <Chip title={t('ADDRESS_HOME', 'Home')} className={addressTag === 'home' ? 'active' : ''} selected={addressTag === 'home'} onClick={() => handleAddressTag('home')}>
                  <Icon name={ADDRESS_TAG_ICONS.home} />
                  <span>{t('ADDRESS_HOME', 'Home')}</span>
                </Chip>
                <Chip title={t('OFFICE', 'Office')} className={addressTag === 'office' ? 'active' : ''} selected={addressTag === 'office'} onClick={() => handleAddressTag('office')}>
                  <Icon name={ADDRESS_TAG_ICONS.office} />
                  <span>{t('OFFICE', 'Office')}</span>
                </Chip>
                <Chip title={t('OTHER', 'Other')} className={addressTag === 'other' ? 'active' : ''} selected={addressTag === 'other'} onClick={() => handleAddressTag('other')}>
                  <Icon name={ADDRESS_TAG_ICONS.other} />
                  <span>{t('OTHER', 'Other')}</span>
                </Chip>
              </AddressTagSection>
            </>
          )}
          <FormActions>
            {
              !hasModalClose && (
                <FormAction>
                  <Button
                    color='neutral'
                    appearance='outline'
                    size='md'
                    type='button'
                    fullWidth
                    disabled={isFormLocked}
                    onClick={() => onCancel()}
                  >
                    {t('CANCEL', 'Cancel')}
                  </Button>
                </FormAction>
              )
            }

            <FormAction>
              <Button
                id='submit-btn'
                data-doc-control='address-save'
                type='submit'
                fullWidth
                disabled={!canSubmit}
                loading={!!isSubmitting}
                aria-describedby={showSaveHint ? saveHintId : undefined}
                color='primary'
                size='md'
              >
                {isEditing || (!auth && orderState.options?.address?.address)
                  ? t('UPDATE', 'Update')
                  : t('ADD_ADDRESS', 'Add address')}
              </Button>
            </FormAction>
            {showSaveHint && (
              <SaveHint id={saveHintId} data-doc-control='address-save-hint'>
                {missingLabels.length > 0 && (
                  <span>{t('REQUIRED', 'Required')}: {missingLabels.join(', ')}</span>
                )}
                {missing.includes('location') && (
                  <span>{t('ADDRESS_REQUIRE_LOCATION', 'The address needs a location, please select one of the suggested')}</span>
                )}
              </SaveHint>
            )}
          </FormActions>
          </FormFields>
        </FormControl>
      )}

      <Alert
        title={t('ADDRESS', 'Address')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </AddressFormContainer>
  )
}

export const AddressForm = (props) => {
  const googleMapsControls = {
    defaultZoom: 17,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeId: 'roadmap', // 'roadmap', 'satellite', 'hybrid', 'terrain'
    mapTypeControl: true,
    mapTypeControlOptions: {
      mapTypeIds: ['roadmap', 'satellite']
    },
    isMarkerDraggable: true
  }
  const addressFormProps = {
    ...props,
    UIComponent: AddressFormUI,
    googleMapsControls,
    isSelectedAfterAdd: true
  }

  return <AddressFormController {...addressFormProps} />
}
