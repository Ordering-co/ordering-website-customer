import React, { useState } from 'react'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { SingleProductCard as FavoriteController } from '~components/components/SingleProductCard'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { themeImage } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'

import { CardLink } from '~ui/src/styles/Card'
import { usePhotoWithFallback } from '~ui/src/components/Image/useImageLoad'

import { AddSlot, FavoriteSlot, ProductCard, ProductPhoto, ProductPrice, ProductRow, ProductTile, SoldOutTag } from './storeMenuStyles'

const isSoldOut = (product) => !!(product?.inventoried && !product?.quantity)

// How many of the product are in the cart (what the "+" shows)
export const quantityInCart = (cart, product) => (cart?.products ?? []).reduce(
  (total, line) => total + (line?.id === product?.id ? line?.quantity : 0), 0
)

/**
 * The "+" of a product (the photo's corner): it adds the product through `onAdd` (the store's own add: straight
 * to the cart when nothing is to be chosen, the product's form when something is) and shows how many are in the
 * cart once there are some. Named by the product.
 */
export const StoreProductAdd = ({ product, quantity, onAdd }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const inCart = quantity > 0 && !themeHidden(theme, 'product.cart_quantity')
  const label = `${product?.name}: ${t('ADD_TO_CART', 'Add to cart')}${quantity > 0 ? ` (${quantity})` : ''}`
  return (
    <AddSlot>
      <Button
        size='sm'
        color={inCart ? 'primary' : 'neutral'}
        shape={inCart ? 'text' : 'icon'}
        aria-label={label}
        data-doc-control='business-product-add'
        data-doc-quantity={quantity}
        onClick={() => onAdd(product)}
      >
        {inCart ? quantity : <Icon name='plusLg' />}
      </Button>
    </AddSlot>
  )
}

/**
 * The photo of a product, painted only once it is whole (a photo drawn as it arrives stays half painted when the
 * download is slow or cut; implementation notes): the theme's loading placeholder fills the box while it loads, the theme's
 * placeholder image takes its place when it fails, and the box keeps the placeholder fill when that fails too. The
 * box is the same in every state (its size is ProductPhoto's).
 */
const StorePhoto = ({ image, fallbackImage, children, ...rest }) => {
  const { state, url } = usePhotoWithFallback(image, fallbackImage)
  return (
    <ProductPhoto {...rest} $image={url} data-image-state={state}>
      {state === 'loading' && <Skeleton containerClassName='photo-skeleton' borderRadius='inherit' width='100%' height='100%' />}
      {children}
    </ProductPhoto>
  )
}

const useProductParts = (product) => {
  const theme = useTheme()
  const [{ parsePrice, optimizeImage }] = useUtils()
  const hideImage = themeHidden(theme, 'product.image') || (!product?.images && themeHidden(theme, 'product.dummy_image'))
  const placeholder = !themeHidden(theme, 'product.dummy_image') && themeImage(theme, 'placeholder.product')
  const showOffer = !themeHidden(theme, 'product.offer_price') && !!(product?.offer_price && product?.in_offer)
  return {
    hideImage,
    image: !hideImage && optimizeImage(product?.images || placeholder || '', 'h_200,c_limit'),
    // the theme's placeholder, for a photo that fails (already `image` when the product has no photo)
    fallbackImage: !hideImage && placeholder ? optimizeImage(placeholder, 'h_200,c_limit') : undefined,
    price: product?.price ? parsePrice(product.price) : '',
    offerPrice: showOffer ? parsePrice(product.offer_price) : null,
    showDescription: !themeHidden(theme, 'product.description') && !!product?.description
  }
}

const Price = ({ price, offerPrice }) => (
  <ProductPrice>
    <span className='current-price'>{price}</span>
    {offerPrice && <s className='off-price'>{offerPrice}</s>}
  </ProductPrice>
)

// The name is the card's button (a stretched link: the whole card opens the product); the "+" is apart over it
const Title = ({ product, onProductClick }) => (
  <CardLink as='button' $card='product_card' onClick={() => onProductClick(product)}>{product?.name}</CardLink>
)

/** A product as a row (the direct menu): name, description and price, its photo at the end with the "+". */
export const StoreProductRow = ({ product, currentCart, onProductClick, onProductAdd }) => {
  const [, t] = useLanguage()
  const { image, fallbackImage, hideImage, price, offerPrice, showDescription } = useProductParts(product)
  const soldOut = isSoldOut(product)
  return (
    <ProductRow data-doc-section='business-product-row' data-doc-product-id={product?.id}>
      <div className='info'>
        <h3><Title product={product} onProductClick={onProductClick} /></h3>
        {showDescription && <p className='description'>{product.description}</p>}
        <Price price={price} offerPrice={offerPrice} />
      </div>
      {!hideImage && (
        <StorePhoto image={image} fallbackImage={fallbackImage} $soldOut={soldOut}>
          {soldOut
            ? <SoldOutTag>{t('SOLD_OUT', 'Sold out')}</SoldOutTag>
            : <StoreProductAdd product={product} quantity={quantityInCart(currentCart, product)} onAdd={onProductAdd} />}
        </StorePhoto>
      )}
      {hideImage && !soldOut && <StoreProductAdd product={product} quantity={quantityInCart(currentCart, product)} onAdd={onProductAdd} />}
    </ProductRow>
  )
}

/** A product as a tile (the visual showcase and the featured carousels): a large photo, the name and the price. */
export const StoreProductTile = ({ product, currentCart, onProductClick, onProductAdd, featured }) => {
  const [, t] = useLanguage()
  const { image, fallbackImage, hideImage, price, offerPrice } = useProductParts(product)
  const soldOut = isSoldOut(product)
  return (
    <ProductTile $featured={featured} data-doc-section='business-product-tile' data-doc-product-id={product?.id}>
      {!hideImage && (
        <StorePhoto image={image} fallbackImage={fallbackImage} $soldOut={soldOut} $tile>
          {soldOut
            ? <SoldOutTag>{t('SOLD_OUT', 'Sold out')}</SoldOutTag>
            : <StoreProductAdd product={product} quantity={quantityInCart(currentCart, product)} onAdd={onProductAdd} />}
        </StorePhoto>
      )}
      <h3><Title product={product} onProductClick={onProductClick} /></h3>
      <Price price={price} offerPrice={offerPrice} />
    </ProductTile>
  )
}

// The heart of a product: the store's favorite (the card's controller does the request); a visitor without a
// session is asked to log in first, as on the store's own favorite.
const FavoriteUI = ({ product, handleFavoriteProduct }) => {
  const [, t] = useLanguage()
  const [{ auth }, { login }] = useSession()
  const [page, setPage] = useState(null)
  const link = (to, label) => <a href='#' onClick={(event) => { event.preventDefault(); setPage(to) }}>{label}</a>
  return (
    <>
      <Button
        favorite
        size='sm'
        aria-label={t('FAVORITE', 'Favorite')}
        aria-pressed={!!product?.favorite}
        data-doc-control='business-product-favorite'
        onClick={() => auth ? handleFavoriteProduct(!product?.favorite) : setPage('login')}
      >
        <Icon name={product?.favorite ? 'heartFilled' : 'heartOutline'} />
      </Button>
      {page && (
        <DialogOverlay legacyMaxWidth open onClose={() => setPage(null)} width='50%'>
          {page === 'login' && (
            <LoginForm
              handleSuccessLogin={(user) => user && setPage(null)}
              elementLinkToSignup={link('signup', t('CREATE_ACCOUNT', 'Create account'))}
              elementLinkToForgotPassword={link('forgotpassword', t('RESET_PASSWORD', 'Reset Password'))}
              useLoginByCellphone
              isPopup
            />
          )}
          {page === 'signup' && (
            <SignUpForm
              elementLinkToLogin={link('login', t('LOGIN', 'Login'))}
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={(user) => login({ user, token: user?.session?.access_token })}
              isPopup
              closeModal={() => setPage(null)}
            />
          )}
          {page === 'forgotpassword' && (
            <ForgotPasswordForm elementLinkToLogin={link('login', t('LOGIN', 'Login'))} isPopup />
          )}
        </DialogOverlay>
      )}
    </>
  )
}

export const StoreProductFavorite = ({ product, handleUpdateProducts }) => (
  <FavoriteController product={product} handleUpdateProducts={handleUpdateProducts} UIComponent={FavoriteUI} />
)

/** A product as a card (the classic): name, description and price with its heart, the photo at the end with the "+". */
export const StoreProductCard = ({ product, currentCart, onProductClick, onProductAdd, handleUpdateProducts }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const { image, fallbackImage, hideImage, price, offerPrice, showDescription } = useProductParts(product)
  const soldOut = isSoldOut(product)
  return (
    <ProductCard data-doc-section='business-product-card' data-doc-product-id={product?.id}>
      <div className='info'>
        <h3><Title product={product} onProductClick={onProductClick} /></h3>
        {showDescription && <p className='description'>{product.description}</p>}
        <div className='bottom'>
          <Price price={price} offerPrice={offerPrice} />
          {!themeHidden(theme, 'product.favorite') && <FavoriteSlot><StoreProductFavorite product={product} handleUpdateProducts={handleUpdateProducts} /></FavoriteSlot>}
        </div>
      </div>
      {!hideImage && (
        <StorePhoto image={image} fallbackImage={fallbackImage} $soldOut={soldOut} $card>
          {soldOut
            ? <SoldOutTag>{t('SOLD_OUT', 'Sold out')}</SoldOutTag>
            : <StoreProductAdd product={product} quantity={quantityInCart(currentCart, product)} onAdd={onProductAdd} />}
        </StorePhoto>
      )}
      {hideImage && !soldOut && <StoreProductAdd product={product} quantity={quantityInCart(currentCart, product)} onAdd={onProductAdd} />}
    </ProductCard>
  )
}
