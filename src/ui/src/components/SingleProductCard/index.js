import React, { useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import {
  CardContainer,
  CardInfo,
  WrapLogo,
  WrapTags,
  CardLogo,
  SoldOut,
  PriceWrapper,
  QuantityContainer,
  RibbonBox,
  TitleWrapper,
  LastOrder,
  productImageSizes,
  previousHeight
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { ToastType, useToast } from '~components/contexts/ToastContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSession } from '~components/contexts/SessionContext'
import { SingleProductCard as SingleProductCardController } from '~components/components/SingleProductCard'

import { Button as BaseButton } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Alert } from '~ui/src/components/Confirm'
import { shape } from '~ui/utils'
import { useIntersectionObserver } from '~ui/hooks/useIntersectionObserver'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'

import { themeImage, themeTextStyle } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { CardLink } from '~ui/src/styles/Card'
import { slotButtonOptions } from '~/utils/themeGroups'

const singleProductCardPropsAreEqual = (prevProps, nextProps) => {
  return JSON.stringify(prevProps.product) === JSON.stringify(nextProps.product) &&
    prevProps.isSkeleton === nextProps.isSkeleton &&
    prevProps.isSoldOut === nextProps.isSoldOut &&
    prevProps.isCartOnProductsList === nextProps.isCartOnProductsList &&
    prevProps.productAddedToCartLength === nextProps.productAddedToCartLength
}

const SingleProductCardUI = React.memo((props) => {
  const {
    product,
    isSoldOut,
    isSkeleton,
    onProductClick,
    isCartOnProductsList,
    useCustomFunctionality,
    onCustomClick,
    customText,
    useKioskApp,
    productAddedToCartLength,
    handleFavoriteProduct,
    isFavorite,
    isPreviously,
    viewString,
    isFeatured,
    fromOrders
  } = props

  const [, t] = useLanguage()
  const [$element, isObserved] = useIntersectionObserver()
  const [stateConfig] = useConfig()
  const [{ parsePrice, optimizeImage, parseDate }] = useUtils()
  const [orderState] = useOrder()
  const [{ auth }, { login }] = useSession()
  const theme = useTheme()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalPageToShow, setModalPageToShow] = useState(null)
  const [alertState, setAlertState] = useState({ open: false, content: [] })

  const editMode = typeof product?.code !== 'undefined'
  const isObservedValidation = isObserved || useKioskApp

  const removeToBalance = editMode ? product?.quantity : 0

  const cartProducts = Object.values(orderState.carts).reduce((products, _cart) => [...products, ..._cart?.products], [])
  const productBalance = cartProducts.reduce((sum, _product) => sum + (_product.id === product?.id ? _product.quantity : 0), 0)

  const totalBalance = (productBalance || 0) - removeToBalance

  const maxCartProductConfig = (stateConfig.configs.max_product_amount ? parseInt(stateConfig.configs.max_product_amount) : 100) - totalBalance

  // the card's "Add", off by default (visibility product.add_button): the
  // look of the card's action, as "Order" (the name opens the product)
  const hideAddButton = themeHidden(theme, 'product.add_button')
  // the product's ribbon over its image (product.ribbon), the price before
  // the offer (product.offer_price) and how many are in the cart
  // (product.cart_quantity)
  const hideRibbon = themeHidden(theme, 'product.ribbon')
  const hideOfferPrice = themeHidden(theme, 'product.offer_price')
  const hideCartQuantity = themeHidden(theme, 'product.cart_quantity')
  const showRibbon = !hideRibbon && !!product?.ribbon?.enabled
  const showOfferPrice = !hideOfferPrice && !!(product?.offer_price && product?.in_offer)
  const hideProductDescription = themeHidden(theme, 'product.description') || isPreviously || fromOrders
  // the placeholder product image: visibility product.dummy_image
  const hideProductDummyLogo = themeHidden(theme, 'product.dummy_image')
  const productDummy = !hideProductDummyLogo && themeImage(theme, 'placeholder.product')
  // the image of a product in a cart (cart.products.image); in the card,
  // product.image
  const hideProductLogo = themeHidden(theme, viewString ? 'cart.products.image' : 'product.image')
  // no photo to show: hidden by the theme, or no photo and no placeholder
  const hideImage = (!product?.images && hideProductDummyLogo) || hideProductLogo
  // what the photo is painted from, once it is whole (CardLogo): the product's,
  // else the placeholder; the placeholder again when the product's fails. A
  // hidden image downloads nothing.
  const logoImage = hideImage ? undefined : optimizeImage(product?.images || productDummy, 'h_86,c_limit')
  const logoFallback = hideImage || !productDummy ? undefined : optimizeImage(productDummy, 'h_86,c_limit')
  const hideFavoriteIcon = themeHidden(theme, 'product.favorite')
  const hideTags = themeHidden(theme, 'product.tags')

  let maxCartProductInventory = (product?.inventoried ? product?.quantity : undefined) - totalBalance
  maxCartProductInventory = !isNaN(maxCartProductInventory) ? maxCartProductInventory : maxCartProductConfig

  const maxProductQuantity = Math.min(maxCartProductConfig, maxCartProductInventory)

  // the card opens the product only when it is given what to do (the store,
  // favorites, previous orders); elsewhere (the tax modal) it only shows it
  const isClickable = !isSkeleton && (useCustomFunctionality ? !!onCustomClick : !!onProductClick)
  // the card is a plain box and its name is the button that
  // opens it (a stretched link over the whole card); the favorite is a
  // button of its own over it.
  // the sizes of the card's images (components.product_card)
  const imageSizes = productImageSizes(theme)
  // the box of the plain card's skeleton is its image's (WrapLogo)
  const skeletonImageSize = isFavorite ? imageSizes.favorite : fromOrders ? imageSizes.order : imageSizes.card

  const handleClickProduct = (e) => {
    if (productAddedToCartLength && product?.maximum_per_order && productAddedToCartLength >= product?.maximum_per_order) {
      setAlertState({
        open: true,
        content: [t('PRODUCT_ON_MAXIMUM_ORDER', 'The product is on maximum order')]
      })
      return
    }

    if (isFavorite) {
      onProductClick && onProductClick()
      return
    }
    (!isSkeleton && !useCustomFunctionality && onProductClick && onProductClick(product, product?.business?.slug)) ||
      (useCustomFunctionality && onCustomClick && onCustomClick())
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const handleChangeFavorite = () => {
    if (auth) {
      handleFavoriteProduct && handleFavoriteProduct(!product?.favorite)
    } else {
      setModalPageToShow('login')
      setIsModalOpen(true)
    }
  }

  const favoriteButton = (
    <BaseButton
      favorite
      className='favorite-icon'
      aria-label={t('FAVORITE', 'Favorite')}
      aria-pressed={!!product?.favorite}
      onClick={handleChangeFavorite}
    >
      <Icon name={product?.favorite ? 'heartFilled' : 'heartOutline'} />
    </BaseButton>
  )

  const closeAuthModal = () => {
    setIsModalOpen(false)
    setModalPageToShow(null)
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeAuthModal()
    }
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  return (
    <>
      <CardContainer
        data-doc-section={isFavorite ? 'favorite-product-card' : undefined}
        data-doc-product-id={isFavorite ? product?.id : undefined}
        data-doc-available-businesses={isFavorite ? product?.businesses?.length ?? 0 : undefined}
        ref={$element}
        soldOut={isSoldOut || maxProductQuantity <= 0}
        $clickable={isClickable}
        isCartOnProductsList={isCartOnProductsList}
        className='product-card'
        isShowAddButt={!useCustomFunctionality && !hideAddButton && !isSkeleton}
        useCustomFunctionality={useCustomFunctionality}
        isPreviously={isPreviously}
        isFeatured={isFeatured}
        isFavorite={isFavorite}
        fromOrders={fromOrders}
        $hideImage={hideImage}
      >
        {/* the row is always there (its height is the image's, see
            CardContainer): the card keeps its size until it is observed */}
        <div>
          {isObservedValidation && (<>
            {!useCustomFunctionality && (
              <>
                {!isSkeleton && !hideCartQuantity && productAddedToCartLength > 0 && (
                  <QuantityContainer isFeatured={isFeatured} isPreviously={isPreviously}>
                    <span>{productAddedToCartLength}</span>
                  </QuantityContainer>
                )}
                {(isPreviously || isFeatured) && (
                  <>
                    {!isSkeleton
                      ? (<WrapLogo
                          isFeatured={isFeatured}
                          isPreviously={isPreviously}
                          isBgimage={optimizeImage(!hideProductLogo ? product?.images || productDummy : '', 'h_86,c_limit')}
                          hideImage={hideImage}
                        >
                          {showRibbon && (
                            <RibbonBox
                              bgColor={product?.ribbon?.color}
                              isRoundRect={product?.ribbon?.shape === shape?.rectangleRound}
                              isCapsule={product?.ribbon?.shape === shape?.capsuleShape}
                            >
                              {product?.ribbon?.text}
                            </RibbonBox>
                          )}
                          <CardLogo
                            className='image'
                            soldOut={isSoldOut || maxProductQuantity <= 0}
                            bgimage={logoImage}
                            fallbackImage={logoFallback}
                          />
                        </WrapLogo>)
                      : <Skeleton height={isFeatured ? imageSizes.featured : previousHeight(imageSizes.previous)} width={isFeatured ? imageSizes.featured : imageSizes.previous} />}
                  </>
                )}
                <CardInfo
                  className='card-info'
                  soldOut={isSoldOut || maxProductQuantity <= 0}
                  isBgimage={optimizeImage(product?.images || productDummy, 'h_86,c_limit')}
                  oneLine={isPreviously || isFavorite || fromOrders}
                  isPreviously={isPreviously}
                  isFeatured={isFeatured}
                  isFavorite={isFavorite}
                  fromOrders={fromOrders}
                  hideImage={hideImage}
                >
                  <TitleWrapper isPreviously={isPreviously} isFeatured={isFeatured} isFavorite={isFavorite} fromOrders={fromOrders}>
                    {!isSkeleton
                      ? (
                        <h3>
                          {isClickable && !useCustomFunctionality
                            ? <CardLink as='button' $card='product_card' onClick={handleClickProduct}>{product?.name}</CardLink>
                            : product?.name}
                        </h3>
                        )
                      : <Skeleton width={100} />}
                  </TitleWrapper>
                  {isPreviously && (!isSkeleton ? (<LastOrder>{t('LAST_ORDERED_ON', 'Last ordered on')} {parseDate(product?.last_ordered_date, { outputFormat: 'MMM DD, YYYY' })}</LastOrder>) : (<Skeleton width={80} />))}
                  {/* no description, no part: it would leave a double gap */}
                  {!hideProductDescription && !isFeatured && !isPreviously && (isSkeleton || !!product?.description) && (
                    <>
                      {!isSkeleton ? (<p className='description'>{product?.description}</p>) : (<Skeleton width={100} />)}
                    </>
                  )}
                  {!isSkeleton
                    ? (
                      <div className='product-card-info'>
                        <PriceWrapper isOffPrice={showOfferPrice} isFavorite={isFavorite} fromOrders={fromOrders}>
                          <span className='current-price'>{product?.price ? parsePrice(product?.price) : ''}</span>
                          {!(isSoldOut || maxProductQuantity <= 0) && !hideOfferPrice && (
                            <span className='off-price'>{showOfferPrice ? parsePrice(product?.offer_price) : ''}</span>
                          )}
                          {!isFeatured && !isPreviously && !fromOrders && !hideTags && product?.tags && product?.tags.length > 0 && (
                            <WrapTags>
                              {product?.tags.map((tag, i) => (
                                <div key={i}>
                                  <img src={tag.image ?? ''} alt={tag.image ? (tag.name || '') : ''} />
                                </div>
                              ))}
                            </WrapTags>
                          )}
                          {(isFavorite && !useKioskApp && !hideFavoriteIcon && !isPreviously && !isFeatured) && (
                            !isSkeleton
                              ? favoriteButton
                              : (<Skeleton width={16} height={16} />)
                          )}
                        </PriceWrapper>
                        {(!useKioskApp && !isPreviously && !isFeatured) && (
                          !isSkeleton
                            ? (
                              <>
                                {!isFavorite && !fromOrders
                                  ? (
                                    <>
                                      {!hideFavoriteIcon && favoriteButton}
                                    </>
                                    )
                                  : (
                                    <span className='order-button'>
                                      <BaseButton decorative layout='inline' borderInset fullWidth {...slotButtonOptions(theme, 'product_card', 'action', { color: 'secondary' })}>
                                        {t('ORDER_NOW', 'Order now')}
                                      </BaseButton>
                                    </span>
                                    )}
                              </>
                              )
                            : (<Skeleton width={16} height={16} />)
                        )}
                      </div>
                      )
                    : <Skeleton width={100} />}
                </CardInfo>
                {(!isPreviously && !isFeatured) && (
                  <>
                    {!isSkeleton
                      ? (<WrapLogo
                          isBgimage={optimizeImage(!hideProductLogo ? product?.images || productDummy : '', 'h_86,c_limit')}
                          isFavorite={isFavorite}
                          fromOrders={fromOrders}
                          hideImage={hideImage}
                        >
                          {showRibbon && (
                            <RibbonBox
                              bgColor={product?.ribbon?.color}
                              isRoundRect={product?.ribbon?.shape === shape?.rectangleRound}
                              isCapsule={product?.ribbon?.shape === shape?.capsuleShape}
                            >
                              {product?.ribbon?.text}
                            </RibbonBox>
                          )}
                          <CardLogo
                            className='image'
                            soldOut={isSoldOut || maxProductQuantity <= 0}
                            bgimage={logoImage}
                            fallbackImage={logoFallback}
                          />
                        </WrapLogo>)
                      : !hideImage && <Skeleton height={skeletonImageSize} width={skeletonImageSize} />}
                  </>
                )}
                {(isSoldOut || maxProductQuantity <= 0) && (
                  <SoldOut isBottom={showRibbon}>{t('SOLD_OUT', 'Sold out')}</SoldOut>
                )}
              </>
            )}
            {useCustomFunctionality && customText && (
              <span style={themeTextStyle(theme, 'body_lg', { fontSize: 16, fontWeight: 500 })}>
                {isClickable
                  ? <CardLink as='button' $card='product_card' onClick={handleClickProduct}>{customText}</CardLink>
                  : customText}
              </span>
            )}
          </>)}
        </div>
        {!useCustomFunctionality && !hideAddButton && !isSkeleton && (
          <span className='add-button'>
            <BaseButton
              decorative
              layout='inline'
              borderInset
              fullWidth
              appearance='outline'
              disabled={!!(productAddedToCartLength && product?.maximum_per_order && productAddedToCartLength >= product?.maximum_per_order)}
            >
              {t('ADD', 'Add')}
            </BaseButton>
          </span>
        )}
      </CardContainer>
      {isModalOpen && (
        <DialogOverlay
          legacyMaxWidth
          open={isModalOpen}
          onClose={() => closeAuthModal()}
          width='50%'
        >
          {modalPageToShow === 'login' && (
            <LoginForm
              handleSuccessLogin={handleSuccessLogin}
              elementLinkToSignup={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'signup' })
                  } href='#'
                >{t('CREATE_ACCOUNT', 'Create account')}
                </a>
              }
              elementLinkToForgotPassword={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'forgotpassword' })
                  } href='#'
                >{t('RESET_PASSWORD', 'Reset Password')}
                </a>
              }
              useLoginByCellphone
              isPopup
            />
          )}
          {modalPageToShow === 'signup' && (
            <SignUpForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={handleSuccessSignup}
              isPopup
              closeModal={() => closeAuthModal()}
            />
          )}
          {modalPageToShow === 'forgotpassword' && (
            <ForgotPasswordForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              isPopup
            />
          )}
        </DialogOverlay>
      )}
      <Alert
        title={t('PRODUCT', 'Product')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </>
  )
}, singleProductCardPropsAreEqual)

export const SingleProductCard = (props) => {
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const onFavoriteError = () => showToast(ToastType.Error, t('NETWORK_ERROR', 'Network error, please reload the page'))

  const singleProductCardProps = {
    ...props,
    onFavoriteError,
    UIComponent: SingleProductCardUI
  }
  return <SingleProductCardController {...singleProductCardProps} />
}
