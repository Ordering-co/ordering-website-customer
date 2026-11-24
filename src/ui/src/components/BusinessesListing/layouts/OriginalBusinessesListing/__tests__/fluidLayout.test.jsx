import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { cssFor, defaultTheme, renderWith } from '../../../../../styles/__tests__/themeTestUtils'
import { themeMedia } from '~/utils/themeTokens'

const styles = await vi.importActual('~ui/src/components/BusinessesListing/layouts/OriginalBusinessesListing/styles')
const tight = (text) => text.replace(/\s+/g, '')
const css = (Styled, props = {}) => {
  const { container } = renderWith(defaultTheme, <Styled {...props} />)
  return tight(cssFor(container.firstChild))
}

describe('OriginalBusinessesListing — fluid boxes (no fixed px)', () => {
  it('the city button, the redirect area, the types and the filters search are measures in ch', () => {
    // the city's slot is sized, never the Button inside it
    expect(css(styles.CityAction)).toContain('width:min(100%,31ch);')
    expect(css(styles.WrapperSearch)).not.toMatch(/31ch|250px|button/)
    expect(css(styles.WrapperSearch, { isCustomerMode: false })).toContain('max-width:min(100%,50ch);')
    expect(css(styles.TypesWrapper)).toContain('max-width:min(100%,75ch);')
    const search = css(styles.FiltersSearch)
    expect(search).toContain('width:min(100%,38ch);')
    expect(search).toContain('width:min(100%,44ch);')
    expect(search).not.toMatch(/300px|350px/)
  })
})

describe('OriginalBusinessesListing — the logo tile', () => {
  it('is the media box of the theme (xs), with the base Button over all of it that opens the store', () => {
    const onClick = vi.fn()
    const { getByRole } = renderWith(defaultTheme, (
      <styles.BusinessLogo aria-label='Demo Cafe' aria-current='page' isActive bgimage='https://example.com/logo.png' onClick={onClick} />
    ))
    const button = getByRole('button', { name: 'Demo Cafe' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('aria-current', 'page')
    const tile = button.parentElement
    expect(tile.style.backgroundImage).toBe('url("https://example.com/logo.png")')
    const xs = themeMedia(defaultTheme, 'xs')
    const rules = tight(cssFor(tile))
    expect(rules).toContain(`width:${xs};height:${xs};`)
    expect(button.style.position).toBe('absolute')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('a store without a logo shows its name inside the button', () => {
    const { getByRole } = renderWith(defaultTheme, <styles.BusinessLogo aria-label='Demo Cafe'>Demo Cafe</styles.BusinessLogo>)
    const button = getByRole('button', { name: 'Demo Cafe' })
    expect(button).toHaveTextContent('Demo Cafe')
    expect(button.parentElement.style.backgroundImage).toBe('')
  })
})
