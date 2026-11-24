import React, { useState } from 'react'

import {
  ProductsList,
  ProductsListContainer
} from './styles'

import { AutoScroll } from '~ui/src/components/AutoScroll'
import { SingleProductCard } from '~ui/src/components/SingleProductCard'
import { ProductForm } from '~ui/src/components/ProductForm'
import { ProductModal } from '~ui/src/components/ProductForm/ProductModal'

export const PreviousProductsOrdered = (props) => {
  const {
    products,
    handleUpdateProducts,
    onBusinessClick,
    horizontal
  } = props
  const [curProduct, setCurProduct] = useState(null)

  const closeModalProductForm = () => {
    setCurProduct(null)
  }

  const handleRedirectToCart = () => {
    onBusinessClick(curProduct?.business)
    setCurProduct(null)
  }

  const onProductClick = (product) => {
    setCurProduct(product)
  }

  const AutoScrollContainer = (props) => (!horizontal ? <div className='vertical'>{props.children}</div> : <AutoScroll>{props.children}</AutoScroll>)

  return (
    <ProductsListContainer horizontal={horizontal} isLoading={products?.length < 1}>
      <ProductsList horizontal={horizontal}>
        <AutoScrollContainer>
          {products?.filter(product => product?.business?.available)?.map(product => (
            <SingleProductCard
              key={product?.id}
              isSoldOut={(product.inventoried && !product.quantity)}
              product={product}
              businessId={product?.business?.id}
              handleUpdateProducts={handleUpdateProducts}
              onProductClick={(product) => onProductClick(product)}
              isProductId
              fromOrders
            />
          ))}
        </AutoScrollContainer>
      </ProductsList>
      {!!curProduct && (
        <ProductModal
          width={props?.useKioskApp ? '80%' : 'min(100%, 95ch)'}
          open={!!curProduct}
          onClose={() => closeModalProductForm()}
          hideCloseDefault
        >
          {(!!curProduct) && (
            <ProductForm
              businessSlug={curProduct?.business?.slug}
              useKioskApp={props?.useKioskApp}
              businessId={curProduct?.businessId}
              categoryId={curProduct?.category_id}
              productId={curProduct?.product_id}
              onSave={handleRedirectToCart}
              closeModalProductForm={closeModalProductForm}
            />
          )}
        </ProductModal>
      )}
    </ProductsListContainer>
  )
}
