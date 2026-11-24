import { themeValue } from '~/utils/themeTokens'

// What the product window does when a required group is still to choose, by
// `components.product_modal.base.missing_choices`: `jump` (the button says
// "Add to cart" and takes the customer to the first group missing) or `guide`
// (the button says "Choose <group>" until nothing is missing). A theme
// without it, or with a value this code does not know, is `jump`.
export const missingChoicesMode = (theme) => (
  themeValue(theme, 'product_modal', 'base.missing_choices') === 'guide' ? 'guide' : 'jump'
)

// Stored layouts remain selectable. Unset or unknown values use the product card.
const PRODUCT_LAYOUTS = ['card', 'showcase', 'sheet', 'steps']

export const productModalLayout = (theme) => {
  const layout = themeValue(theme, 'product_modal', 'base.layout')
  return PRODUCT_LAYOUTS.includes(layout) ? layout : 'card'
}

// The id of the product's name (the h2 of the form): the product modal is named by it
// (`aria-labelledby`). One product window is open at a time.
export const PRODUCT_NAME_ID = 'product-modal-name'
