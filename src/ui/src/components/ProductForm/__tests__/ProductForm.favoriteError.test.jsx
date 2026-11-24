import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

// implementation notesa heart whose request fails to reach the API shows the theme's notice, not the browser's text
const showToast = vi.fn()
let controllerProps
vi.mock('~components/contexts/ToastContext', () => ({
  useToast: () => [[], { showToast }],
  ToastType: { Error: 'error' }
}))
vi.mock('~components/components/ProductForm', () => ({
  ProductForm: (props) => { controllerProps = props; return null }
}))
const { ProductForm } = await import('../index')

describe('ProductForm favorite error', () => {
  it('hands the controller an onFavoriteError that toasts the translatable network notice', () => {
    renderWithProviders(<ProductForm product={{ id: 1 }} />)
    controllerProps.onFavoriteError(new TypeError('Failed to fetch'))
    expect(showToast).toHaveBeenCalledWith('error', 'Network error, please reload the page')
  })
})
