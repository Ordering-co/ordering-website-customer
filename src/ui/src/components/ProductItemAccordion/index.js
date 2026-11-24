import React, { useState, useRef, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import {
  AccordionSection,
  Accordion,
  AccordionContent,
  WrapperProductImage,
  ProductImage,
  ContentInfo,
  ProductComment,
  ProductInfo,
  ProductError,
  ProductActions,
  ProductActionsDeleteWrapper,
  ProductPriceSection,
  ProductPrice,
  ProductNotAvailable,
  ProductQuantity,
  ScheduleInfoWrapper,
  ScheduleInfo,
  ProductOptionsListUl,
  ProductOptionsListDiv,
  IconContainer,
  ProductEditLink,
  LineSpinner
} from './styles'

import { ProductItemAccordion as ProductItemAccordionController } from '~components/components/ProductItemAccordion'
import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'

import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useImageFallback } from '~ui/hooks/useImageFallback'
import { useDelayedFlag } from '~ui/hooks/useDelayedFlag'
import { Stepper } from '~ui/src/design-system/components/Stepper'
import { Spinner } from '~ui/src/styles/Spinner'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { themeImage } from '~/utils/themeTokens'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { scrollBehavior } from '~/utils/themeMotion'

// The product's name: a div, or the button that opens / closes its options
// (`as`), kept out of the render so it is not mounted again on each one
const ItemName = ({ as: Tag = 'div', ...rest }) => <Tag {...rest} />

const ProductItemAccordionUI = (props) => {
  const {
    isDisabledEdit,
    isCartPending,
    isCartProduct,
    product,
    changeQuantity,
    getProductMax,
    offsetDisabled,
    onDeleteProduct,
    onEditProduct,
    isCheckout,
    isOrderDetails,
    isStore,
    highlighted,
    isConfirmationPage,
    toppingsRemoved,
    productInfo,
    isUpdating,
    hideQuantitySelector = true
  } = props
  const theme = useTheme()
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [{ parsePrice, parseDate, timeFormat }] = useUtils()
  const windowSize = useWindowSize()
  const [setActive, setActiveState] = useState(isCheckout || isOrderDetails ? 'active' : '')
  const [setHeight, setHeightState] = useState(isCheckout || isOrderDetails ? 'auto' : '0px')

  const content = useRef(null)
  const rowRef = useRef(null)
  const productActionsEdit = useRef(null)
  const productImageEdit = useRef(null)
  const productActionsDelete = useRef(null)
  const quantityStepper = useRef(null)
  // the names of the delete and edit buttons (an icon alone)
  const deleteLabel = t('REMOVE', 'Remove')
  const editLabel = t('EDIT', 'Edit')

  // the line's image: the checkout's summary has its key
  // (checkout.products.image, off by default), an order's products theirs
  // (confirmation.products.image) and the cart its own in every other place
  const isSummary = isCheckout || isOrderDetails
  const imageKey = isCheckout
    ? 'checkout.products.image'
    : (isOrderDetails || isConfirmationPage) ? 'confirmation.products.image' : 'cart.products.image'
  const showProductImage = themeVisible(theme, imageKey)
  const hideProductDummyLogo = themeHidden(theme, 'product.dummy_image')
  // the product's photo, the theme's placeholder when it has none or it
  // fails to load (unless the theme hides the placeholder)
  const productImage = useImageFallback(product?.images, hideProductDummyLogo ? null : themeImage(theme, 'placeholder.product'))

  // A product of the cart that is changing (its quantity, its removal, its edit; implementation notes): the row says
  // so to assistive technology at once, and softens and shows a ring beside its price once the delay passes
  const showUpdating = useDelayedFlag(!!isUpdating)
  const updatingRing = (before) => showUpdating && (
    <LineSpinner data-line-spinner $before={before}>
      <Spinner $size='sm' data-doc-control='cart-line-spinner' />
    </LineSpinner>
  )

  const showArrowIcon = props.showArrowIcon && (productInfo?.ingredients?.length > 0 || productInfo?.options?.length > 0 || product?.comment)

  // what the product's name opens / closes: its ingredients, options and comment
  const optionsId = useId()
  const hasOptions = !!(productInfo?.ingredients?.length || productInfo?.options?.length || product?.comment)
  // the name is a button (keyboard, expanded state) when the row opens its
  // options; its click reaches the row, which toggles as a click on it does
  const canToggle = hasOptions && !(!product?.valid_menu && isCartProduct)
  const nameToggleProps = canToggle
    ? { as: 'button', type: 'button', 'aria-expanded': setActive === 'active', 'aria-controls': optionsId }
    : {}
  // a summary's image only shows the product (its row edits nothing)
  const canEditFromImage = !!onEditProduct && !isDisabledEdit && !isSummary

  const toggleAccordion = (e) => {
    const isActionsClick = productActionsEdit.current?.contains(e.target) || productImageEdit.current?.contains(e.target) || productActionsDelete.current?.contains(e.target) || quantityStepper.current?.contains(e.target)
    if ((!product?.valid_menu && isCartProduct) || isActionsClick) return
    setActiveState(setActive === '' ? 'active' : '')
    setHeightState(
      setActive === 'active' ? '0px' : `${content.current.scrollHeight}px`
    )
  }

  const handleChangeQuantity = (value) => {
    if (parseInt(value) === 0) {
      onDeleteProduct(product)
    } else {
      changeQuantity(product, parseInt(value))
    }
  }

  const otherLinesQuantity = (product?.balance ?? product?.quantity ?? 0) - (product?.quantity ?? 0)
  const exceedsMaximum = (quantity) => !!product?.maximum_per_order && otherLinesQuantity + quantity > product?.maximum_per_order
  const isMaximumReached = exceedsMaximum(product?.quantity + 1)

  const handleIncrement = () => {
    if (isMaximumReached) return
    changeQuantity(product, product?.quantity + 1)
  }

  const handleDecrement = () => {
    changeQuantity(product, product?.quantity - 1)
  }

  const getFormattedSubOptionName = ({ quantity, name, position, price }) => {
    const pos = position ? `(${position})` : ''
    return `${quantity} x ${name} ${pos} +${price}`
  }

  // the line a product add just touched (the cart beside the menu): kept in view, as it may be below the panel's fold
  useEffect(() => {
    if (highlighted) rowRef.current?.scrollIntoView?.({ block: 'nearest', behavior: scrollBehavior(theme) })
  }, [highlighted])

  useEffect(() => {
    if (setActive === 'active') {
      setHeightState(
        `${content.current.scrollHeight + 40}px`
      )
    }
  }, [product, setActive])

  useEffect(() => {
    if ((isCheckout || isOrderDetails) && content.current) {
      setHeightState(`${content.current.scrollHeight + 1}px`)
    }
  }, [isCheckout, isOrderDetails])

  const ProductOptionsList = (isCheckout || isOrderDetails) ? ProductOptionsListDiv : ProductOptionsListUl

  return (
    <>
      <AccordionSection
        ref={rowRef}
        data-doc-section='cart-product-row'
        data-doc-state-highlight={highlighted ? 'true' : undefined}
        data-doc-state-updating={showUpdating ? 'true' : undefined}
        aria-busy={isUpdating ? 'true' : undefined}
        $highlighted={highlighted}
        $updating={showUpdating}
        data-doc-product-id={product?.id}
        transBackground={isCheckout || isOrderDetails}
        noBorder={isOrderDetails}
        $summaryGrid={isSummary && !hideQuantitySelector}
        $summaryImage={isSummary && !product?.calendar_event && !!productImage && showProductImage}
        $invalid={!(product?.valid ?? true)}
      >
        <Accordion
          data-doc-section='cart-product'
          data-doc-product-id={product?.id}
          data-doc-state={product?.valid === false ? 'invalid' : 'valid'}
          hideQuantitySelector={hideQuantitySelector}
          noMargin={isCheckout || isOrderDetails || (!isStore && !isCheckout && !isOrderDetails && !isConfirmationPage)}
          className={`product accordion ${setActive}`}
          onClick={(e) => toggleAccordion(e)}
        >
          <ProductInfo className='info' isValid={product?.valid ?? true} hideQuantitySelector={hideQuantitySelector} midWidth={isCheckout || isOrderDetails} fullWidth={isOrderDetails}>
            {productImage && showProductImage && (
              // the image edits the product: a real button (named) when it does;
              // in the cart's line the Edit link is that button, the image a
              // shortcut for the pointer
              <WrapperProductImage
                data-doc-control='cart-product-edit-image'
                className={isSummary ? 'summary-image' : undefined}
                hideQuantitySelector={hideQuantitySelector}
                onClick={() => canEditFromImage && onEditProduct(product)}
                {...(canEditFromImage && (hideQuantitySelector
                  ? { ref: productImageEdit, 'aria-hidden': true }
                  : { as: 'button', type: 'button', ref: productImageEdit, 'aria-label': t('EDIT', 'Edit') }))}
              >
                <ProductImage {...(canEditFromImage && { as: 'span' })} hideQuantitySelector={hideQuantitySelector} bgimage={productImage}>
                {canEditFromImage && !hideQuantitySelector && <IconContainer><Button decorative iconLine borderInset layout='row' shape='icon' size='xs' color='neutral'><Icon name='pencil' /></Button></IconContainer>}
                </ProductImage>
              </WrapperProductImage>
            )}
            {product?.calendar_event
              ? (
              <ScheduleInfoWrapper>
                <div className='item-name' title={product.name}>{product.name}</div>
                <ScheduleInfo>
                  <span>
                    {parseDate(product?.calendar_event?.start, { outputFormat: timeFormat || 'HH:mm' })}
                    {' '}-{' '}
                    {parseDate(product?.calendar_event?.end, { outputFormat: timeFormat || 'HH:mm' })}
                  </span>
                </ScheduleInfo>
              </ScheduleInfoWrapper>
                )
              : (
                <>
                  {!hideQuantitySelector && (
                    <>
                      {(!isCheckout && !isOrderDetails) && !isDisabledEdit && isCartProduct && !isCartPending && getProductMax
                        ? (
                          // a stepper (components.stepper) with the select's
                          // limits: 0 removes, up to the max and the stock offset
                          <span ref={quantityStepper}>
                            <Stepper
                              size='sm'
                              value={product.quantity}
                              onDecrement={() => handleChangeQuantity(product.quantity - 1)}
                              onIncrement={() => !isMaximumReached && handleChangeQuantity(product.quantity + 1)}
                              decrementDisabled={!(product.quantity > 0)}
                              incrementDisabled={product.quantity + 1 > getProductMax(product) || offsetDisabled(product) < product.quantity + 1 || isMaximumReached}
                              removable
                            />
                          </span>
                          )
                        : (
                          // the order details' rows as the checkout's (quantity
                          // and name in the same text, options in body)
                          <ProductQuantity className='quantity-item' marginRight={isCheckout || isOrderDetails} $textStyle='body_lg'>
                            {product?.quantity}
                          </ProductQuantity>
                          )}
                    </>
                  )}
                  {!hideQuantitySelector && (
                    <ContentInfo fullWidth={isCheckout || isOrderDetails} $textStyle='body_lg'>
                      <div className='product-name'>
                        <ItemName className='item-name' title={product.name} {...nameToggleProps}>{product.name}</ItemName>
                      </div>
                      {(!isCheckout && !isOrderDetails) && windowSize.width <= 410 && (
                        <span>
                          <p>{parsePrice(product.total || product.price)}</p>
                          {isCartProduct && !isCartPending && (
                            <div>
                              {onEditProduct && !isDisabledEdit && (
                                <Button color='neutral' appearance='ghost' size='sm' shape='icon' data-doc-control='cart-product-edit' aria-label={editLabel} ref={productActionsEdit} onClick={() => onEditProduct(product)}>
                                  <Icon name="pencil" />
                                </Button>
                              )}
                              {onDeleteProduct && (
                                <Button color='neutral' appearance='ghost' size='sm' shape='icon' ref={productActionsDelete} aria-label={deleteLabel} onClick={() => onDeleteProduct(product)}>
                                  <Icon name="trashFilled" />
                                </Button>
                              )}
                            </div>
                          )}
                        </span>
                      )}
                    </ContentInfo>
                  )}
                </>
                )}
          </ProductInfo>
          {hideQuantitySelector && (
            <div className='product-info'>
              <ItemName className='item-name' title={!product?.calendar_event ? product.name : undefined} {...nameToggleProps}>
                {!product?.calendar_event && product.name}
              </ItemName>
              <ProductPrice className='prod-price' hideQuantitySelector={hideQuantitySelector}>
                <span>
                  {parsePrice(product.total || product.price)}
                </span>
                {updatingRing(false)}
              </ProductPrice>
              <ProductActions hideQuantitySelector={hideQuantitySelector}>
                {/* the cart's line edits from a link (and its photo), implementation notes */}
                {canEditFromImage && !isCartPending && product?.valid_menu && (
                  <ProductEditLink
                    ref={productActionsEdit}
                    data-doc-control='cart-product-edit'
                    onClick={() => onEditProduct(product)}
                    disabled={orderState.loading}
                  >
                    {editLabel}
                  </ProductEditLink>
                )}
                {!isCartPending && product?.valid_quantity && product?.valid_menu && (onDeleteProduct || !isDisabledEdit)
                  ? (
                    // a stepper (components.stepper) with the same actions: −
                    // removes at 1 (a trash), + adds; both wait for the order
                    // to finish loading
                    <span ref={quantityStepper}>
                      <Stepper
                        size='sm'
                        value={product?.quantity}
                        onDecrement={onDeleteProduct ? (product?.quantity > 1 ? handleDecrement : () => onDeleteProduct(product)) : undefined}
                        onIncrement={!isDisabledEdit ? handleIncrement : undefined}
                        decrementDisabled={orderState.loading}
                        incrementDisabled={orderState.loading || isMaximumReached}
                        removable
                        decrementProps={{ 'data-doc-control': product?.quantity > 1 ? 'cart-product-decrement' : 'cart-product-delete' }}
                        incrementProps={{ 'data-doc-control': 'cart-product-increment' }}
                      />
                    </span>
                    )
                  : product?.quantity > 0 && (
                    <p className='quantity-item'>{product?.quantity}</p>
                  )}
              </ProductActions>
            </div>
          )}
          {!hideQuantitySelector && showArrowIcon && <ChevronIcon kind='disclose' open={setActive === 'active'} className='accordion__icon' />}

          {/* the line's price: a cart's product only while it is valid; an
              order's products (confirmation, details) carry no `valid`, and
              show it at every width (their row has no other price), the
              checkout's rows too (the name ends in … beside it) */}
          {!hideQuantitySelector && (product?.valid || !isCartProduct) && (
            <>
              {(windowSize.width > 410 || isOrderDetails || isCheckout) && (
                <ProductPriceSection>
                  <ProductPrice className='prod-price'>
                    {updatingRing(true)}
                    <span>
                      {parsePrice(product.total || product.price)}
                    </span>
                    {(!isCheckout && !isOrderDetails) && (productInfo.ingredients.length > 0 || productInfo.options.length > 0 || product.comment) && (
                      <p>
                        <ChevronIcon kind='disclose' open={setActive === 'active'} className='accordion__icon' />
                      </p>
                    )}
                  </ProductPrice>
                  {(!isCheckout && !isOrderDetails) && isCartProduct && !isCartPending && (
                    <ProductActions>
                      {!isDisabledEdit && (
                        <Button
                          color='neutral'
                          appearance='ghost'
                          size='sm'
                          shape='icon'
                          aria-label={editLabel}
                          data-doc-control='cart-product-edit'
                          ref={productActionsEdit}
                          onClick={() => onEditProduct(product)}
                          disabled={orderState.loading}
                        >
                          <Icon name="pencil" />
                        </Button>
                      )}
                      {onDeleteProduct && (
                        <ProductActionsDeleteWrapper>
                          <Button
                            color='neutral'
                            appearance='ghost'
                            size='sm'
                            shape='icon'
                            aria-label={deleteLabel}
                            data-doc-control='cart-product-delete'
                            ref={productActionsDelete}
                            onClick={() => onDeleteProduct(product)}
                            disabled={orderState.loading}
                          >
                            <Icon name="trashFilled" />
                          </Button>
                        </ProductActionsDeleteWrapper>
                      )}
                    </ProductActions>
                  )}
                </ProductPriceSection>
              )}
            </>
          )}

          {isCartProduct && !isCartPending && product?.valid_menu && !product?.valid_quantity && (
            <ProductError>
                <ProductActions>
                  {!hideQuantitySelector && !isDisabledEdit && (
                    <Button
                      color='neutral'
                      appearance='ghost'
                      size='sm'
                      shape='icon'
                      aria-label={editLabel}
                      data-doc-control='cart-product-edit'
                      ref={productActionsEdit}
                      onClick={() => onEditProduct(product)}
                      disabled={orderState.loading}
                    >
                      <Icon name="pencil" />
                    </Button>
                  )}
                  {onDeleteProduct && (
                    <ProductActionsDeleteWrapper>
                      <Button
                        color='neutral'
                        appearance='ghost'
                        size='sm'
                        shape='icon'
                        aria-label={deleteLabel}
                        data-doc-control='cart-product-delete'
                        ref={productActionsDelete}
                        onClick={() => onDeleteProduct(product)}
                        disabled={orderState.loading}
                      >
                        <Icon name="trashFilled" />
                      </Button>
                    </ProductActionsDeleteWrapper>
                  )}
                </ProductActions>
              <ProductNotAvailable>
                {t('NOT_AVAILABLE', 'Not available')}
              </ProductNotAvailable>
            </ProductError>
          )}

          {!product?.valid_menu && isCartProduct && !isCartPending && (
            <ProductError>
              <ProductActions>
                {onDeleteProduct && (
                  <ProductActionsDeleteWrapper>
                    <Button
                      color='danger'
                      appearance='ghost'
                      size='sm'
                      shape='icon'
                      aria-label={deleteLabel}
                      data-doc-control='cart-product-delete'
                      ref={productActionsDelete}
                      onClick={() => onDeleteProduct(product)}
                      disabled={orderState.loading}
                    >
                      <Icon name="trashFilled" />
                    </Button>
                  </ProductActionsDeleteWrapper>
                )}
              </ProductActions>
              <ProductNotAvailable>
                {t('NOT_AVAILABLE', 'Not available')}
              </ProductNotAvailable>
            </ProductError>
          )}
        </Accordion>

        <AccordionContent
          id={optionsId}
          className='accordion-product-options'
          ref={content}
          style={{ maxHeight: `${setHeight}` }}
          fullWidth={isCheckout || isOrderDetails}
        >
          {productInfo.ingredients.length > 0 && productInfo.ingredients.some(ingredient => !ingredient.selected) && (
            <ProductOptionsList>
              <p>{t('INGREDIENTS', 'Ingredients')}</p>
              {productInfo.ingredients.map(ingredient => !ingredient.selected && (
                <li className='ingredient' key={ingredient.id}>
                  <span>{t('WITHOUT_INGREDIENT', 'No _ingredient_').replace('_ingredient_', ingredient.name)}</span>
                </li>
              ))}
            </ProductOptionsList>
          )}
          {productInfo.options.length > 0 && (
            <ProductOptionsList $textStyle='body'>
              {(isCheckout || isOrderDetails)
                ? (
                  <p>
                    {productInfo.options.map((option, index) => (
                      <React.Fragment key={option.id ?? index}>
                        {option?.suboptions?.sort((a, b) => a.rank - b.rank).map((suboption, subIndex) => (
                            <React.Fragment key={suboption.id ?? subIndex}>
                              {option.name} {suboption.name}
                              {index < productInfo.options.length - 1 && ', '}
                            </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </p>
                  )
                : (
                <>
                  {productInfo.options.map(option => (
                    <li key={option.id}>
                      <p>{option.name}</p>
                      <ProductOptionsList className='suboption'>
                        {option?.suboptions?.sort((a, b) => a.rank - b.rank).map(suboption => (
                          <li key={suboption.id}>
                            <span>
                              {getFormattedSubOptionName({
                                quantity: suboption.quantity,
                                name: suboption.name,
                                position: (suboption?.position !== 'whole') ? t(suboption.position.toUpperCase(), suboption.position) : '',
                                price: (['left', 'right'].includes(suboption.position)) ? parsePrice(suboption.half_price ?? suboption.price) : parsePrice(suboption.price)
                              })}
                            </span>
                          </li>
                        ))}
                      </ProductOptionsList>
                    </li>
                  ))}
                </>
                  )}
            </ProductOptionsList>
          )}
          {toppingsRemoved?.removed?.length > 0 && (
            <ProductOptionsList>
              <li>
                <p>{t('TOPPINGS_REMOVED', 'Toppings removed')}</p>
                <ProductOptionsList className='suboption'>
                  {toppingsRemoved?.removed.map(topping => (
                    <li key={topping.code}>
                      <span>{topping.name}</span>
                    </li>
                  ))}
                </ProductOptionsList>
              </li>
            </ProductOptionsList>
          )}
          {product.comment && (
            <ProductComment $textStyle={isCheckout || isOrderDetails ? 'body' : 'body_lg'}>
              <p>{t('SPECIAL_COMMENT', 'Special Comment')}</p>
              <p className='item-comment' title={product.comment}>{product.comment}</p>
            </ProductComment>
          )}
        </AccordionContent>
      </AccordionSection>
    </>
  )
}

export const ProductItemAccordion = (props) => {
  const productItemAccordion = {
    ...props,
    UIComponent: ProductItemAccordionUI
  }
  return (
    <ProductItemAccordionController {...productItemAccordion} />
  )
}
