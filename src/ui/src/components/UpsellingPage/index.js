import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  Container,
  UpsellingContainer,
  Item,
  Image,
  Details,
  CloseUpselling,
  CloseAction,
  SkeletonContainer,
  HorizontalUpsellingContainer,
  HorizontalItem,
  HorizontalImage,
  HorizontalDetails,
  WrapAutoScroll,
  UpsellingPageTitleWrapper
} from './styles'

import { UpsellingPage as UpsellingPageController } from '~components/components/UpsellingPage'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { ProductForm } from '~ui/src/components/ProductForm'
import { ProductModal } from '~ui/src/components/ProductForm/ProductModal'

import { themeHidden } from '~/utils/themeVisibility'
import { themeImage } from '~/utils/themeTokens'

const UpsellingPageUI = (props) => {
  const {
    upsellingProducts,
    handleUpsellingPage,
    openUpselling,
    canOpenUpselling,
    setCanOpenUpselling,
    business,
    isCustomMode,
    fromCartPopover
  } = props

  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const theme = useTheme()

  const [actualProduct, setActualProduct] = useState(null)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [showUpselling, setShowUpSelling] = useState(true)

  // the placeholder image of a product without one: visibility
  // product.dummy_image decides
  const productDummy = !themeHidden(theme, 'product.dummy_image') && themeImage(theme, 'placeholder.product')

  useEffect(() => {
    if (!isCustomMode) {
      if (upsellingProducts?.products?.length && !upsellingProducts.loading) {
        setCanOpenUpselling && setCanOpenUpselling(true)
      } else if (!upsellingProducts?.products?.length && !upsellingProducts.loading && !canOpenUpselling && openUpselling) {
        handleUpsellingPage()
      }
    }
  }, [upsellingProducts.loading, upsellingProducts?.products.length])

  useEffect(() => {
    if (upsellingProducts?.products.length > 0) setShowUpSelling(true)
    else setShowUpSelling(false)
  }, [upsellingProducts?.products.length])

  const handleFormProduct = (product) => {
    setActualProduct(product)
    setModalIsOpen(true)
  }

  const handleSaveProduct = () => {
    setActualProduct(null)
    setModalIsOpen(false)
  }

  const UpsellingLayout = () => {
    return (
      <Container>
        <UpsellingContainer>
          {
            !upsellingProducts.loading
              ? (
              <>
                {
                  (!upsellingProducts.error && upsellingProducts.products?.length > 0)
                    ? upsellingProducts.products.map((product, i) => (
                    <Item key={product.id} name={product.name}>
                      <Image>
                        <img src={product.images} alt={product.name || ''} loading='lazy' />
                      </Image>
                      <Details>
                        <div>
                          <div className='name' title={product.name}>{product.name}</div>
                        </div>
                        <p>{parsePrice(product.price)}</p>
                        <Button color='primary' appearance='solid' size='md' onClick={() => handleFormProduct(product)}>{t('ADD', 'Add')}</Button>
                      </Details>
                    </Item>
                    ))
                    : (
                    <div>
                      {upsellingProducts.message || t('NO_UPSELLING_PRODUCTS', 'There are no upselling products')}
                    </div>
                      )
                }
              </>
                )
              : [...Array(8)].map((item, i) => (
              <SkeletonContainer key={i}>
                <Skeleton width={150} height={250} />
              </SkeletonContainer>
                ))
          }
        </UpsellingContainer>
      </Container>
    )
  }

  return (
    <>
      {isCustomMode
        ? (
            showUpselling
              ? (
          <>
            <UpsellingPageTitleWrapper fromCartPopover={fromCartPopover}>
              {!fromCartPopover && <p>{t('UPSELLING_QUESTION', 'Do you want something else?')}</p>}
              {fromCartPopover
                ? (
                  <>
                    <p>{t('COMPLEMENT_YOUR_ORDER', 'Complement your order')}</p>
                    <span>
                      {t('COMPLEMENT_YOUR_ORDER_DESCRIPTION', 'Users often include these products in their orders.')}
                    </span>
                  </>
                  )
                : (
                    <Button color='neutral' appearance='ghost' size='sm' shape='icon' aria-label={t('CLOSE', 'Close')} onClick={() => setShowUpSelling(false)}>
                      <Icon name="closeMd" />
                    </Button>
                  )}
            </UpsellingPageTitleWrapper>
            <WrapAutoScroll>
              <HorizontalUpsellingContainer>
                {
                  !upsellingProducts.loading
                    ? (
                    <AutoScroll scrollId='upSelling' isColumnMode={upsellingProducts.products.length === 1}>
                      {
                        (!upsellingProducts.error && upsellingProducts.products.length > 0)
                          ? upsellingProducts.products.map((product, i) => (
                          <HorizontalItem key={product.id} name={product.name} fromCartPopover={fromCartPopover}>
                            <HorizontalDetails fromCartPopover={fromCartPopover}>
                              <div>
                                <div className='name' title={product.name}>{product.name}</div>
                              </div>
                              <div className='price-container'>
                                <span>{parsePrice(product.price)}</span>
                                {fromCartPopover && (
                                  <Button color='primary' appearance='ghost' size='sm' shape='icon' aria-label={t('ADD', 'Add')} onClick={() => handleFormProduct(product)}>
                                    <Icon name="plusSquareFill" />
                                  </Button>
                                )}
                              </div>
                              {!fromCartPopover && <Button color='primary' appearance='tonal' size='md' onClick={() => handleFormProduct(product)}>{t('ADD', 'Add')}</Button>}
                            </HorizontalDetails>
                            {(product?.images || productDummy) && (
                              <HorizontalImage fromCartPopover={fromCartPopover}>
                                <img src={product.images || productDummy} alt={product.name || ''} loading='lazy' />
                              </HorizontalImage>
                            )}
                          </HorizontalItem>
                          ))
                          : (
                          <div>
                            {upsellingProducts.message || t('NO_UPSELLING_PRODUCTS', 'There are no upselling products')}
                          </div>
                            )
                      }
                    </AutoScroll>
                      )
                    : [...Array(8)].map((item, i) => (
                    <SkeletonContainer key={i}>
                      <Skeleton width={250} height={100} />
                    </SkeletonContainer>
                      ))
                }
              </HorizontalUpsellingContainer>
            </WrapAutoScroll>
          </>
                )
              : null
          )
        : (
        <>
          {!(!canOpenUpselling || upsellingProducts?.products?.length === 0)
            ? openUpselling
              ? (
              <DialogOverlay
                legacyMaxWidth
                title={t('UPSELLING_QUESTION', 'Do you want something else?')}
                open={openUpselling}
                onClose={() => handleUpsellingPage()}
                width='70%'
              >
                <UpsellingLayout />
                <CloseUpselling>
                  <CloseAction>
                    <Button
                      color='secondary'
                      appearance='outline'
                      size='md'
                      fullWidth
                      onClick={() => handleUpsellingPage(false)}
                    >
                      {t('NO_THANKS', 'No, Thanks')}
                    </Button>
                  </CloseAction>
                </CloseUpselling>
              </DialogOverlay>
                )
              : null
            : null}
        </>
          )}
      {modalIsOpen && (
        <ProductModal
          open={modalIsOpen}
          onClose={() => setModalIsOpen(false)}
        >
          {actualProduct && (
            <ProductForm
              useKioskApp={props.useKioskApp}
              product={actualProduct}
              businessId={business?.id}
              businessSlug={business.slug}
              onSave={() => handleSaveProduct()}
            />
          )}
        </ProductModal>
      )}
    </>
  )
}

export const UpsellingPage = (props) => {
  const UpsellingPageProps = {
    ...props,
    useSuggestiveUpselling: true,
    UIComponent: UpsellingPageUI
  }

  return <UpsellingPageController {...UpsellingPageProps} />
}
