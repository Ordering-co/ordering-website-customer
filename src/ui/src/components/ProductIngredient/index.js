import React from 'react'
import { ProductIngredient as ProductIngredientController } from '~components/components/ProductIngredient'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { Choice } from '~ui/src/design-system/components/Choice'

const ProductIngredientUI = (props) => {
  const {
    state,
    ingredient,
    toggleSelect,
    isSoldOut,
    isReadOnly
  } = props

  // an option of a multiple choice list (a Choice of the design system, components.choice), with
  // the product options' components. Sold out forces it unselected; read-only (the store closed,
  // implementation notes) keeps the cart's real selection, only blocking the toggle. Either way the row
  // keeps its look and only its check dims (`unavailable`)
  const checked = !!state?.selected && !isSoldOut
  const blocked = !!isSoldOut || !!isReadOnly
  return (
    <ComponentScope group='product_option'>
      <Choice
        type='check'
        title={ingredient.name}
        checked={checked}
        disabled={blocked}
        unavailable={blocked}
        onCheckedChange={() => toggleSelect()}
        data-doc-control='product-ingredient'
        data-doc-ingredient-id={ingredient?.id}
        data-doc-selected={state?.selected ? 'true' : 'false'}
      />
    </ComponentScope>
  )
}

export const ProductIngredient = (props) => {
  const productIngredientProps = {
    ...props,
    UIComponent: ProductIngredientUI
  }

  return (
    <ProductIngredientController {...productIngredientProps} />
  )
}
