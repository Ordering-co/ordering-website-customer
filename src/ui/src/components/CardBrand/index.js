import React from 'react'
import { Icon } from '~ui/src/design-system/components/Icon'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { BrandImage, BrandIcon } from './styles'

/**
 * The mark of a saved card's brand (`card.brand`: visa, mastercard…): the
 * bundle's image of the brand with contain; a brand without an
 * image is the `creditCard` icon in the text color, not a picture.
 */
export const CardBrand = ({ brand, alt }) => {
  const value = (brand || '').toLowerCase()
  const image = value ? BUNDLED_IMAGES.general[value] : undefined

  if (image) {
    return <BrandImage src={image} alt={alt} width={24} height={20} />
  }
  return (
    <BrandIcon {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}>
      <Icon name='creditCard' />
    </BrandIcon>
  )
}
