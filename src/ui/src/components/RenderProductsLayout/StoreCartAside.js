import React from 'react'
import { useTheme } from 'styled-components'

import { EmptyCart, Title } from './styles'
import { CartBox } from './storeMenuStyles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Cart } from '~ui/src/components/Cart'
import { FreeDeliveryProgress } from '~ui/src/components/FreeDeliveryProgress'
import { EmptyStateArt, EmptyStateIcon } from '~ui/src/components/NotFoundSource'
import { themeVisible } from '~/utils/themeVisibility'
import { useCartLineHighlight } from '~ui/hooks/useStoreCartFeedback'

/**
 * The cart beside the direct menu (desktop): the store's own Cart with the order so far, its total and the way to
 * pay (the cart's button); empty, a word that invites to add dishes with the "+".
 */
export const StoreCartAside = ({ currentCart, business, freeDeliveryProgress, handleCartOpen, isCartOnProductsList, productLoading, setProductLoading }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const hasProducts = currentCart?.products?.length > 0
  // the line an add or an update just touched: the cart does not open, it shows what changed
  const highlightProductCode = useCartLineHighlight(currentCart)
  return (
    <CartBox maxHeight={Math.max(window.innerHeight - 100, 0)} data-doc-section='business-cart-summary'>
      <Title>{t('YOUR_CART', 'Your cart')}</Title>
      {hasProducts
        ? (
          <Cart
            isStore
            isCustomMode
            isForceOpenCart
            cart={currentCart}
            freeDeliveryProgress={freeDeliveryProgress}
            isCartPending={currentCart?.status === 2}
            isProducts={currentCart.products.length}
            isCartOnProductsList={isCartOnProductsList}
            handleCartOpen={handleCartOpen}
            businessConfigs={business?.configs}
            productLoading={productLoading}
            setProductLoading={setProductLoading}
            showUpsellingInBusinessInfo
            forceHideCheckoutButton
            forceHideAddMoreProducts
            highlightProductCode={highlightProductCode}
            showDiscountInCart
          />
          )
        : (
          <EmptyCart>
            <div className='empty-content'>
              <EmptyStateArt>
                <EmptyStateIcon name='bag' />
              </EmptyStateArt>
              <p>{t('STORE_CART_EMPTY_HINT', 'Add dishes with the + button.')}</p>
            </div>
            {themeVisible(theme, 'cart.free_delivery_progress') && freeDeliveryProgress?.status === 'awareness' && (
              <FreeDeliveryProgress {...freeDeliveryProgress} variant='full' />
            )}
          </EmptyCart>
          )}
    </CartBox>
  )
}
