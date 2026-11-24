import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'

import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CompleteProfile } from '../index'

const sessionMocks = vi.hoisted(() => {
  const refreshUserInfo = vi.fn()
  // Stable tuple: a fresh `user` object each render would loop the [user]-keyed effect.
  return {
    refreshUserInfo,
    tuple: [{ auth: true, user: { id: 1 } }, { refreshUserInfo, login: vi.fn(), logout: vi.fn() }]
  }
})

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => sessionMocks.tuple
}))

vi.mock('~ui/src/components/UserDetails', () => ({
  UserDetails: (props) => (
    <div
      data-testid='user-details'
      data-required={JSON.stringify(props.requiredFields)}
      data-checkoutplace={String(props.isCheckoutPlace)}
    />
  )
}))

vi.mock('~ui/src/components/LogoutButton', () => ({
  LogoutButton: () => <div data-testid='logout-button' />
}))

const baseProps = {
  missingFields: ['name'],
  checkoutFields: [{ order_type_id: 1, enabled: true, required: true, validation_field: { code: 'name' } }],
  canSkip: false,
  onSkip: vi.fn()
}

describe('CompleteProfile UI (smoke)', () => {
  it('refresca el user del servidor al montar (evita bloquear con datos obsoletos)', () => {
    sessionMocks.refreshUserInfo.mockClear()
    renderWithProviders(<CompleteProfile {...baseProps} />)
    expect(sessionMocks.refreshUserInfo).toHaveBeenCalledTimes(1)
  })

  it('renderiza el logout y reenvía requiredFields a UserDetails', () => {
    const { getByTestId } = renderWithProviders(<CompleteProfile {...baseProps} />)
    expect(getByTestId('logout-button')).toBeInTheDocument()
    const ud = getByTestId('user-details')
    expect(ud).toHaveAttribute('data-required', JSON.stringify(['name']))
    expect(ud).toHaveAttribute('data-checkoutplace', 'true')
  })

  it('no muestra el botón Skip cuando canSkip es false', () => {
    const { container } = renderWithProviders(<CompleteProfile {...baseProps} canSkip={false} />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('muestra el botón Skip y llama onSkip cuando canSkip es true', () => {
    const onSkip = vi.fn()
    const { container } = renderWithProviders(<CompleteProfile {...baseProps} canSkip onSkip={onSkip} />)
    const skip = container.querySelector('button')
    expect(skip).not.toBeNull()
    fireEvent.click(skip)
    expect(onSkip).toHaveBeenCalled()
  })
})

// The page's box and header: complete theme, the account pages' box
// (components.account_page) and the page header of components.section_header
describe('CompleteProfile: the theme\'s box and header', () => {
  const flat = (css) => css.replace(/\s+/g, '')
  const page = (theme) => {
    const view = renderWithProviders(<CompleteProfile {...baseProps} />, { theme })
    return { ...view, box: view.container.querySelector('[data-doc-section="profile-completion"]') }
  }

  it('complete theme: the account page\'s padding and width, no 760px box', () => {
    const theme = themeWithValues((values) => {
      values.components.account_page.base = { width: 60, padding_top: 21, padding_bottom: 43 }
      return values
    })
    const css = flat(cssFor(page(theme).box))
    expect(css).toMatch(/padding:21px\d+px43px/)
    expect(css).toMatch(/@media\(min-width:769px\)\{[^}]*width:60%/)
    expect(css).toContain('max-width:none')
  })

  it('the reading column is 95ch wide at most (no fixed px)', () => {
    const css = flat(cssFor(page(themeWithValues()).box))
    expect(css).toContain('max-width:min(100%,95ch)')
    expect(css).not.toContain('760px')
  })

  it('complete theme: one h1, the page title of section_header, its description under it', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.variants.page.title = { size: 37, line: 1.11, weight: 700 }
      values.components.section_header.base.description = { size: 15, line: 1.4, weight: 400 }
      values.components.section_header.base.description_color = '#1A2B3C'
      return values
    })
    const { getAllByRole } = page(theme)
    const titles = getAllByRole('heading', { level: 1 })
    expect(titles).toHaveLength(1)
    const css = flat(injectedCss())
    expect(css).toMatch(/h1\{[^}]*font-size:37px;line-height:1\.11;font-weight:700;/)
    expect(css).toMatch(/p\{[^}]*font-size:15px;line-height:1\.4;font-weight:400;[^}]*color:#1A2B3C;/)
  })
})
