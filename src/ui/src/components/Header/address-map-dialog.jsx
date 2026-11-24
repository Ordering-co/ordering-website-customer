import React, { useRef, useState } from 'react'
import styled from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { LazyDialog } from '~ui/src/components/Overlay/lazyOverlay'
import { Button } from '~ui/src/design-system/components/Button'
import { themeIconSize, themeSpace, themeText } from '~/utils/themeTokens'
import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import illustration from './address-map-illustration.svg?url&no-inline'

const AddressMapInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin: var(--ot-space-xl) var(--ot-space-md);

  .address-map-icon {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      min-inline-size: 0;
      object-fit: contain;
    }
  }

  .address-map-info-item {
    display: flex;
    align-items: flex-start;
    padding: var(--ot-space-sm) 0;

    p {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      margin: 0;
    }

    svg {
      margin-inline-end: var(--ot-space-md);
      /* the theme's md icon */
      flex-shrink: 0;
      font-size: ${props => themeIconSize(props.theme, 'md')};
      width: ${props => themeIconSize(props.theme, 'md')};
      height: ${props => themeIconSize(props.theme, 'md')};
      margin-top: ${props => themeSpace(props.theme, 'xxs')};
    }
  }

  .explore-button {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: var(--ot-space-xl);
  }
`

export default function AddressMapDialog ({ onClose, onExplore, finalFocus }) {
  const [, t] = useLanguage()
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const exploreRef = useRef(null)
  const retry = () => {
    exploreRef.current?.focus()
    setStatus('loading')
    setAttempt(previous => previous + 1)
  }

  return (
    <LazyDialog legacyMaxWidth size='lg' open onClose={onClose} finalFocus={finalFocus}>
      <AddressMapInfoWrapper>
        <div className='address-map-icon'>
          {status === 'error'
            ? (
              <div>
                <p role='alert'>{t('ERROR', 'Error')}</p>
                <Button appearance='outline' color='neutral' onClick={retry}>{t('TRY_AGAIN', 'Please try again')}</Button>
              </div>
              )
            : (
              <img
                key={attempt}
                src={attempt ? `${illustration}?retry=${attempt}` : illustration}
                alt=''
                width='264'
                height='176'
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
              />
              )}
        </div>
        <div className='address-map-info'>
          <h2>{t('ADDRESS_MAP_TITLE', 'Discover your neighborhood with the new map')}</h2>
          <p>{t('ADDRESS_MAP_SUBTITLE', 'The new Map can help you discover the best stores wherever you are. Give it a try.')}</p>
          <div className='address-map-info-item'>
            <HeaderIcon name="locationFood" />
            <p>{t('ADDRESS_MAP_DESCRIPTION_1', 'Discover restaurants, coffee shops, groceries and more')}</p>
          </div>
          <div className='address-map-info-item'>
            <HeaderIcon name="geoAltFill" />
            <p>{t('ADDRESS_MAP_DESCRIPTION_2', 'Tap on a map pin to show popular menu items')}</p>
          </div>
          <div className='address-map-info-item'>
            <HeaderIcon name="search" />
            <p>{t('ADDRESS_MAP_DESCRIPTION_3', 'Search directly on the map to find stores around you')}</p>
          </div>
          <div className='explore-button'>
            <Button
              ref={exploreRef}
              type='button'
              color='primary'
              size='lg'
              fullWidth
              onClick={onExplore}
            >
              {t('EXPLORE', 'Explore')}
            </Button>
          </div>
        </div>
      </AddressMapInfoWrapper>
    </LazyDialog>
  )
}
