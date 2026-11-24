import React, { useEffect, useMemo, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import {
  HighestRatedContainer,
  BusinessList,
  Title,
  BusinessListWrapper,
  Description
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { BusinessList as BusinessListController } from '~components/components/BusinessList'

import { AutoScroll } from '~ui/src/components/AutoScroll'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { getCateringValues } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'
import { BusinessPreorder } from '~ui/src/components/BusinessPreorder'
import { BusinessController } from '~ui/src/components/BusinessController'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

const HighestRatedUI = (props) => {
  const {
    scrollId,
    businessesList,
    handleBusinessClick,
    isCustomLayout,
    handleClickAddress,
    isCustomerMode,
    favoriteIds,
    setFavoriteIds,
    businessUrlTemplate,
    title,
    description,
    titleAs,
    onVisibleChange
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [isPreorder, setIsPreorder] = useState(false)
  const [preorderBusiness, setPreorderBusiness] = useState(null)

  const businesses = businessesList?.businesses ?? []
  const isAllBusinessesWithoutReviews = businesses.length > 0 &&
    businesses.every((business) => (business?.reviews?.total ?? 0) === 0)
  const cateringTypeString = orderState?.options?.type === 7
    ? 'catering_delivery'
    : orderState?.options?.type === 8
      ? 'catering_pickup'
      : null
  const cateringValues = preorderBusiness?.configs && getCateringValues(cateringTypeString, preorderBusiness?.configs)

  const handleClosePreorder = () => {
    setIsPreorder(false)
    setPreorderBusiness(null)
  }

  useEffect(() => {
    if (preorderBusiness) setIsPreorder(true)
  }, [preorderBusiness])

  useEffect(() => {
    if (!businessesList?.businesses?.length) return
    const ids = [...(favoriteIds ?? [])]
    businessesList.businesses.forEach(business => {
      if (business?.favorite) {
        ids.push(business.id)
      }
    })
    setFavoriteIds && setFavoriteIds([...new Set(ids)])
  }, [businessesList?.businesses?.length])

  const businesslist = useMemo(
    () => businesses.filter((business) => (business?.reviews?.total ?? 0) > 0 || scrollId),
    [businesses, scrollId]
  )

  const showEmptyState = handleClickAddress &&
    !isCustomerMode &&
    !businessesList.loading &&
    (businesses.length === 0 || (isAllBusinessesWithoutReviews && !scrollId))
  const showSection = businessesList?.loading || businesslist.length > 0 || showEmptyState

  // A standalone skeleton keeps its layout. When the page owns the heading
  // hierarchy, a loading placeholder must not introduce an empty heading.
  const decorativeTitle = Boolean(onVisibleChange && businessesList?.loading)
  // Tells the page whether the section shows businesses (e.g. to pick its h1)
  const isVisible = !businessesList?.loading && !businessesList?.error && businesslist.length > 0
  useEffect(() => {
    onVisibleChange && onVisibleChange(isVisible)
  }, [isVisible])
  useEffect(() => () => onVisibleChange && onVisibleChange(false), [])

  if (!businessesList?.loading && (businessesList.error || businesslist.length === 0)) return null

  return (
    <>
      {showSection && (
      <HighestRatedContainer>
        <Title as={decorativeTitle ? 'div' : titleAs} aria-hidden={decorativeTitle || undefined} $level={titleAs} $withDescription={!!description}>
          {businessesList?.loading
            ? <Skeleton width={220} height={24} />
            : (title ?? t('EVERYONES_FAVORITE', 'Everyone\'s favorite'))}
        </Title>
        {description && (
          <Description $level={titleAs}>
            {businessesList?.loading ? <Skeleton width={120} height={14} /> : description}
          </Description>
        )}
        <BusinessListWrapper>
          <BusinessList>
            {
              showEmptyState && (
                <NotFoundSource
                  variant='empty'
                  icon='star'
                  content={t('NO_HIGHEST_RATED_BUSINESSES', 'No highly rated businesses in this area yet')}
                  subtitle={t('NO_BUSINESSES_AVAILABLE_DESC', 'Try changing your address or filters.')}
                >
                  <Button
                    appearance='outline'
                    size='md'
                    onClick={() => handleClickAddress()}
                  >
                    {t('CHANGE_ADDRESS', 'Select other Address')}
                  </Button>
                </NotFoundSource>
              )
            }
            <AutoScroll scrollId={scrollId ?? 'highestRated'}>
              {
                !businessesList?.loading && businesslist?.map((business) => (
                    <BusinessController
                      key={business.id}
                      className='card'
                      business={business}
                      isBusinessOpen={business.open && business?.enabled !== false}
                      handleCustomClick={handleBusinessClick}
                      orderType={orderState?.options?.type}
                      isCustomLayout={isCustomLayout}
                      isCustomerMode={isCustomerMode}
                      favoriteIds={favoriteIds}
                      setFavoriteIds={setFavoriteIds}
                      onPreorderBusiness={setPreorderBusiness}
                      businessUrlTemplate={businessUrlTemplate}
                      // the card's logo and favorite (business_card.logo /
                      // .favorite), as the listing's cards
                      withLogoAndFavorite
                      // the cards' names one level under the title
                      nameAs={titleAs === 'h1' ? 'h2' : 'h3'}
                    />
                ))
              }
            </AutoScroll>
            {businessesList.loading && (
              [...Array(8).keys()].map(i => (
                <BusinessController
                  key={i}
                  className='card'
                  business={{}}
                  isSkeleton
                  withLogoAndFavorite
                  orderType={orderState?.options?.type}
                />
              ))
            )}
          </BusinessList>
        </BusinessListWrapper>
      </HighestRatedContainer>
      )}
      {isPreorder && (
        <DialogOverlay
          open={isPreorder}
          size='xl'
          onClose={() => handleClosePreorder()}
        >
          <BusinessPreorder
            business={preorderBusiness}
            handleClick={handleBusinessClick}
            showButton
            cateringPreorder={!!cateringTypeString}
            {...cateringValues}
          />
        </DialogOverlay>
      )}
    </>
  )
}

const HighestRatedController = (props) => {
  const highestRatedProps = {
    ...props,
    UIComponent: HighestRatedUI,
    avoidRefreshUserInfo: true
  }
  return <BusinessListController {...highestRatedProps} />
}

// Whether it shows is the page's decision (its sections: highest_rated,
// featured), not the block's.
export const HighestRated = (props) => <HighestRatedController {...props} />
