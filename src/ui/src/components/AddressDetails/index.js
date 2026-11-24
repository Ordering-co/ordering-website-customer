import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import {
  AddressContainer,
  Map,
  ShowMapLink,
  WrappMap
} from './styles'

import { Icon } from '~ui/src/design-system/components/Icon'
import { businessesMapFallback, orderMapMarker, themedStaticMapUrl } from '~/utils/mapMarkers'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { Button } from '~ui/src/design-system/components/Button'
import { SectionHeader, SectionLine } from '~ui/src/styles/DetailsSection'

import { AddressDetails as AddressDetailsController } from '~components/components/AddressDetails'
import { useOrder } from '~components/contexts/OrderContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Alert } from '~ui/src/components/Confirm'
import { AddressList } from '~ui/src/components/AddressList'
import { StaticMap } from '~ui/src/components/StaticMap'
import { showsCustomerAddress } from '~/utils/singleStore'

const AddressDetailsUI = (props) => {
  const {
    addressToShow,
    isCartPending,
    googleMapsUrl,
    isCustomerMode,
    apiKey,
    isFromCheckout,
    isMultiCheckout,
    openCarts,
    cart,
    businessLogo
  } = props

  const theme = useTheme()
  const [orderState] = useOrder()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [openModal, setOpenModal] = useState(false)
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [isShowMap, setIsShowMap] = useState(false)
  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
  const [{ user }] = useCustomer()
  const useAlternativeMap = configs?.use_alternative_to_google_maps?.value === '1'
  const mapboxToken = configs?.map_box_token?.value
  const hideMap = false
  const title = orderState?.options?.type === 1 ? t('DELIVERY_ADDRESS', 'Delivery Address') : t('ADDRESS', 'Address')
  const canChange = orderState?.options?.type === 1 && !isCartPending
  // The customer marked with map.customer and each business with map.store
  // (its logo first when there are several), T8
  const mapUrl = themedStaticMapUrl(theme, googleMapsUrl, {
    customerIcon: orderMapMarker(theme, 'customer'),
    businessIcons: isMultiCheckout
      ? (openCarts || []).map((openCart) => openCart?.business?.logo || businessesMapFallback(theme))
      : [orderMapMarker(theme, 'store', cart?.business?.logo || businessLogo)],
    customerOnly: !isMultiCheckout && !cart
  })
  // Mapbox is StaticMap's failover when Google's fails; use_alternative_to_google_maps
  // sends it there directly instead of hiding the map
  const mapSources = [(!useAlternativeMap && apiKey) ? mapUrl : null, mapboxStaticUrl(mapUrl, mapboxToken)]
  const canShowMap = !hideMap && mapSources.some(Boolean)

  useEffect(() => {
    return () => setOpenModal(false)
  }, [])

  // The customer's address section, not the store's: only the
  // order types that need it (showsCustomerAddress).
  if (!showsCustomerAddress(orderState?.options?.type)) return null

  const map = (
    <StaticMap
      sources={mapSources}
      id='google-maps-image'
      alt={t('LOCATION_MAP', 'Location map')}
      loading='lazy'
      wrap={(img) => (
        <WrappMap>
          <Map>{img}</Map>
        </WrappMap>
      )}
    />
  )

  return (
    // The section of the customer details (UserDetails) in the checkouts, the
    // only screens that render this one
    <AddressContainer data-doc-section='checkout-fulfillment-address' $multi={!!isMultiCheckout}>
      <SectionHeader>
        {/* a section of the checkout's h1 */}
        <h2>{title}</h2>
        {canChange && (
          <Button
            data-doc-control='checkout-address-change'
            shape='icon'
            color='neutral'
            appearance='ghost'
            type='button'
            aria-label={t('CHANGE_ADDRESS', 'Change address')}
            onClick={() => setOpenModal(true)}
          >
            <Icon name='pencil' />
          </Button>
        )}
      </SectionHeader>
      <SectionLine>{addressToShow || orderState?.options?.address?.address}</SectionLine>
      {canShowMap && (isShowMap
        ? map
        : (
          <ShowMapLink data-doc-control='checkout-address-show-map' onClick={() => setIsShowMap(true)}>
            {t('SHOW_MAP', 'Show map')}
          </ShowMapLink>
          ))}
      {openModal && (
        <DialogOverlay
          legacyMaxWidth
          open={openModal}
          width='70%'
          onClose={() => setOpenModal(false)}
        >
          <AddressList
            title={t('DELIVERY_ADDRESS', 'Delivery Address')}
            isModal
            changeOrderAddressWithDefault
            userId={isNaN(userCustomer?.id) ? null : userCustomer?.id}
            onCancel={() => setOpenModal(false)}
            userCustomerSetup={isCustomerMode && user}
            isFromCheckout={isFromCheckout}
            isCustomerMode={isCustomerMode}
          />
        </DialogOverlay>
      )}

      <Alert
        title={t('SEARCH', 'Search')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => setAlertState({ open: false, content: [] })}
        onAccept={() => setAlertState({ open: false, content: [] })}
        closeOnBackdrop={false}
      />
    </AddressContainer>
  )
}

export const AddressDetails = (props) => {
  const addressDetailsProps = {
    ...props,
    UIComponent: AddressDetailsUI
  }
  return (
    <AddressDetailsController {...addressDetailsProps} />
  )
}
