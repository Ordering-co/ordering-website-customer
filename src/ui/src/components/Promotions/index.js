import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  PromotionsContainer,
  PromotionTitle,
  SingleOfferContainer,
  ExpiresAt,
  OfferInformation,
  SearchBarContainer,
  BusinessLogo,
  SingleBusinessOffer,
  AvailableBusinesses,
  Description,
  OfferData,
  Code,
  BusinessInfo,
  OfferView,
  OfferInfoWrapper,
  OfferViewList,
  OfferWrapper,
  OfferDescriptionWrapper
} from './styles'

import { PromotionsController } from '~components/components/PromotionsController'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSite } from '~components/contexts/SiteContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useEvent } from '~components/contexts/EventContext'
import { SearchBar } from '~ui/src/components/SearchBar'
import { Button } from '~ui/src/design-system/components/Button'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { checkSiteUrl } from '~ui/utils'
import { themeVisible } from '~/utils/themeVisibility'
import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'
import { usePageSections } from '~ui/hooks/usePageSections'
import { slotButtonOptions } from '~/utils/themeGroups'

const PromotionsUI = (props) => {
  const {
    offersState,
    handleSearchValue,
    searchValue,
    offerSelected,
    setOfferSelected,
    businessSlug
  } = props
  const [, t] = useLanguage()
  const [{ parseDate, parsePrice }] = useUtils()
  const [events] = useEvent()
  const [openModal, setOpenModal] = useState(false)
  const [{ site }] = useSite()
  const theme = useTheme()
  // The page's sections (pages.promotions): the search can be hidden
  const { isVisible } = usePageSections('promotions')
  // parts of each offer the theme may hide (visibility
  // promotions.offer.*): its image, description and expiry date (card and
  // modal), and the card's "Apply for"
  const showOfferImage = themeVisible(theme, 'promotions.offer.image')
  const showOfferDescription = themeVisible(theme, 'promotions.offer.description')
  const showOfferExpires = themeVisible(theme, 'promotions.offer.expires')
  const showOfferApplyFor = themeVisible(theme, 'promotions.offer.apply_for')
  // the offer card's button (offer_card.slots.action)
  const actionProps = slotButtonOptions(theme, 'offer_card', 'action', { color: 'primary', size: 'md' })
  // in the offer's modal, the offer's name is the dialog's heading (its title
  // row) and "Available businesses" the level below
  const SectionTitle = modalSectionLevel(theme)

  const businessUrlTemplate = checkSiteUrl(site?.business_url_template, '/store/:business_slug')

  const handleClickOffer = (offer) => {
    setOpenModal(true)
    setOfferSelected(offer)
  }

  const handleBusinessClick = (business) => {
    if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug') {
      events.emit('go_to_page', { page: 'business', params: { business_slug: business.slug } })
    } else {
      events.emit('go_to_page', { page: 'business', search: `?${businessUrlTemplate.split('?')[1].replace(':business_slug', '')}${business.slug}` })
    }
  }

  const filterBusinessesBySlug = (list) => {
    if (!businessSlug || !list) return list
    return list.filter(b => String(b?.id) === String(businessSlug) || b?.slug === businessSlug)
  }

  const filteredOffers = offersState?.offers?.filter(offer => offer?.name?.toLowerCase()?.includes(searchValue?.toLowerCase()))
  const hasOffers = (offersState?.offers?.length ?? 0) > 0
  const isSearchEmpty = hasOffers && !!searchValue && (filteredOffers?.length ?? 0) === 0
  const isListEmpty = !offersState?.loading && !offersState?.error && (filteredOffers?.length ?? 0) === 0

  const targetString = offerSelected?.target === 1
    ? t('SUBTOTAL', 'Subtotal')
    : offerSelected?.target === 2
      ? t('DELIVERY_FEE', 'Delivery fee')
      : t('SERVICE_FEE', 'Service fee')

  return (
    <PromotionsContainer
      data-doc-section='promotions'
      data-doc-state={offersState?.loading ? 'loading' : offersState?.error ? 'error' : isSearchEmpty ? 'search-empty' : isListEmpty ? 'empty' : 'results'}
    >
      <PromotionTitle>
        {t('OFFERS', 'Offers')}
      </PromotionTitle>
      {!offersState?.loading && offersState.offers?.length > 0 && isVisible('search') && (
        <SearchBarContainer data-doc-control='promotions-search'>
          <SearchBar
            placeholder={t('SEARCH_PROMOTION', 'Search promotion')}
            clearAnchor='right'
            onSearch={handleSearchValue}
          />
        </SearchBarContainer>
      )}

      {offersState?.loading && (
        <>
          {[...Array(5).keys()].map((key, i) => (
            <SingleOfferContainer key={i}>
              <OfferInformation>
                <Skeleton height={20} width={150} />
                <Skeleton height={15} width={225} />
                <Skeleton height={15} width={380} />
              </OfferInformation>
              <Skeleton height={44} width={110} />
            </SingleOfferContainer>
          ))}
        </>
      )}
      {offersState?.error && (
        <NotFoundSource
          headingLevel='h2'
          icon='ticket'
          content={Array.isArray(offersState.error) ? offersState.error.join(', ') : offersState.error}
        />
      )}
      {!offersState?.error && isSearchEmpty && (
        <NotFoundSource
          headingLevel='h2'
          variant='empty'
          icon='ticket'
          content={t('NO_PROMOTIONS_MATCH_SEARCH', 'No promotions match your search')}
          subtitle={t('TRY_A_DIFFERENT_SEARCH', 'Try a different search term.')}
        />
      )}
      {!offersState?.error && isListEmpty && !isSearchEmpty && (
        <NotFoundSource
          headingLevel='h2'
          variant='empty'
          icon='ticket'
          content={t('NO_PROMOTIONS_AVAILABLE', 'No promotions available right now')}
          subtitle={t('NO_PROMOTIONS_AVAILABLE_DESC', 'Check back later for new offers in your area.')}
        />
      )}
      {!offersState?.loading && offersState.offers?.length > 0 && filteredOffers?.map(offer => (
        <OfferWrapper data-doc-section='promotion-card' key={offer.id}>
          <SingleOfferContainer>
            <OfferInformation id='offer-info'>
              {showOfferExpires && (
                <ExpiresAt>
                  <span>{t('EXPIRES', 'Expires')} {parseDate(offer?.end, { outputFormat: 'MMM DD, YYYY' })} <span className='or-while-stocks-last'>{t('OR_WHILE_STOCKS_LAST', 'or while stocks last.')}</span></span>
                </ExpiresAt>
              )}
              {/* a section of the page (h2 under its h1) with the card title's look */}
              <h2 title={offer?.name}>{offer?.name}</h2>
              {showOfferApplyFor && (
                <AvailableBusinesses>
                  <p>{t('APPLY_FOR', 'Apply for')}:</p>
                  <p>
                    {(filterBusinessesBySlug(offer.businesses) || []).map((business, i, arr) => (
                      <React.Fragment key={business?.id}>{' '}{business?.name}{i + 1 < arr.length ? ',' : ''}</React.Fragment>
                    ))}
                  </p>
                </AvailableBusinesses>
              )}
            </OfferInformation>
            <OfferInfoWrapper id='offer-wrap'>
              {showOfferImage && offer?.image && (
                <BusinessLogo bgimage={offer.image} />
              )}
            </OfferInfoWrapper>
          </SingleOfferContainer>
          <OfferDescriptionWrapper>
            {showOfferDescription && <Description title={offer?.description}>{offer?.description}</Description>}
            <Button
              data-doc-control='promotion-open'
              {...actionProps}
              onClick={() => handleClickOffer(offer)}
            >
              {t('USE_COUPON', 'Use coupon')}
            </Button>
          </OfferDescriptionWrapper>
        </OfferWrapper>
      ))}
      {openModal && (
        <DialogOverlay
          open={openModal}
          onClose={() => setOpenModal(false)}
          // the offer's name (the card's heading) is the modal's title, in
          // the close's row; the modal's own padding
          title={offerSelected?.name}
          data-doc-section='promotion-details-dialog'
        >
          <OfferView data-doc-section='promotion-details'>
            {showOfferImage && offerSelected?.image && (
              <BusinessLogo bgimage={offerSelected.image} fromModal />
            )}
            {showOfferExpires && (
              <ExpiresAt>
                <span>{t('EXPIRES', 'Expires')}: {parseDate(offerSelected?.end, { outputFormat: 'MMM DD, YYYY' })} <span className='or-while-stocks-last'>{t('OR_WHILE_STOCKS_LAST', 'or while stocks last.')}</span></span>
              </ExpiresAt>
            )}
            <OfferData>
              {offerSelected?.type === 2 && (
                <Code>
                  <span>{offerSelected.coupon}</span>
                </Code>
              )}
              <div className='offer-data-content'>
                {showOfferDescription && offerSelected?.description && (
                  <p className='description'>{offerSelected?.description}</p>
                )}
                <p className='terms-and-conditions'>{t('TERMS_AND_CONDITIONS', 'Terms and conditions')}</p>
                <div className='offer-data-content-info'>
                  <p>
                    {`${offerSelected?.name} / ${t('VALUE_OF_OFFER', 'Value of offer')}: ${offerSelected?.rate_type === 1 ? `${offerSelected?.rate}%` : `${parsePrice(offerSelected?.rate)}`}`}
                  </p>
                  <p>{t('APPLIES_TO', 'Applies to')}: {targetString}</p>
                  {offerSelected?.auto && (
                    <p>{t('OFFER_AUTOMATIC', 'This offer applies automatic')}</p>
                  )}
                  {offerSelected?.minimum && (
                    <p>{t('MINIMUM_PURCHASE_FOR_OFFER', 'Minimum purchase for use this offer')}: {parsePrice(offerSelected?.minimum)}</p>
                  )}
                  {offerSelected?.max_discount && (
                    <p>{t('MAX_DISCOUNT_ALLOWED', 'Max discount allowed')}: {parsePrice(offerSelected?.max_discount)}</p>
                  )}
                </div>
              </div>
            </OfferData>
            {!businessSlug && (
              <SectionTitle className='available-businesses-title'>
                {t('AVAILABLE_BUSINESSES_FOR_OFFER', 'Available businesses for this offer')}
              </SectionTitle>
            )}
            <OfferViewList>
              {filterBusinessesBySlug(offerSelected?.businesses)?.map(business => {
                return (
                  <SingleBusinessOffer key={business.id}>
                    {/* a business without a logo shows the theme's placeholder */}
                    {(business?.logo || businessLogoPlaceholder(theme)) && (
                      <BusinessLogo isLogo bgimage={business?.logo || businessLogoPlaceholder(theme)} />
                    )}
                    <BusinessInfo>
                      <p>{business.name}</p>
                      <Button
                        data-doc-control='promotion-open-business'
                        onClick={() => handleBusinessClick(business)}
                        {...actionProps}
                      >
                        {t('USE_COUPON', 'Use coupon')}
                      </Button>
                    </BusinessInfo>
                  </SingleBusinessOffer>
                )
              })}
            </OfferViewList>
          </OfferView>
        </DialogOverlay>
      )}
    </PromotionsContainer>
  )
}

export const Promotions = (props) => {
  const PromotionsProps = {
    ...props,
    UIComponent: PromotionsUI
  }

  return (
    <PromotionsController {...PromotionsProps} />
  )
}
