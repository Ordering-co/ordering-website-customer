import React, { useState } from 'react'
import { useTheme } from 'styled-components'

import {
  ProductsContainer,
  ProductsListing,
  WrapAllCategories,
  ErrorMessage,
  WrapperNotFound,
  HeaderWrapper,
  DescriptionModalContainer,
  RibbonBox,
  CategoryDescription,
  DescriptionContainer,
  SubcategorySearchContainer,
  PreviouslyOrderedContainer,
  PreviouslyOrderedWrapper,
  ViewMoreLink
} from './styles'

import { SubcategoriesComponent } from './SubcategoriesComponent'
import settings from '../../../../config'
import { singleStoreSlug } from '~/utils/siteSettings'
import { ProductsList } from '~components/components/ProductsList'
import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { SingleProductCard } from '~ui/src/components/SingleProductCard'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { VisuallyHidden } from '~ui/src/components/AddressOrderType/styles'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { shape } from '~ui/utils'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { themeVisible } from '~/utils/themeVisibility'

const BusinessProductsListUI = (props) => {
  const {
    errors,
    businessId,
    isLazy,
    category,
    categories,
    categoryState,
    isBusinessLoading,
    onProductClick,
    handleSearchRedirect,
    featured,
    useKioskApp,
    searchValue,
    isCartOnProductsList,
    // the menu_index template's index narrows the menu from the desktop cut: the columns of a menu with a cart beside it
    withIndex,
    handleClearSearch,
    hideSearchEmpty,
    errorQuantityProducts,
    currentCart,
    setSubcategoriesSelected,
    subcategoriesSelected,
    onClickCategory,
    handleUpdateProducts,
    isSearchMode,
    previouslyProducts
  } = props

  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const noSearchResults = isSearchMode && searchValue && !categoryState?.loading &&
    !isBusinessLoading && categoryState?.products?.length === 0
  const theme = useTheme()
  // the image next to each category's name (visibility
  // business.categories.image)
  const showCategoryImage = themeVisible(theme, 'business.categories.image')
  const updatedBusinessSlug = singleStoreSlug(theme, settings)
  const hideGoToBusinesses = !!updatedBusinessSlug
  const isUseParentCategory = configs?.use_parent_category?.value === 'true' || configs?.use_parent_category?.value === '1'
  const [openDescription, setOpenDescription] = useState(null)
  // the category images that failed to load: hidden, not a broken image
  const [failedCategoryImages, setFailedCategoryImages] = useState([])

  // each category's description under its name, off by default (visibility
  // business.categories.description) and its ribbon beside the name
  // (business.categories.ribbon)
  const showCategoryDescription = themeVisible(theme, 'business.categories.description')
  const showCategoryRibbon = themeVisible(theme, 'business.categories.ribbon')

  const onClickSubcategory = (subCategory, parentCategory) => {
    if (parentCategory && isLazy) {
      onClickCategory(parentCategory)
    }
    if (!subCategory) {
      setSubcategoriesSelected(subcategoriesSelected?.filter(_subcategory => _subcategory?.parent_category_id !== parentCategory?.id))
      return
    }
    const categoryFounded = subcategoriesSelected?.find(_subcategory => subCategory?.id === _subcategory?.id)
    if (categoryFounded) {
      setSubcategoriesSelected(subcategoriesSelected?.filter(_subcategory => subCategory?.id !== _subcategory?.id))
    } else {
      setSubcategoriesSelected([...subcategoriesSelected, subCategory])
    }
  }

  const productsCategorySelected = categoryState.products
    ?.filter(product =>
      !subcategoriesSelected?.find(subcategory => subcategory?.parent_category_id === category?.id) ||
      subcategoriesSelected?.some(subcategory => subcategory.id === product?.category_id))

  return (
    <>
      <ProductsContainer
        data-doc-section='business-menu-products'
        data-doc-product-count={categoryState?.products?.length ?? 0}
      >
        {category?.id && (
          <>
            <HeaderWrapper>
              {category?.subcategories?.length > 0 && !isSearchMode && (
                <SubcategoriesComponent
                  category={category}
                  subcategoriesSelected={subcategoriesSelected}
                  onClickSubcategory={onClickSubcategory}
                />
              )}
            </HeaderWrapper>
            <ProductsListing $withCart={isCartOnProductsList || withIndex}>
              {productsCategorySelected.map((product, i) => (
                <SingleProductCard
                  key={i}
                  isSoldOut={(product.inventoried && !product.quantity)}
                  product={product}
                  useKioskApp={useKioskApp}
                  businessId={businessId}
                  onProductClick={onProductClick}
                  isCartOnProductsList={isCartOnProductsList}
                  handleUpdateProducts={handleUpdateProducts}
                  productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                />
              ))}
            </ProductsListing>
            {isSearchMode && category?.subcategories?.length > 0 && category?.subcategories?.filter(subcategory => productsCategorySelected?.some(product => product?.category_id === subcategory?.id))?.map(subcategory => (
              <SubcategorySearchContainer key={subcategory?.id}>
                <h4>{subcategory?.name}</h4>
                <ProductsListing isSubcategorySearch $withCart={isCartOnProductsList || withIndex}>
                  {productsCategorySelected?.filter(product => product?.category_id === subcategory?.id)?.map((product, i) => (
                    <SingleProductCard
                      key={i}
                      isSoldOut={product.inventoried && !product.quantity}
                      businessId={businessId}
                      product={product}
                      onProductClick={onProductClick}
                      isCartOnProductsList={isCartOnProductsList}
                      handleUpdateProducts={handleUpdateProducts}
                      useKioskApp={useKioskApp}
                      productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                    />
                  ))}
                </ProductsListing>
              </SubcategorySearchContainer>
            ))}
          </>
        )}
        {
          !category?.id && previouslyProducts?.length > 0 && (
            <WrapAllCategories id='previously_block'>
              <h2>{t('ORDER_IT_AGAIN', 'Order it again')}</h2>
              <CategoryDescription>
                <p>
                  {t('ORDER_IT_AGAIN_DESC', 'Quickly add items from your past orders.')}
                </p>
              </CategoryDescription>
              <PreviouslyOrderedContainer>
                <PreviouslyOrderedWrapper>
                  <AutoScroll scrollId='previously_ordered'>
                    {previouslyProducts?.map((product, i) => (
                      <SingleProductCard
                        key={i}
                        isSoldOut={(product.inventoried && !product.quantity)}
                        product={product}
                        useKioskApp={useKioskApp}
                        businessId={businessId}
                        onProductClick={onProductClick}
                        isCartOnProductsList={isCartOnProductsList}
                        handleUpdateProducts={handleUpdateProducts}
                        productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                      />
                    ))}
                  </AutoScroll>
                </PreviouslyOrderedWrapper>
              </PreviouslyOrderedContainer>
            </WrapAllCategories>
          )
        }
        {
          !category?.id && (
            <>
              {
                featured && categoryState?.products?.find(product => product.featured) && (
                  <WrapAllCategories id='categoryfeatured'>
                    <h2>{t('FEATURED', 'Featured')}</h2>
                    <ProductsListing $withCart={isCartOnProductsList || withIndex}>
                      {categoryState.products?.map((product, i) => product.featured && (
                        <SingleProductCard
                          key={i}
                          isSoldOut={(product.inventoried && !product.quantity)}
                          product={product}
                          useKioskApp={useKioskApp}
                          businessId={businessId}
                          onProductClick={onProductClick}
                          isCartOnProductsList={isCartOnProductsList}
                          handleUpdateProducts={handleUpdateProducts}
                          productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                        />
                      ))}
                      {isLazy && !categoryState?.loading && categoryState?.products?.filter(product => product.featured)?.length > 9 && (
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
              }
            </>
          )
        }

        {
          !category?.id && categories.filter(category => category?.id !== null).map((category, i, _categories) => {
            const _products = !isUseParentCategory
              ? categoryState?.products?.filter(product => product?.category_id === category?.id) ?? []
              : categoryState?.products?.filter(product => category?.children?.some(cat => cat.category_id === product?.category_id)) ?? []
            const products = subcategoriesSelected?.length > 0
              ? _products?.filter(product =>
                !subcategoriesSelected?.find(subcategory => subcategory?.parent_category_id === category?.id) ||
                subcategoriesSelected.some(subcategory => subcategory?.id === product?.category_id || subcategory?.children?.reduce((prev, cur) => [...prev, cur?.category_id], [])?.includes(product?.category_id)))
              : _products
            const shortCategoryDescription = category?.description?.length > 200 ? `${category?.description?.substring(0, 200)}...` : category?.description
            const isSubcategorySearch = isSearchMode && category?.subcategories?.length > 0 && category?.subcategories?.some(subcategory => products?.some(product => product?.category_id === subcategory?.id))
            return (
              <React.Fragment key={i}>
                {
                  products.length > 0 && (
                    <WrapAllCategories
                      data-doc-section='business-category-products'
                      data-doc-category-id={category?.id}
                      id={`category${category?.id}`}
                    >
                      <HeaderWrapper>
                        <div className='category-title'>
                          {
                            showCategoryImage && category?.image && !failedCategoryImages.includes(category.image) && (
                              <img
                                src={category.image}
                                alt=''
                                onError={() => setFailedCategoryImages(failed => [...failed, category.image])}
                              />
                            )
                          }
                          <h2>{category.name}</h2>
                          {showCategoryRibbon && category?.ribbon?.enabled && (
                            <RibbonBox
                              bgColor={category?.ribbon?.color}
                              isRoundRect={category?.ribbon?.shape === shape?.rectangleRound}
                              isCapsule={category?.ribbon?.shape === shape?.capsuleShape}
                            >
                              {category?.ribbon?.text}
                            </RibbonBox>
                          )}
                        </div>
                        {showCategoryDescription && category?.description && (
                          <CategoryDescription>
                            <p>
                              {shortCategoryDescription}
                            </p>
                            {category?.description?.length > 200 && (
                              <ViewMoreLink onClick={() => setOpenDescription(category)}>{t('VIEW_MORE', 'View more')}</ViewMoreLink>
                            )}
                          </CategoryDescription>
                        )}
                        {category?.subcategories?.length > 0 && !isSearchMode && (
                          <SubcategoriesComponent
                            category={category}
                            subcategoriesSelected={subcategoriesSelected}
                            onClickSubcategory={onClickSubcategory}
                          />
                        )}
                      </HeaderWrapper>
                      <ProductsListing isSubcategorySearch={isSubcategorySearch}>
                        {isSearchMode && category?.subcategories?.length > 0
                          ? (
                          <>
                            {products?.sort((a, b) => (a.name || 0) - (b.name || 0)).filter((product, i) => (i < 10 && product?.category_id === category?.id) || !isLazy)?.map((product, i) => (
                              <SingleProductCard
                                key={i}
                                isSoldOut={product.inventoried && !product.quantity}
                                businessId={businessId}
                                product={product}
                                onProductClick={onProductClick}
                                useKioskApp={useKioskApp}
                                isCartOnProductsList={isCartOnProductsList}
                                handleUpdateProducts={handleUpdateProducts}
                                productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                              />
                            ))}
                            {isLazy && !categoryState?.loading && products?.length > 9 && (
                              <SingleProductCard
                                useCustomFunctionality
                                onCustomClick={() => onClickCategory(category)}
                                isCartOnProductsList={isCartOnProductsList}
                                handleUpdateProducts={handleUpdateProducts}
                                customText={t('MORE', 'More')}
                              />
                            )}
                          </>
                            )
                          : (
                          <>
                            {
                              products?.sort((a, b) => (a.name || 0) - (b.name || 0)).filter((_, i) => i < 10 || !isLazy).map((product, i) => (
                                <SingleProductCard
                                  key={i}
                                  isSoldOut={product.inventoried && !product.quantity}
                                  businessId={businessId}
                                  product={product}
                                  onProductClick={onProductClick}
                                  useKioskApp={useKioskApp}
                                  isCartOnProductsList={isCartOnProductsList}
                                  handleUpdateProducts={handleUpdateProducts}
                                  productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                                />
                              ))
                            }
                            {isLazy && !categoryState?.loading && products?.length > 9 && (
                              <SingleProductCard
                                useCustomFunctionality
                                onCustomClick={() => onClickCategory(category)}
                                isCartOnProductsList={isCartOnProductsList}
                                handleUpdateProducts={handleUpdateProducts}
                                customText={t('MORE', 'More')}
                              />
                            )}
                          </>
                            )}
                        {
                          categoryState.loading && (i + 1) === _categories.length && [...Array(categoryState.pagination.nextPageItems).keys()].map(i => (
                            <SingleProductCard
                              key={`skeleton:${i}`}
                              isSkeleton
                            />
                          ))
                        }
                      </ProductsListing>
                      {isSearchMode && category?.subcategories?.length > 0 && category?.subcategories?.filter(subcategory => products?.some(product => product?.category_id === subcategory?.id))?.map(subcategory => (
                        <SubcategorySearchContainer key={subcategory?.id}>
                          <h4>{subcategory?.name}</h4>
                          <ProductsListing isSubcategorySearch={isSubcategorySearch}>
                            {products?.filter(product => product?.category_id === subcategory?.id)?.map((product, i) => (
                              <SingleProductCard
                                key={i}
                                isSoldOut={product.inventoried && !product.quantity}
                                businessId={businessId}
                                product={product}
                                onProductClick={onProductClick}
                                isCartOnProductsList={isCartOnProductsList}
                                handleUpdateProducts={handleUpdateProducts}
                                useKioskApp={useKioskApp}
                                productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === product?.id ? Cproduct?.quantity : 0) }, 0)}
                              />
                            ))}
                          </ProductsListing>
                        </SubcategorySearchContainer>
                      ))}
                    </WrapAllCategories>
                  )
                }
              </React.Fragment>
            )
          })
        }

        {
          (categoryState.loading || isBusinessLoading) && (
            <ProductsListing $withCart={isCartOnProductsList || withIndex}>
              {[...Array(useKioskApp ? 24 : categoryState.pagination.nextPageItems).keys()].map(i => (
                <SingleProductCard
                  key={`skeleton:${i}`}
                  isSkeleton
                />
              ))}
            </ProductsListing>
          )
        }

        {
          (!searchValue || !hideSearchEmpty) && !categoryState?.loading && !isBusinessLoading && categoryState?.products?.length === 0 && !((!searchValue && !errorQuantityProducts)) && (
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

        {isSearchMode && (
          <VisuallyHidden role='status'>
            {noSearchResults && t('NO_PRODUCTS_MATCH_FILTERS', 'No products match your filters')}
          </VisuallyHidden>
        )}
        {errors && errors.length > 0 && (
          (typeof errors === 'string' ? [errors] : errors).map((e, i) => (
            <ErrorMessage key={i}>ERROR: [{e}]</ErrorMessage>
          ))
        )}
        {openDescription && (
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
        )}
      </ProductsContainer>
    </>
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
