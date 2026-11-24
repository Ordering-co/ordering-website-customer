import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import { Actions, Identity, IdentityMain, Meta, NameRow } from './storeHeaderStyles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Dot } from '~ui/src/design-system/components/Dot'
import { BusinessStickyHeader } from '~ui/src/components/BusinessStickyHeader'

// Short form of an address for a phone: its last two parts ("Manchester M12 6DA, UK")
const shortAddress = (address) => address.split(',').slice(-2).join(',').trim()

/**
 * The identity of the store page's designs: the name (the page's h1, with the favorite), one line about the
 * store (open or closed, how the order goes, Info) and the actions it has (reviews, change store, reservations).
 * The closed notice is the other cell of the grid: beside the identity from the desktop cut, under it before.
 * `onCover`: it is over the cover's photo (the showcase), in the color of text over photos. The classic (`cover`)
 * has its line apart: the status with what it says (`statusLabel`), the address (short on a phone) and Info.
 */
export const StoreIdentity = ({ variant, onCover, loading, business, brand, onBack, favorite, status, statusLabel, address, orderTypeLabel, info, actions, closedCard }) => {
  const [, t] = useLanguage()
  return (
    <Identity $variant={variant} $onCover={onCover} data-doc-section='business-identity'>
      <IdentityMain>
        {!loading && <BusinessStickyHeader name={business?.name} onBack={onBack} brand={brand} />}
        <NameRow $onCover={onCover}>
          {!loading
            ? (
              <>
                <h1 className='bold' id='business_name' title={business?.name}>{business?.name}</h1>
                {favorite}
              </>
              )
            : <Skeleton width='12em' height='1.5em' />}
        </NameRow>
        {!loading && (
          <Meta $onCover={onCover} $line={variant === 'cover'} data-doc-section='business-identity-meta'>
            {status === 'closed' && <span className='status'><Dot color='danger' />{statusLabel || t('CLOSED', 'Closed')}</span>}
            {status === 'open' && <span className='status'><Dot color='success' />{t('OPEN_NOW', 'Open now')}</span>}
            {address && (
              <span className='address' title={address}>
                <span className='address-short'>{shortAddress(address)}</span>
                <span className='address-full'>{address}</span>
              </span>
            )}
            {orderTypeLabel && <span>{orderTypeLabel}</span>}
            {info}
          </Meta>
        )}
        {actions && <Actions>{actions}</Actions>}
      </IdentityMain>
      {closedCard}
    </Identity>
  )
}
