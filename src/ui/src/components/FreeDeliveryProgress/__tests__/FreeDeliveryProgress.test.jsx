import React from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { contrast as getContrast } from '@orderingco/ordering-theme-engine/colors'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { FreeDeliveryProgress } from '../index'

describe('FreeDeliveryProgress', () => {
  it.each(['awareness', 'progress', 'unconfirmed', 'unlocked'])('shows %s without an icon', status => {
    const { container } = renderWithProviders(
      <FreeDeliveryProgress status={status} minimum={30} currentAmount={12} remainingAmount={18} progressPercent={40} />
    )

    expect(container.querySelector('[data-testid^="icon-"]')).toBeNull()
  })

  it('allows copy and amounts to wrap independently on narrow screens', () => {
    renderWithProviders(<FreeDeliveryProgress status='progress' minimum={30} currentAmount={12} remainingAmount={18} progressPercent={40} variant='compact' />)
    expect(window.getComputedStyle(screen.getByText('$12 / $30').parentElement).flexWrap).toBe('wrap')
  })
  it('renders nothing when progress is hidden', () => {
    const { container } = renderWithProviders(
      <FreeDeliveryProgress status='hidden' />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('formats the qualifying minimum in the awareness message', () => {
    renderWithProviders(
      <FreeDeliveryProgress status='awareness' minimum={25} />
    )

    expect(screen.getByText('Free delivery on orders $25+')).toBeInTheDocument()
  })

  it('shows formatted progress amounts and exposes semantic progress values', () => {
    renderWithProviders(
      <FreeDeliveryProgress
        status='progress'
        minimum={25}
        currentAmount={10}
        remainingAmount={15}
        progressPercent={40}
      />
    )

    expect(screen.getByText('Add $15 for free delivery')).toBeInTheDocument()
    expect(screen.getByText('$10 / $25')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  })

  it('announces the unlocked state with text independent of color', () => {
    renderWithProviders(
      <FreeDeliveryProgress status='unlocked' />
    )

    const unlocked = screen.getByRole('status')
    const styles = window.getComputedStyle(unlocked)

    expect(unlocked).toHaveTextContent('Free delivery unlocked')
    expect(styles.color).toBe('rgb(0, 0, 0)')
    expect(styles.backgroundColor).toBe('rgb(214, 255, 247)')
    expect(getContrast(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(4.5)
  })

  it('warns without claiming free delivery when the cart has not confirmed the offer', () => {
    renderWithProviders(<FreeDeliveryProgress status='unconfirmed' minimum={30} />)
    expect(screen.getByRole('status')).toHaveTextContent('Free delivery has not been applied to this cart yet')
    expect(screen.queryByText('Free delivery unlocked')).not.toBeInTheDocument()
  })

  it.each(['compact', 'full'])('keeps the progress copy and amounts in the %s variant', (variant) => {
    renderWithProviders(
      <FreeDeliveryProgress
        variant={variant}
        status='progress'
        minimum={30}
        currentAmount={12}
        remainingAmount={18}
        progressPercent={40}
      />
    )

    expect(screen.getByText('Add $18 for free delivery')).toBeInTheDocument()
    expect(screen.getByText('$12 / $30')).toBeInTheDocument()
  })

  describe('the box (an alert of the theme)', () => {
    const theme = themeWithValues((values) => {
      const { alert } = values.components
      alert.base = { ...alert.base, radius: 12, padding: 10 }
      alert.variants.info = { ...alert.variants.info, background: '#EAF2FF', border: { width: 1, color: '#2F6FEB', style: 'solid' } }
      alert.variants.success = { ...alert.variants.success, background: '#E6F7E6', border: { width: 1, color: '#2E9E2E', style: 'solid' } }
      return values
    })
    const box = (status, t = theme) => renderWithProviders(
      <FreeDeliveryProgress status={status} minimum={25} currentAmount={10} remainingAmount={15} progressPercent={40} />,
      { theme: t }
    ).container.firstChild

    it('before it is unlocked: the info alert (background, border, radius, padding)', () => {
      const style = window.getComputedStyle(box('progress'))
      expect(style.backgroundColor).toBe('rgb(234, 242, 255)')
      expect(style.border).toBe('1px solid rgb(47, 111, 235)')
      expect(style.borderRadius).toBe('12px')
      expect(style.padding).toBe('10px')
    })

    it('unlocked: the success alert, a status', () => {
      const el = box('unlocked')
      const style = window.getComputedStyle(el)
      expect(style.backgroundColor).toBe('rgb(230, 247, 230)')
      expect(style.borderColor).toBe('rgb(46, 158, 46)')
      expect(el).toHaveAttribute('role', 'status')
    })
  })

  describe('the bar', () => {
    const completeTheme = themeWithValues()
    const progress = completeTheme.values.components.progress
    const bar = <FreeDeliveryProgress status='progress' minimum={25} currentAmount={10} remainingAmount={15} progressPercent={40} />

    it('theme: components.progress sm in its default state, named by the message', () => {
      renderWithProviders(bar, { theme: completeTheme })
      const track = screen.getByRole('progressbar', { name: 'Add $15 for free delivery' })
      expect(track.tagName).toBe('DIV')
      expect(track).toHaveAttribute('aria-valuenow', '40')
      expect(track).toHaveAttribute('aria-valuemin', '0')
      expect(track).toHaveAttribute('aria-valuemax', '100')
      expect(cssFor(track)).toContain(`height:${progress.sizes.sm.height}px`)
      expect(cssFor(track)).toContain(`background:${progress.base.track}`)
      expect(cssFor(track.firstChild)).toContain(`background:${progress.base.fill}`)
      expect(cssFor(track.firstChild)).not.toMatch(/animation:\S+ 1600ms/)
    })

    it.each(['awareness', 'unconfirmed', 'unlocked'])('theme: %s still draws no bar', (status) => {
      renderWithProviders(<FreeDeliveryProgress status={status} minimum={25} />, { theme: completeTheme })
      expect(screen.queryByRole('progressbar')).toBeNull()
    })
  })
})

describe('visibility cart.free_delivery_progress', () => {
  const STATUSES = ['awareness', 'progress', 'unconfirmed', 'unlocked']
  const props = { minimum: 30, currentAmount: 12, remainingAmount: 18, progressPercent: 40 }
  const hiddenTheme = () => themeWithValues((values) => { values.visibility['cart.free_delivery_progress'] = false; return values })

  it('the schema: shown by default', () => {
    expect(schemaDefault('visibility.cart.free_delivery_progress')).toBe(true)
  })

  // the key is its callers' (the cart's places), not the notice's: the
  // store's banner follows only its section (pages.business free_delivery_banner)
  it.each(STATUSES.flatMap((status) => [[status, 'full'], [status, 'compact']]))('the key off: the %s notice (%s) still draws, its callers decide', (status, variant) => {
    const { container } = renderWithProviders(<FreeDeliveryProgress status={status} variant={variant} {...props} />, { theme: hiddenTheme() })
    expect(container).not.toBeEmptyDOMElement()
  })

  it.each(STATUSES)('complete theme by default: the %s notice', (status) => {
    const { container } = renderWithProviders(<FreeDeliveryProgress status={status} {...props} />, { theme: themeWithValues() })
    expect(container).not.toBeEmptyDOMElement()
  })
})
