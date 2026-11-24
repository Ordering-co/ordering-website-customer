import React from 'react'
import { OrderingProvider } from '~components/contexts/OrderingContext'
import { useCookieConsent } from '../../contexts/CookieConsentContext'

// Sits between SubdomainComponent and the rest of the tree: SubdomainComponent
// clones its child with `settings`, so every prop it injects must be forwarded
// to OrderingProvider untouched. The visitor's cookie consent decides whether
// the library may store and send marketing attribution. It also waits until the
// site knows whether the banner applies: the library keeps the visit in memory
// meanwhile and stores it with its own time, so waiting loses nothing.
export const ConsentOrderingProvider = (props) => {
  const { hasConsented, isConsentResolved } = useCookieConsent()
  return <OrderingProvider {...props} referralEnabled={isConsentResolved && hasConsented} waitForGuestDeliveryAddress />
}
