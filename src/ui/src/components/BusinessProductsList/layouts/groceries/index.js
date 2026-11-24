import React, { useState } from 'react'

import {
  ProductsContainer,
  ProductsListing,
  WrapAllCategories,
  ErrorMessage,
  WrapperNotFound,
  HeaderWrapper,
  DescriptionModalContainer,
  RibbonBox,
  CategoryDescripion,
  DescriptionContainer,
  HeaderTitle,
  ViewMoreLink
} from './styles'

import { ProductsList } from '~components/components/ProductsList'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useTheme } from 'styled-components'
import settings from '../../../../../../config'
import { singleStoreSlug } from '~/utils/siteSettings'
import { themeVisible } from '~/utils/themeVisibility'

import { SingleProductCard } from '~ui/src/components/SingleProductCard'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { shape } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'

const BusinessProductsListUI = (props) => {
  const {
    errors,
    businessId,
    business,
    category,
    categories,
    categoryState,
    isBusinessLoading,
    onProductClick,
    handleSearchRedirect,
    searchValue,
    isCartOnProductsList,
    handleClearSearch,
    hideSearchEmpty,
    errorQuantityProducts,
    categoriesState,
    onClickCategory,
    currentCart,
    handleUpdateProducts,
    isCustomerMode
  } = props

  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  const updatedBusinessSlug = singleStoreSlug(theme, settings)
  const hideGoToBusinesses = !!updatedBusinessSlug
  // a category's image, ribbon and description beside / under its name, as
  // in the other layout (visibility business.categories.image, .ribbon and
  // .description, this one off by default)
  const showCategoryImage = themeVisible(theme, 'business.categories.image')
  const showCategoryRibbon = themeVisible(theme, 'business.categories.ribbon')
  const showCategoryDescription = themeVisible(theme, 'business.categories.description')
  const isUseParentCategory = configs?.use_parent_category?.value === 'true' || configs?.use_parent_category?.value === '1'
  const [openDescription, setOpenDescription] = useState(null)
  const shortCategoryDescriptionSelected = category?.description?.length > 200 ? `${category?.description?.substring(0, 200)}...` : category?.description

  return (
    <ProductsContainer>
      {category?.id && (
        <WrapAllCategories id='container' isCategorySelected>
          <HeaderWrapper>
            <div className='category-title'>
              {
                showCategoryImage && category?.image && (
                  <img src={category.image} alt='' />
                )
              }
              <h2>{category.name}</h2>
              {showCategoryRibbon && category?.ribbon?.enabled && (
                <RibbonBox
                  bgColor={category?.ribbon?.color}
                  isRoundRect={category?.ribbon?.shape === shape?.rectangleRound}
                  isCapsule={category?.ribbon?.shape === shape?.capsuleShape}
                  title={category?.ribbon?.text}
                >
                  {category?.ribbon?.text}
                </RibbonBox>
              )}
            </div>
            {showCategoryDescription && category?.description && (
              <CategoryDescripion>
                <p>
                  {shortCategoryDescriptionSelected}
                  {category?.description?.length > 200 && (
                    <ViewMoreLink onClick={() => setOpenDescription(category)}>{t('VIEW_MORE', 'View more')}</ViewMoreLink>
                  )}
                </p>
              </CategoryDescripion>
            )}
          </HeaderWrapper>
          <ProductsListing $withCart={isCartOnProductsList}>
            {
              categoryState?.products?.map((product, i) => (
                <SingleProductCard
                  key={i}
                  isSoldOut={(product?.inventoried && !product?.quantity)}
                  product={product}
                  businessId={businessId}
                  onProductClick={onProductClick}
                  isCartOnProductsList={isCartOnProductsList}
                  handleUpdateProducts={handleUpdateProducts}
                  productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                  isCustomerMode={isCustomerMode}
                />
              ))
            }
          </ProductsListing>
        </WrapAllCategories>
      )}

      {
        !category?.id && categories.filter(category => category?.id === 'featured').map((category, i) => {
          const featProducts = business?.lazy_load_products_recommended
            ? categoriesState?.featured?.products?.some(product => product.featured) ? categoriesState?.featured?.products : []
            : categoryState?.products?.filter(product => product.featured) ?? []
          return featProducts?.length > 0
            ? (
            <WrapAllCategories key={i}>
              <div className='wrap-header'>
                <div className='category-title'>
                  <h2>{t('FEATURED', 'Featured')}</h2>
                </div>
                {featProducts?.length > 9 && (
                  <Button
                    color='primary'
                    appearance='tonal'
                    onClick={() => onClickCategory(category)}
                  >
                    {t('MORE', 'More')}
                  </Button>
                )}
              </div>
              <ProductsListing $withCart={isCartOnProductsList}>
                {featProducts?.filter((p, index) => index < 10)?.map((product, i) => product.featured && (
                  <SingleProductCard
                    key={i}
                    isSoldOut={(product?.inventoried && !product?.quantity)}
                    product={product}
                    businessId={businessId}
                    onProductClick={onProductClick}
                    handleUpdateProducts={handleUpdateProducts}
                    isCartOnProductsList={isCartOnProductsList}
                    productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                    isCustomerMode={isCustomerMode}
                  />
                ))}
                {!categoryState?.loading && featProducts?.length > 9 && (
                  <SingleProductCard
                    useCustomFunctionality
                    onCustomClick={() => onClickCategory(category)}
                    isCartOnProductsList={isCartOnProductsList}
                    handleUpdateProducts={handleUpdateProducts}
                    customText={t('MORE', 'More')}
                  />
                )}
              </ProductsListing>
            </WrapAllCategories>
              )
            : null
        })
      }

      {
        !category?.id && categories.filter(category => category?.id !== null).map((category, i, _categories) => {
          const products = !isUseParentCategory
            ? categoryState?.products?.filter(product => product?.category_id === category?.id) ?? []
            : categoryState?.products?.filter(product => category?.children?.some(cat => cat.category_id === product?.category_id)) ?? []

          const shortCategoryDescription = category?.description?.length > 200 ? `${category?.description?.substring(0, 200)}...` : category?.description

          return (
            <React.Fragment key={i}>
              {
                products.length > 0 && (
                  <WrapAllCategories id='container'>
                    <div className='wrap-header'>
                      <HeaderWrapper>
                        <div className='category-title'>
                          <HeaderTitle>
                            {
                              showCategoryImage && category?.image && (
                                <img src={category.image} alt='' />
                              )
                            }
                            <h2>{category.name}</h2>
                            {showCategoryRibbon && category?.ribbon?.enabled && (
                              <RibbonBox
                                bgColor={category?.ribbon?.color}
                                isRoundRect={category?.ribbon?.shape === shape?.rectangleRound}
                                isCapsule={category?.ribbon?.shape === shape?.capsuleShape}
                                title={category?.ribbon?.text}
                              >
                                {category?.ribbon?.text}
                              </RibbonBox>
                            )}
                          </HeaderTitle>
                          {products?.length > 9 && (
                            <Button
                              color='primary'
                              appearance='tonal'
                              onClick={() => onClickCategory(category)}
                            >
                              {t('MORE', 'More')}
                            </Button>
                          )}
                        </div>
                        {showCategoryDescription && category?.description && (
                          <CategoryDescripion>
                            <p>
                              {shortCategoryDescription}
                              {category?.description?.length > 200 && (
                                <ViewMoreLink onClick={() => setOpenDescription(category)}>{t('VIEW_MORE', 'View more')}</ViewMoreLink>
                              )}
                            </p>
                          </CategoryDescripion>
                        )}
                      </HeaderWrapper>

                    </div>
                    <ProductsListing $withCart={isCartOnProductsList}>
                      {
                        products.filter((p, index) => index < 10).map((product, i) => (
                          <SingleProductCard
                            key={i}
                            isSoldOut={product?.inventoried && !product?.quantity}
                            businessId={businessId}
                            product={product}
                            onProductClick={onProductClick}
                            handleUpdateProducts={handleUpdateProducts}
                            isCartOnProductsList={isCartOnProductsList}
                            productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                            isCustomerMode={isCustomerMode}
                          />
                        ))
                      }
                      {!categoryState?.loading && products?.length > 9 && (
                        <SingleProductCard
                          useCustomFunctionality
                          onCustomClick={() => onClickCategory(category)}
                          isCartOnProductsList={isCartOnProductsList}
                          handleUpdateProducts={handleUpdateProducts}
                          customText={t('MORE', 'More')}
                        />
                      )}
                      {
                        categoryState?.loading && (i + 1) === _categories.length && [...Array(categoryState?.pagination?.nextPageItems).keys()].map(i => (
                          <SingleProductCard
                            key={`skeleton:${i}`}
                            isSkeleton
                          />
                        ))
                      }
                    </ProductsListing>
                  </WrapAllCategories>
                )
              }
            </React.Fragment>
          )
        })
      }

      {
        (categoryState?.loading || isBusinessLoading) && (
          <ProductsListing $withCart={isCartOnProductsList}>
            {[...Array(categoryState?.pagination.nextPageItems).keys()].map(i => (
              <SingleProductCard
                key={`skeleton:${i}`}
                isSkeleton
              />
            ))}
          </ProductsListing>
        )
      }

      {
        (!searchValue || !hideSearchEmpty) && !categoryState?.loading && !isBusinessLoading && categoryState?.products?.length === 0 && !((searchValue && errorQuantityProducts) || (!searchValue && !errorQuantityProducts)) && (
          <WrapperNotFound>
            <NotFoundSource
              variant='empty'
              icon='shop'
              content={!searchValue ? t('NO_PRODUCTS_AVAILABLE', 'No products available right now') : t('NO_PRODUCTS_MATCH_FILTERS', 'No products match your filters')}
              subtitle={!searchValue ? t('NO_PRODUCTS_AVAILABLE_DESC', 'This business may update its menu later.') : t('TRY_CLEARING_FILTERS', 'Try clearing your filters or search.')}
              btnTitle={!searchValue ? (hideGoToBusinesses ? null : t('SEARCH_REDIRECT', 'Go to Businesses')) : t('CLEAR_FILTERS', 'Clear filters')}
              onClickButton={!searchValue ? (hideGoToBusinesses ? null : () => handleSearchRedirect()) : () => handleClearSearch('')}
            />
          </WrapperNotFound>
        )
      }

      {errors && errors.length > 0 && (
        (typeof errors === 'string' ? [errors] : errors).map((e, i) => (
          <ErrorMessage key={i}>ERROR: [{e}]</ErrorMessage>
        ))
      )}
      <DialogOverlay
        open={!!openDescription}
        title={openDescription?.name}
        onClose={() => setOpenDescription(null)}
      >
        <DescriptionModalContainer>
          {
            openDescription?.image && (
              <img src={openDescription.image} alt='' />
            )
          }
          <DescriptionContainer>
            <div>
              <p>{openDescription?.description}</p>
            </div>
          </DescriptionContainer>
        </DescriptionModalContainer>
      </DialogOverlay>
    </ProductsContainer>
  )
}

export const BusinessProductsList = (props) => {
  const businessProductsListProps = {
    ...props,
    UIComponent: BusinessProductsListUI
  }

  return (
    <ProductsList {...businessProductsListProps} />
  )
}
