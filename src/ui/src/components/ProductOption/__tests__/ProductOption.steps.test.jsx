import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ProductOption } from '../index'
import { ProductStepGroup } from '../StepGroup'

// implementation notes, layout `steps`: a group of the accordion. The parent (the product form)
// folds the groups, one open at a time; the group draws its header and its folding.

vi.mock('~components/components/ProductOption', () => ({
  ProductOption: ({ UIComponent, ...rest }) => <UIComponent error={false} {...rest} />
}))

const size = { id: 1, name: 'Size', min: 1, max: 1 }
const extras = { id: 2, name: 'Extras', min: 0, max: 3 }

const renderStep = (option, step, props = {}, theme = defaultTheme) => renderWithProviders(
  <ProductOption option={option} step={{ open: false, onToggle: vi.fn(), headerRef: vi.fn(), ...step }} {...props}>
    <button type='button'>choice</button>
  </ProductOption>,
  { theme }
)

describe('ProductOption as a step', () => {
  it('its header is a button with aria-expanded and aria-controls, folded by the parent, not by itself', () => {
    const onToggle = vi.fn()
    const { getByRole, getByText } = renderStep(size, { open: false, onToggle })
    const header = getByRole('button', { name: 'Size' })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(header.getAttribute('aria-controls'))).toContainElement(getByText('choice'))
    fireEvent.click(header)
    expect(onToggle).toHaveBeenCalledTimes(1)
    // its own state does not open it: the parent says
    expect(header).toHaveAttribute('aria-expanded', 'false')
  })

  it('an open step is expanded; a folded one is out of reach (not drawn, not in the tab order)', () => {
    const open = renderStep(size, { open: true })
    expect(open.getByRole('button', { name: 'Size' })).toHaveAttribute('aria-expanded', 'true')
    expect(open.getByRole('button', { name: 'choice' })).toBeInTheDocument()
    open.unmount()

    const folded = renderStep(size, { open: false })
    expect(folded.queryByRole('button', { name: 'choice' })).toBeNull()
    expect(cssFor(folded.getByText('choice').parentElement)).toContain('visibility:hidden')
  })

  it('a step folds visibly: its visibility changes at the end of the accordion\'s transition, at once when the theme does not animate', () => {
    const animated = themeWithValues((values) => {
      values.tokens.motion_style.enabled = true
      Object.assign(values.components.accordion.base, { animated: true, speed: 300 })
      return values
    })
    const still = themeWithValues((values) => {
      values.tokens.motion_style.enabled = false
      return values
    })
    const transitionOf = (theme, step, props) => {
      const utils = renderStep(size, step, props, theme)
      const css = cssFor(utils.getByText('choice').parentElement)
      utils.unmount()
      return css
    }
    const folding = transitionOf(animated, { open: false })
    expect(folding).toMatch(/transition:[^;}]*max-height 300ms[^;}]*,[^;}]*visibility 300ms/)
    // not a step (layout sheet): only its height moves
    expect(transitionOf(animated, undefined, { step: undefined })).not.toContain('visibility 300ms')
    // the identity does not animate: no transition at all, the group is hidden at once
    const hidden = transitionOf(still, { open: false })
    expect(hidden).toContain('visibility:hidden')
    expect(hidden).toContain('transition:none')
  })

  it('the collapsed of the theme does not apply: the accordion rules', () => {
    const theme = themeWithValues((values) => {
      values.components.product_option.base = { ...values.components.product_option.base, collapsed: 'all' }
      return values
    })
    const { getByRole } = renderStep(size, { open: true }, {}, theme)
    expect(getByRole('button', { name: 'Size' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('a required group still to choose says Required at the end of its header (not below the name)', () => {
    const { getByText } = renderStep(size, { done: false })
    const badge = getByText('Required')
    expect(badge.closest('[data-doc-step-state]')).toHaveAttribute('data-doc-step-state', 'pending')
    expect(badge.closest('.title-container')).toBeNull()
  })

  it('a partially chosen required step keeps the danger badge after validation', () => {
    const { getByText } = renderStep({ ...size, min: 2, max: 3 }, { done: false, summary: 'Large' }, { requiredInvalid: true })
    expect(getByText('Required')).toHaveAttribute('data-doc-variant', 'danger')
    expect(getByText('Large')).toBeInTheDocument()
  })

  it('a required group done says what was chosen and its state is done; the header describes itself with it', () => {
    const { getByText, getByRole, queryByText } = renderStep(size, { done: true, summary: 'Large' })
    const end = getByText('Large').closest('[data-doc-step-state]')
    expect(end).toHaveAttribute('data-doc-step-state', 'done')
    expect(queryByText('Required')).toBeNull()
    expect(getByRole('button', { name: 'Size' })).toHaveAttribute('aria-describedby', end.id)
  })

  it('an optional group says Optional, or what was chosen', () => {
    const none = renderStep(extras, { summary: '' })
    expect(none.getByText('Optional')).toBeInTheDocument()
    none.unmount()
    const some = renderStep(extras, { summary: 'Cheese, Bacon ×2' })
    expect(some.getByText('Cheese, Bacon ×2').closest('[data-doc-step-state]')).toHaveAttribute('data-doc-step-state', 'optional')
  })

  it('the markers of the group stay: id, data-doc-*, the error', () => {
    const { container } = renderStep(size, { done: false }, { error: true })
    const group = container.querySelector('#id_1')
    expect(group).toHaveAttribute('data-doc-section', 'product-option')
    expect(group).toHaveAttribute('data-doc-option-id', '1')
    expect(group).toHaveAttribute('data-doc-required', 'true')
    expect(group).toHaveAttribute('data-doc-state', 'invalid')
  })

  it('without a step it is the group it always was: it folds itself, no end of header', () => {
    const { getByRole, queryByText, container } = renderWithProviders(<ProductOption option={size}><span>choice</span></ProductOption>)
    const header = getByRole('button', { name: 'Size' })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('[data-doc-step-state]')).toBeNull()
    expect(queryByText('Optional')).toBeNull()
  })
})

describe('ProductStepGroup (ingredients, instructions)', () => {
  it('has the same header and folding, and says what it holds', () => {
    const onToggle = vi.fn()
    const { getByRole, getByText } = renderWithProviders(
      <ProductStepGroup id='step_ingredients' name='Ingredients' step={{ open: false, onToggle, headerRef: vi.fn(), summary: 'Without onion' }}>
        <span>list</span>
      </ProductStepGroup>
    )
    const header = getByRole('button', { name: 'Ingredients' })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(header).toHaveAttribute('aria-controls', 'content_step_ingredients')
    expect(getByText('Without onion')).toBeInTheDocument()
    fireEvent.click(header)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('says Optional while nothing is set', () => {
    const { getByText } = renderWithProviders(
      <ProductStepGroup id='step_instructions' name='Additional instructions' step={{ open: true, onToggle: vi.fn(), summary: '' }}>
        <span>note</span>
      </ProductStepGroup>
    )
    expect(getByText('Optional')).toBeInTheDocument()
  })
})
