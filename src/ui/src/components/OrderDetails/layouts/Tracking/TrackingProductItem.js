import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { ProductItemAccordion as ProductItemAccordionController } from '~components/components/ProductItemAccordion'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { themeImage } from '~/utils/themeTokens'
import {
  ProductSection,
  ProductAccordion,
  ProductInfo,
  ProductImageWrapper,
  ProductImage,
  ProductQuantity,
  ProductContentInfo,
  ProductPrice,
  ProductAccordionContent,
  ProductOptionsList
} from './styles'

const TrackingProductItemUI = (props) => {
  const { product, toppingsRemoved, productInfo, hidePrice } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [isOpen, setIsOpen] = useState(false)
  const [height, setHeight] = useState('0px')
  const content = useRef(null)

  const showProductImage = themeVisible(theme, 'confirmation.products.image')
  // a product without a photo shows the theme's placeholder, unless the theme
  // hides it (visibility product.dummy_image)
  const hideProductDummy = themeHidden(theme, 'product.dummy_image')
  const productImage = product?.images || (!hideProductDummy ? themeImage(theme, 'placeholder.product') : null)
  const unselectedIngredients = (productInfo?.ingredients || []).filter(ingredient => !ingredient.selected)
  const options = productInfo?.options || []
  const removedToppings = toppingsRemoved?.removed || []
  const hasAccordionContent = unselectedIngredients.length > 0 || options.length > 0 || removedToppings.length > 0
  const hasDiscount = product?.total != null && product?.price != null && product.total < product.price

  const toggleAccordion = () => setIsOpen(open => !open)

  useEffect(() => {
    setHeight(isOpen && content.current ? `${content.current.scrollHeight}px` : '0px')
  }, [isOpen, product])

  const getFormattedSubOptionName = ({ quantity, name, position, price }) => {
    const pos = position ? `(${position})` : ''
    return `${quantity} x ${name} ${pos} +${price}`
  }

  return (
    <ProductSection data-doc-section='order-tracking-product'>
      {/* the header: a button that opens the product's details when it has
          them, else a plain row (its content is phrasing, as a button's) */}
      <ProductAccordion
        className={`product accordion ${isOpen ? 'active' : ''}`}
        clickable={hasAccordionContent}
        {...(hasAccordionContent
          ? { as: 'button', type: 'button', 'aria-expanded': isOpen, onClick: toggleAccordion }
          : {})}
      >
        <ProductInfo className='info'>
          <ProductQuantity>{product?.quantity}</ProductQuantity>
          {productImage && showProductImage && (
            <ProductImageWrapper>
              <ProductImage style={{ backgroundImage: `url("${productImage}")` }} />
            </ProductImageWrapper>
          )}
          <ProductContentInfo>
            <span className='product-name'>{product?.name}</span>
            {product?.comment && <span className='comment'>{product.comment}</span>}
          </ProductContentInfo>
          {!hidePrice && (
            <ProductPrice>
              {hasDiscount && <s>{parsePrice(product.price)}</s>}
              {parsePrice(product?.total ?? product?.price)}
            </ProductPrice>
          )}
        </ProductInfo>
        {hasAccordionContent && (
          <ChevronIcon kind='disclose' open={isOpen} className='accordion__icon' />
        )}
      </ProductAccordion>

      <ProductAccordionContent ref={content} style={{ maxHeight: height }}>
        {unselectedIngredients.length > 0 && (
          <ProductOptionsList>
            <p>{t('INGREDIENTS', 'Ingredients')}</p>
            {unselectedIngredients.map(ingredient => (
              <li className='ingredient' key={ingredient.id}>
                <span>{t('WITHOUT_INGREDIENT', 'No _ingredient_').replace('_ingredient_', ingredient.name)}</span>
              </li>
            ))}
          </ProductOptionsList>
        )}
        {options.length > 0 && (
          <ProductOptionsList>
            {options.map(option => (
              <li key={option.id}>
                <p>{option.name}</p>
                <ProductOptionsList className='suboption'>
                  {Object.values(option.suboptions ?? {}).sort((a, b) => a.rank - b.rank).map(suboption => (
                    <li key={suboption.id}>
                      <span>
                        {getFormattedSubOptionName({
                          quantity: suboption.quantity,
                          name: suboption.name,
                          position: (suboption?.position && suboption.position !== 'whole') ? t(suboption.position.toUpperCase(), suboption.position) : '',
                          price: (['left', 'right'].includes(suboption?.position)) ? parsePrice(suboption.half_price ?? suboption.price) : parsePrice(suboption.price)
                        })}
                      </span>
                    </li>
                  ))}
                </ProductOptionsList>
              </li>
            ))}
          </ProductOptionsList>
        )}
        {removedToppings.length > 0 && (
          <ProductOptionsList>
            <li>
              <p>{t('TOPPINGS_REMOVED', 'Toppings removed')}</p>
              <ProductOptionsList className='suboption'>
                {removedToppings.map(topping => (
                  <li key={topping.code}>
                    <span>{topping.name}</span>
                  </li>
                ))}
              </ProductOptionsList>
            </li>
          </ProductOptionsList>
        )}
      </ProductAccordionContent>
    </ProductSection>
  )
}

export const TrackingProductItem = (props) => {
  return <ProductItemAccordionController {...props} UIComponent={TrackingProductItemUI} />
}
