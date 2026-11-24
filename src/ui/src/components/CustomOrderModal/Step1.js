import React, { useState, useEffect, useMemo } from 'react'
import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSession } from '~components/contexts/SessionContext'
import { GoogleMaps as GoogleMapsMap } from '~components/components/GoogleMaps'
import { AutocompleteInput as GoogleAutocompleteInput } from '~components/components/GoogleAutocompleteInput'
import { useTheme } from 'styled-components'
import { haversineDistanceKm } from '../../utils/customOrder'
import { orderMapMarker } from '~/utils/mapMarkers'
import { themeSpace } from '~/utils/themeTokens'
import {
  ModalBody,
  StepSubtitle,
  StepperContainer,
  StepperDot,
  StepperLine,
  AddressRow,
  AddressIcon,
  MapWrapper,
  DistanceInfo,
  StepActions,
  PickupNameField
} from './styles'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Input } from '~ui/src/design-system/components/Input'
import { SdkField } from '~ui/src/design-system/components/SdkField'

export const Step1 = ({ pluginConfig, initialData, onContinue }) => {
  const [ordering] = useApi()
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [{ configs }] = useConfig()
  const [{ user, token }] = useSession()
  const theme = useTheme()
  const googleMapsApiKey = configs?.google_maps_api_key?.value
  const maxDistance = pluginConfig?.max_distance || null

  const defaultAddress = orderState?.options?.address

  const toValidLocation = (loc) => {
    if (!loc) return null
    const lat = Number(loc.lat)
    const lng = Number(loc.lng)
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null
    return { lat, lng }
  }

  const [pickupAddress, setPickupAddress] = useState(initialData?.pickupAddress || '')
  const [pickupLocation, setPickupLocation] = useState(() => toValidLocation(initialData?.pickupLocation))
  const [pickupName, setPickupName] = useState(initialData?.pickupName || '')
  const [deliveryAddress, setDeliveryAddress] = useState(initialData?.deliveryAddress || defaultAddress?.address || '')
  const [deliveryLocation, setDeliveryLocation] = useState(() => toValidLocation(initialData?.deliveryLocation) || toValidLocation(defaultAddress?.location))
  const [distanceKm, setDistanceKm] = useState(null)

  const distanceExceeded = distanceKm !== null && maxDistance && distanceKm > maxDistance
  const canContinue = pickupAddress && pickupLocation && pickupName?.trim() && deliveryAddress && deliveryLocation && !distanceExceeded

  useEffect(() => {
    if (pickupLocation && deliveryLocation) {
      const d = haversineDistanceKm(
        pickupLocation.lat, pickupLocation.lng,
        deliveryLocation.lat, deliveryLocation.lng
      )
      setDistanceKm(Math.round(d * 1000) / 1000)
    } else {
      setDistanceKm(null)
    }
  }, [pickupLocation, deliveryLocation])

  const handleContinue = async () => {
    let addressId = defaultAddress?.id

    const isSameAddress = defaultAddress?.location?.lat === deliveryLocation?.lat &&
      defaultAddress?.location?.lng === deliveryLocation?.lng

    if (!isSameAddress && deliveryLocation) {
      const existingAddresses = user?.addresses || []
      const found = existingAddresses.find(a =>
        a?.location?.lat === deliveryLocation.lat &&
        a?.location?.lng === deliveryLocation.lng
      )

      if (found) {
        addressId = found.id
      } else {
        const { content: { error, result } } = await ordering
          .setAccessToken(token)
          .users(user?.id)
          .addresses()
          .save({ address: deliveryAddress, location: deliveryLocation })

        if (!error && result?.id) {
          addressId = result.id
        }
      }
    }

    onContinue({
      pickupAddress,
      pickupLocation,
      pickupName,
      deliveryAddress,
      deliveryLocation,
      addressId,
      distanceKm
    })
  }

  const pickupLoc = useMemo(() => toValidLocation(pickupLocation), [pickupLocation?.lat, pickupLocation?.lng])
  const deliveryLoc = useMemo(() => toValidLocation(deliveryLocation), [deliveryLocation?.lat, deliveryLocation?.lng])

  // the map.* images of the theme (the user photo is not a marker)
  const businessIcon = orderMapMarker(theme, 'store')
  const userIcon = orderMapMarker(theme, 'customer')

  const showMap = pickupLoc && deliveryLoc
  const mapKey = showMap ? `${pickupLoc.lat},${pickupLoc.lng}|${deliveryLoc.lat},${deliveryLoc.lng}` : ''
  const mapLocations = useMemo(() => showMap
    ? [
        { lat: pickupLoc.lat, lng: pickupLoc.lng, icon: businessIcon },
        { lat: deliveryLoc.lat, lng: deliveryLoc.lng, icon: userIcon }
      ]
    : []
  , [mapKey])

  return (
    <ModalBody data-doc-section='custom-order-step1' data-doc-state={canContinue ? 'ready' : distanceExceeded ? 'distance-exceeded' : 'incomplete'}>
      <StepSubtitle>{t('CUSTOM_ORDER_STEP1_SUBTITLE', 'We will take it to you')}</StepSubtitle>

      <StepperContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: themeSpace(theme, 'md') }}>
          <AddressRow>
            <AddressIcon><Icon name='shoppingBag' /></AddressIcon>
            <SdkField label={pickupAddress ? t('CUSTOM_ORDER_PICKUP_PLACEHOLDER', 'Where do we pickup or buy the product?') : undefined}>
              {(field) => (
                <GoogleAutocompleteInput
                  {...field}
                  data-doc-control='custom-order-pickup-address'
                  apiKey={googleMapsApiKey}
                  placeholder={t('CUSTOM_ORDER_PICKUP_PLACEHOLDER', 'Where do we pickup or buy the product?')}
                  aria-label={t('CUSTOM_ORDER_PICKUP_PLACEHOLDER', 'Where do we pickup or buy the product?')}
                  defaultValue={pickupAddress}
                  autoComplete='new-password'
                  onChangeAddress={(addressData) => {
                    setPickupAddress(addressData.address)
                    setPickupLocation(toValidLocation(addressData.location))
                    if (addressData.place_name && addressData.place_types?.includes('establishment')) {
                      setPickupName(addressData.place_name)
                    }
                  }}
                />
              )}
            </SdkField>
          </AddressRow>

          {pickupAddress && (
            <PickupNameField>
              <Input
                data-doc-control='custom-order-pickup-name'
                placeholder={t('CUSTOM_ORDER_PICKUP_NAME_PLACEHOLDER', 'Pickup details.')}
                aria-label={t('CUSTOM_ORDER_PICKUP_NAME_PLACEHOLDER', 'Pickup details.')}
                value={pickupName}
                onChange={e => setPickupName(e.target.value)}
              />
            </PickupNameField>
          )}

          <AddressRow>
            <AddressIcon><Icon name='location' /></AddressIcon>
            <SdkField label={deliveryAddress ? t('CUSTOM_ORDER_DELIVERY_PLACEHOLDER', 'Where do we deliver?') : undefined}>
              {(field) => (
                <GoogleAutocompleteInput
                  {...field}
                  data-doc-control='custom-order-delivery-address'
                  apiKey={googleMapsApiKey}
                  placeholder={t('CUSTOM_ORDER_DELIVERY_PLACEHOLDER', 'Where do we deliver?')}
                  aria-label={t('CUSTOM_ORDER_DELIVERY_PLACEHOLDER', 'Where do we deliver?')}
                  defaultValue={deliveryAddress}
                  autoComplete='new-password'
                  onChangeAddress={(addressData) => {
                    setDeliveryAddress(addressData.address)
                    setDeliveryLocation(toValidLocation(addressData.location))
                  }}
                />
              )}
            </SdkField>
          </AddressRow>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${themeSpace(theme, 'md')} 0` }}>
          <StepperDot active={!!pickupLocation} />
          <StepperLine />
          <StepperDot active={!!deliveryLocation} filled={!!deliveryLocation} />
        </div>
      </StepperContainer>

      {showMap && (
        <>
          <MapWrapper>
            {googleMapsApiKey && (
              <GoogleMapsMap
                key={mapKey}
                apiKey={googleMapsApiKey}
                location={pickupLoc}
                locations={mapLocations}
                manualZoom
                mapControls={{ zoomControl: true, streetViewControl: false, fullscreenControl: false }}
              />
            )}
          </MapWrapper>
          {distanceKm !== null && (
            <DistanceInfo exceeded={distanceExceeded ? 1 : 0}>
              {distanceExceeded
                ? t('CUSTOM_ORDER_DISTANCE_EXCEEDED', 'Distance exceeded _MAX_km').replace('_MAX_', maxDistance)
                : t('CUSTOM_ORDER_DISTANCE', 'Distance: _KM_km').replace('_KM_', distanceKm)
              }
            </DistanceInfo>
          )}
        </>
      )}

      <StepActions>
        <Button
          fullWidth
          size='md'
          iconEnd={<Icon name='arrowRight' />}
          data-doc-control='custom-order-continue'
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {t('CONTINUE', 'Continue')}
        </Button>
      </StepActions>
    </ModalBody>
  )
}

export default Step1
