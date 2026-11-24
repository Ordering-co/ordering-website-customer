import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { ShareRoot, ShareKit } from './styles'

import { ProductShare as ProductShareController } from '~components/components/ProductShare'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Dialog, DialogContent } from '~ui/src/design-system/components/Dialog'
import { Icon } from '~ui/src/design-system/components/Icon'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { ProductCopyURL } from './ProductCopyURL'

export const ProductShareUI = (props) => {
  const {
    updateShowValue,
    showShareButton,
    urlToShare,
    inGallery,
    product
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const rootElement = useRef()
  const shareButton = useRef(null)
  const [openCopyUrlModal, setOpenCopyUrlModal] = useState(false)

  // the box of the icon buttons, to give AddToAny's buttons the same one
  const { '--ui-button-height': size, '--ui-button-radius': radius, '--ui-button-icon-size': icon } = componentVars(theme, 'button', { size: 'md', shape: 'icon' })

  // a click outside the button and its menu closes it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!rootElement.current?.contains(e.target)) updateShowValue && updateShowValue(false)
    }
    window.addEventListener('mouseup', handleClickOutside)
    return () => window.removeEventListener('mouseup', handleClickOutside)
  }, [])

  const shareOn = (network) => t('SHARE_ON_NETWORK', 'Share on _NETWORK_').replace('_NETWORK_', network)

  return (
    <>
      <ShareRoot ref={rootElement} $inGallery={inGallery}>
        <Button
          ref={shareButton}
          shape='icon'
          color='neutral'
          appearance='solid'
          aria-label={t('SHARE', 'Share')}
          aria-expanded={!!showShareButton}
          onClick={() => updateShowValue(!showShareButton)}
        >
          <Icon name='share' />
        </Button>
        <ShareKit
          className='a2a_kit a2a_kit_size_32 a2a_vertical_style'
          data-a2a-url={urlToShare}
          $open={!!showShareButton}
          $inGallery={inGallery}
          $size={size}
          $radius={radius}
          $icon={icon}
        >
          <Button
            shape='icon'
            focusInset={inGallery}
            aria-label={t('COPY_URL', 'Copy URL')}
            onClick={() => {
              updateShowValue(false)
              setOpenCopyUrlModal(true)
            }}
          >
            <Icon name='link' />
          </Button>
          <a className='a2a_button_facebook' aria-label={shareOn('Facebook')} />
          <a className='a2a_button_whatsapp' aria-label={shareOn('WhatsApp')} />
          <a className='a2a_button_twitter' aria-label={shareOn('Twitter')} />
          <a className='a2a_button_email' aria-label={t('SHARE_BY_EMAIL', 'Share by email')} />
          <a className='a2a_dd' href='https://www.addtoany.com/share' aria-label={t('MORE_SHARE_OPTIONS', 'More sharing options')} />
        </ShareKit>
      </ShareRoot>
      {/* a Dialog of the product's own: over it, with Escape and the press outside for this one alone */}
      <Dialog open={openCopyUrlModal} onOpenChange={(next) => !next && setOpenCopyUrlModal(false)}>
        <DialogContent size='md' aria-label={t('COPY_URL', 'Copy URL')} finalFocus={shareButton}>
          <ProductCopyURL
            urlToShare={urlToShare}
            product={product}
            onClose={() => setOpenCopyUrlModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ProductShare = (props) => {
  const productShareProps = {
    ...props,
    UIComponent: ProductShareUI
  }
  return (
    <ProductShareController {...productShareProps} />
  )
}
