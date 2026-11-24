import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useHistory } from 'react-router-dom'

import settings from '../../config'
import { HelmetTags } from '../../components/HelmetTags'
import { homeHtml } from '../../utils/siteSettings'
import { themeMedia } from '../../utils/themeTokens'
import { applySearchOrderType, parseSearchQueryLocation, hasValidSearchLocation } from '../../utils/searchQueryLocation'

import {
  HomeContainer,
  SkeletonContainer,
  SkeletonHeader,
  SkeletonContent,
  SkeletonInformation,
  SkeletonSide
} from './styles'

import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { HomeHero } from '~ui/src/components/HomeHero'
import { PageBanner } from '~ui/src/components/PageBanner'
import { CustomOrderBanner } from '~ui/src/components/CustomOrderBanner'
import { CustomOrderModal } from '~ui/src/components/CustomOrderModal'
import { usePageSections } from '~ui/hooks/usePageSections'
import { useFindBusiness } from '~ui/hooks/useFindBusiness'

export const HomePage = (props) => {
  const history = useHistory()
  const [orderState, { changeType }] = useOrder()
  const { urlLocation, onFindBusiness } = useFindBusiness()
  const [homeState, setHomeState] = useState({ body: null, loading: false, error: null })
  const [showCustomOrder, setShowCustomOrder] = useState(false)
  const [ordering] = useApi()
  const [{ auth }] = useSession()
  const [{ configs }] = useConfig()
  const allowedOrderTypes = configs?.order_types_allowed?.value
  const customOrderEnabled = auth && configs?.custom_order_enabled?.value === '1'
  const theme = useTheme()
  const [languageState] = useLanguage()
  // The page's sections (pages.home): the hero stays first, the rest in the
  // theme's order and visibility
  const { render } = usePageSections('home')

  const requestsState = {}
  const isKioskApp = settings?.use_kiosk
  const languageCode = languageState?.language?.code
  const homeContent = homeHtml(theme)

  const homeContentRef = useRef(null)
  const displayContent = homeState.body || (homeState.useThemeContent && homeContent)

  const getPage = async () => {
    setHomeState({ body: null, loading: true, error: null, useThemeContent: false })
    try {
      const source = {}
      requestsState.page = source

      if (languageCode) {
        const { content: { error: langError, result: langResult } } = await ordering
          .pages(`homeContent2_${languageCode}`)
          .get({ cancelToken: source })

        if (!langError && langResult?.body && langResult?.enabled) {
          setHomeState({ body: langResult.body, loading: false, error: null, useThemeContent: false })
          return
        }
      }

      if (homeContent) {
        setHomeState({ body: null, loading: false, error: null, useThemeContent: true })
        return
      }

      const { content: { error, result } } = await ordering.pages('homeContent2').get({ cancelToken: source })

      if (!error && result?.body) {
        setHomeState({ body: result.body, loading: false, error: null, useThemeContent: false })
      } else {
        setHomeState({ body: null, loading: false, error: error ? result : null, useThemeContent: false })
      }
    } catch (err) {
      if (err.constructor.name !== 'Cancel') {
        setHomeState({ body: null, loading: false, error: [err.message], useThemeContent: false })
      }
    }
  }

  useEffect(() => {
    if (!isKioskApp) {
      getPage()
    }
    return () => {
      if (requestsState.page) {
        requestsState.page?.cancel?.()
      }
    }
  }, [languageCode])

  const handleHomeContentClick = useCallback(async (event) => {
    const anchor = event.target.closest('a')
    if (!anchor || !homeContentRef.current?.contains(anchor)) return

    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

    let url
    try {
      url = new URL(href, window.location.origin)
    } catch {
      return
    }

    if (url.origin !== window.location.origin) return

    event.preventDefault()

    const cityLocation = parseSearchQueryLocation(url.search)
    const isCitySearchLink = url.pathname === '/search' && cityLocation
    const hasOrderLocation = hasValidSearchLocation(orderState?.options?.address?.location)

    if (isCitySearchLink) {
      if (hasOrderLocation) {
        history.push('/search')
        return
      }
      await applySearchOrderType({
        search: url.search,
        activeType: orderState?.options?.type,
        allowedTypes: allowedOrderTypes,
        changeType
      })
      history.push(`${url.pathname}${url.search}${url.hash}`)
      return
    }

    history.push(`${url.pathname}${url.search}${url.hash}`)
  }, [history, orderState?.options?.address?.location, orderState?.options?.type, changeType, allowedOrderTypes])

  useEffect(() => {
    const node = homeContentRef.current
    if (!node || !displayContent) return

    node.addEventListener('click', handleHomeContentClick)
    return () => node.removeEventListener('click', handleHomeContentClick)
  }, [displayContent, handleHomeContentClick])

  const homeHeroProps = {
    ...props,
    urlLocation,
    onFindBusiness
  }

  return (
    <>
      <HelmetTags page='home' />
      <HomeContainer data-doc-section='website-home'>
        <HomeHero
          {...homeHeroProps}
        />
        {render({
          custom_order_banner: () => customOrderEnabled && (
            <CustomOrderBanner onCustomOrderClick={() => setShowCustomOrder(true)} />
          ),
          content: () => (
            <>
              {homeState.loading && (
                <SkeletonContainer>
                  <SkeletonHeader>
                    <Skeleton width='100%' height='100%' />
                  </SkeletonHeader>
                  <SkeletonContent>
                    <SkeletonInformation>
                      <Skeleton width='100%' height={themeMedia(theme, 'xs')} />
                      <Skeleton width='100%' height={themeMedia(theme, 'xs')} />
                      <Skeleton width='100%' height={themeMedia(theme, 'xs')} />
                      <Skeleton width='100%' height={themeMedia(theme, 'xs')} />
                    </SkeletonInformation>
                    <SkeletonSide>
                      <Skeleton width='100%' height='100%' />
                    </SkeletonSide>
                  </SkeletonContent>
                </SkeletonContainer>
              )}
              {displayContent && (
                <div
                  ref={homeContentRef}
                  dangerouslySetInnerHTML={{
                    __html: displayContent
                  }}
                />
              )}
            </>
          ),
          promo_banners: () => <PageBanner position='web_home_page' />
        }, { group: 'main' })}
      </HomeContainer>
      {customOrderEnabled && (
        <CustomOrderModal
          open={showCustomOrder}
          onClose={() => setShowCustomOrder(false)}
        />
      )}
    </>
  )
}

export default HomePage
