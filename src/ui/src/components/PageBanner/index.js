import React, { useRef } from 'react'
import { useTheme } from 'styled-components'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  BannerContainer,
  BannerTitle,
  BannerWrapper,
  ImageWrapper,
  BannerArrow,
  PROMO_CAROUSEL
} from './styles'

import { useSite } from '~components/contexts/SiteContext'
import { useEvent } from '~components/contexts/EventContext'
import { PageBanner as PageBannerController } from '~components/components/PageBanner'

import { useLanguage } from '~components/contexts/LanguageContext'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'

import { checkSiteUrl } from '~ui/utils'
import { swiperSpeed } from '~/utils/themeMotion'
import { slotButtonOptions } from '~/utils/themeGroups'

const PageBannerUI = (props) => {
  const {
    pageBannerState,
    title,
    isCustomerMode,
    handleCustomProductBannerClick,
    business,
    isHorizontal
  } = props

  const [{ site }] = useSite()
  const theme = useTheme()
  const [events] = useEvent()
  const [, t] = useLanguage()

  // The carousel's arrows are icon buttons of the theme (with a name, by
  // keyboard), handed to Swiper as its navigation
  const prevRef = useRef(null)
  const nextRef = useRef(null)
  const hasManyItems = pageBannerState.banner?.items?.length > 1
  // the arrows' size, color and appearance
  // (components.promo_carousel.slots.arrow), else small neutral solid
  const arrowProps = slotButtonOptions(theme, 'promo_carousel', 'arrow', { size: 'sm', color: 'neutral', appearance: 'solid' })

  const businessUrlTemplate = checkSiteUrl(site?.business_url_template, '/store/:business_slug')
  const productUrlTemplate = checkSiteUrl(site?.product_url_template, '/store/:business_slug?category=:category_id&product=:product_id')

  const onProductRedirect = ({ slug, category, product }) => {
    if (!category && !product) {
      if (isCustomerMode) {
        return events.emit('go_to_page', { page: 'business', params: { store: slug } })
      } else {
        if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug') {
          return events.emit('go_to_page', { page: 'business', params: { business_slug: slug }, replace: false })
        } else {
          return events.emit('go_to_page', { page: 'business', search: `?${businessUrlTemplate.split('?')[1].replace(':business_slug', '')}${slug}`, replace: false })
        }
      }
    }
    events.emit('product_banner_clicked')
    if (isCustomerMode) {
      return events.emit('go_to_page', {
        page: 'business',
        params: { store: slug },
        search: `?category=${category}&product=${product}`,
        replace: true
      })
    } else {
      if (productUrlTemplate === '/store/:business_slug/:category_slug/:product_slug' || productUrlTemplate === '/:business_slug/:category_slug/:product_slug') {
        return events.emit('go_to_page', {
          page: 'product',
          params: {
            business_slug: slug,
            category_slug: category,
            product_slug: product
          },
          replace: false
        })
      }
      if (productUrlTemplate.includes('/store/:category_slug/:product_slug')) {
        const businessParameter = businessUrlTemplate.replace('/store?', '').replace('=:business_slug', '')
        return events.emit('go_to_page', {
          page: 'product',
          params: {
            category_slug: category,
            product_slug: product
          },
          search: `?${businessParameter}=${slug}`,
          replace: false
        })
      }
      if (productUrlTemplate.includes('/store/:business_slug') && productUrlTemplate.includes('category_id')) {
        const ids = productUrlTemplate.split('?')[1].split('&')
        const categoryParameter = ids[0].replace('=:category_id', '')
        const productParameter = ids[1].replace('=:product_id', '')
        return events.emit('go_to_page', {
          page: 'product',
          params: {
            business_slug: slug
          },
          search: `?${categoryParameter}=${category}&${productParameter}=${product}`,
          replace: false
        })
      }
      if (productUrlTemplate.includes('/:business_slug') && !productUrlTemplate.includes('store')) {
        const ids = productUrlTemplate.split('?')[1].split('&')
        const categoryParameter = ids[0].replace('=:category_id', '')
        const productParameter = ids[1].replace('=:product_id', '')
        return events.emit('go_to_page', {
          page: 'product',
          params: {
            business_slug: slug
          },
          search: `?${categoryParameter}=${category}&${productParameter}=${product}`,
          replace: false
        })
      }
    }
  }

  // a banner has no text of its own: it is named by the product it opens (when
  // that product is in this business), else by this business (when it does not
  // open another one), else generically. A clickable banner is a button: this is its name.
  const bannerAlt = (item) => {
    const action = item?.action
    const targetSlug = action?.url?.split('store/')[1]?.split('?')[0]
    if (action?.type === 'product' && targetSlug && targetSlug === business?.slug) {
      const urlParams = new URLSearchParams(action.url.split('?')[1])
      const category = business?.categories?.find(category => category.id === Number(urlParams.get('category')))
      const product = category?.products?.find(product => product.id === Number(urlParams.get('product')))
      if (product?.name) return product.name
    }
    if (business?.name && (!targetSlug || targetSlug === business?.slug)) return business.name
    return t('PROMOTIONAL_BANNER', 'Promotional banner')
  }

  const handleGoToPage = (action) => {
    if (!action?.url) return
    let slug
    if (action.type === 'business') {
      slug = action.url.split('store/')[1]
      onProductRedirect({ slug })
    }
    if (action.type === 'product') {
      slug = action.url.split('store/')[1]?.split('?')[0]
      const paramString = action.url.split('?')[1]
      const urlParams = new URLSearchParams(paramString)
      const productId = urlParams.get('product')
      const categoryId = urlParams.get('category')
      const foundCategory = business?.categories?.find(category => category.id === Number(categoryId))
      const foundProduct = foundCategory?.products?.find(product => product.id === Number(productId))
      if (business?.slug === slug && foundProduct) {
        handleCustomProductBannerClick(foundProduct)
      } else {
        onProductRedirect({ slug, category: categoryId, product: productId })
      }
    }
  }

  return (
    <>
      {pageBannerState.loading && (
        <BannerContainer isHorizontal={isHorizontal}>
          {Array.from({ length: 3 }).map((_, i) => (
            <BannerWrapper key={i}>
              <Skeleton height={170} />
            </BannerWrapper>
          ))}
        </BannerContainer>
      )}
      {!pageBannerState.loading && pageBannerState.banner?.items?.length > 0 && (
        <>
          {title && <BannerTitle>{title}</BannerTitle>}
          <BannerContainer isHorizontal={isHorizontal}>
            {isHorizontal
              ? (
                  pageBannerState.banner?.items.map((img, i) => (
                    <BannerWrapper key={i} $clickable={!!img?.action?.url}>
                      <ImageWrapper
                        isHorizontal={isHorizontal}
                        {...(img?.action?.url && { as: 'button', type: 'button', $clickable: true, onClick: () => handleGoToPage(img?.action) })}
                      >
                        <img src={img.url} className='banner-img' alt={bannerAlt(img)} />
                      </ImageWrapper>
                    </BannerWrapper>
                  ))
                )
              : (
                <>
                {hasManyItems && (
                  <>
                    <BannerArrow $side='prev'>
                      <Button ref={prevRef} shape='icon' aria-label={t('PREVIOUS', 'Previous')} {...arrowProps}>
                        <Icon name='keyboardArrowLeft' />
                      </Button>
                    </BannerArrow>
                    <BannerArrow $side='next'>
                      <Button ref={nextRef} shape='icon' aria-label={t('NEXT', 'Next')} {...arrowProps}>
                        <Icon name='keyboardArrowRight' />
                      </Button>
                    </BannerArrow>
                  </>
                )}
                <Swiper
                  speed={swiperSpeed(theme, PROMO_CAROUSEL)}
                  navigation={hasManyItems && { prevEl: prevRef.current, nextEl: nextRef.current }}
                  onBeforeInit={(swiper) => {
                    // the arrows exist before Swiper starts: they are its navigation
                    if (hasManyItems && typeof swiper.params.navigation === 'object') {
                      swiper.params.navigation.prevEl = prevRef.current
                      swiper.params.navigation.nextEl = nextRef.current
                    }
                  }}
                  spaceBetween={0}
                  modules={[Navigation]}
                  shortSwipes={false}
                  loop={pageBannerState.banner?.items.length > 1}
                  touchStartPreventDefault={false}
                  slidesPerView={1}
                >
                  {pageBannerState.banner?.items.map((img, i) => (
                    <SwiperSlide key={i}>
                      <ImageWrapper
                        {...(img?.action?.url && { as: 'button', type: 'button', $clickable: true, onClick: () => handleGoToPage(img?.action) })}
                      >
                        <img src={img.url} className='banner-img' alt={bannerAlt(img)} />
                      </ImageWrapper>
                    </SwiperSlide>
                  ))}
                </Swiper>
                </>
                )}
          </BannerContainer>
        </>
      )}
    </>
  )
}

export const PageBanner = (props) => {
  const pageBannerProps = {
    ...props,
    UIComponent: PageBannerUI
  }
  return <PageBannerController {...pageBannerProps} />
}
