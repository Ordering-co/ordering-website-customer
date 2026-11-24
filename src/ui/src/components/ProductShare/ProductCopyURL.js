import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import {
  ProductCopyURLContainer,
  ProductImageWrapper,
  CopyAction
} from './styles'

import { useUtils } from '~components/contexts/UtilsContext'
import { themeImage } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'

import { Icon } from '~ui/src/design-system/components/Icon'

export const ProductCopyURL = (props) => {
  const {
    urlToShare,
    product,
    onClose
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ optimizeImage }] = useUtils()
  const [copyStatus, setCopyStatus] = useState('idle')
  const activeCopy = useRef(null)

  useEffect(() => () => {
    clearTimeout(activeCopy.current?.closeTimer)
    activeCopy.current = null
  }, [])

  const handleCopyToClipboard = async () => {
    if (activeCopy.current) return
    const operation = {}
    activeCopy.current = operation
    setCopyStatus('pending')
    try {
      await navigator.clipboard.writeText(urlToShare)
    } catch {
      if (activeCopy.current !== operation) return
      activeCopy.current = null
      setCopyStatus('error')
      return
    }
    if (activeCopy.current !== operation) return
    setCopyStatus('copied')
    operation.closeTimer = setTimeout(() => onClose?.(), 1000)
  }

  const copiedToClipboard = copyStatus === 'copied'

  // a product without a photo shows the theme's placeholder, unless the
  // theme hides it (visibility product.dummy_image)
  const productImage = product?.images || (!themeHidden(theme, 'product.dummy_image') ? themeImage(theme, 'placeholder.product') : null)

  return (
    <ProductCopyURLContainer>
      {productImage && (
        <ProductImageWrapper>
          <img
            src={optimizeImage(productImage, 'h_200,c_limit')}
            loading='lazy'
            alt={t('PRODUCT_IMAGE', 'Product image')}
          />
        </ProductImageWrapper>
      )}
      <p className='name'>{product?.name}</p>
      {product?.description && (
        <p className='description'>{product?.description}</p>
      )}
      <CopyAction>
        <Button
          appearance={copiedToClipboard ? 'solid' : 'outline'}
          color='primary'
          fullWidth
          loading={copyStatus === 'pending'}
          aria-label={t('COPY_URL', 'Copy URL')}
          onClick={handleCopyToClipboard}
        >
          {copiedToClipboard ? <Icon name='check' /> : t('COPY_URL', 'Copy URL')}
        </Button>
        <div role='status'>{copiedToClipboard && t('COPY_URL_SUCCESS', 'Link copied')}</div>
        {copyStatus === 'error' && <p role='alert'>{t('COPY_URL_ERROR', 'Could not copy the link. Try again.')}</p>}
      </CopyAction>
    </ProductCopyURLContainer>
  )
}
