import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { THEME_IMAGE_DEFAULTS } from '../../../../../utils/bundledImages'
import { SignUpApproval } from '../index'

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))

const baseProps = {
  content: {
    project: 'demo',
    dashboardUrl: 'https://dashboard.example.com',
    dashboardLoginUrl: 'https://dashboard.example.com/login',
    approvalType: 'automatic',
    businessType: 2,
    contactEmail: 'support@example.com'
  },
  onAccept: vi.fn(),
  onCancel: vi.fn()
}

describe('SignUpApproval', () => {
  it('renders automatic business approval content', () => {
    const { getByText } = renderWithProviders(<SignUpApproval {...baseProps} />, {
      theme: themeWithValues()
    })

    expect(getByText(/Get in our Dashboard/)).toBeInTheDocument()
    expect(getByText('(demo)')).toBeInTheDocument()
  })

  it('one action: Accept closes it (no Cancel doing the same)', () => {
    const onAccept = vi.fn()
    const { getByText, queryByText, getAllByRole } = renderWithProviders(
      <SignUpApproval {...baseProps} onAccept={onAccept} />,
      {
        theme: themeWithValues()
      }
    )

    expect(queryByText('Cancel')).toBeNull()
    expect(getAllByRole('button')).toHaveLength(1)
    fireEvent.click(getByText('Accept'))
    expect(onAccept).toHaveBeenCalled()
  })

  it('Accept is the base Button (primary, md): the one action, the full width the theme gives a main action', () => {
    const accept = (theme) => {
      const { getByRole, unmount } = renderWithProviders(<SignUpApproval {...baseProps} />, { theme })
      const button = getByRole('button')
      return { button, unmount }
    }
    const resting = accept(themeWithValues())
    expect(resting.button).toHaveAttribute('data-slot', 'button')
    expect(resting.button).toHaveAttribute('type', 'button')
    expect(resting.button).toHaveTextContent('Accept')
    expect(resting.button.className).not.toContain('ui:w-full')
    resting.unmount()
    const full = accept(themeWithValues((values) => {
      values.components.button.base.cta_full_width = true
      return values
    }))
    expect(full.button.className).toContain('ui:w-full')
  })

  it('the project and the dashboard: a description list, no table', () => {
    const { container } = renderWithProviders(<SignUpApproval {...baseProps} />, { theme: themeWithValues() })
    expect(container.querySelector('table')).toBeNull()
    const terms = [...container.querySelectorAll('dl > dt')].map((dt) => dt.textContent)
    expect(terms).toEqual(['Project:', 'Dashboard webpage:'])
    expect(container.querySelectorAll('dl > dd')).toHaveLength(2)
    expect(container.querySelector('.green-text')).toBeNull()
  })

  it('the description: the body_lg text, long words break where they must; the spaces of the theme', () => {
    const theme = themeWithValues()
    const { getByText, container } = renderWithProviders(<SignUpApproval {...baseProps} />, { theme })
    const css = cssFor(getByText(/Get in our Dashboard/)).replace(/\s+/g, '')
    const bodyLg = theme.values.tokens.typography.body_lg
    expect(css).toContain(`font-size:${bodyLg.size}px;`)
    expect(css).toContain('overflow-wrap:anywhere;')
    expect(css).not.toContain('word-break:break-all')
    expect(css).toContain(`margin-bottom:${theme.values.tokens.space.xs}px;`)
    const list = cssFor(container.querySelector('dl')).replace(/\s+/g, '')
    expect(list).toContain(`column-gap:${theme.values.tokens.space.lg}px;`)
    expect(list).not.toMatch(/35px|20px/)
  })

  describe('the approval image', () => {
    const CASES = [
      [2, 'automatic', 'signup.business_approved'],
      [2, 'manual', 'signup.business_pending'],
      [3, 'automatic', 'signup.driver_approved'],
      [3, 'manual', 'signup.driver_pending']
    ]
    const image = (theme, businessType, approvalType) => {
      const { getByAltText, unmount } = renderWithProviders(
        <SignUpApproval {...baseProps} content={{ ...baseProps.content, businessType, approvalType }} />,
        { theme }
      )
      const img = getByAltText('Congratulations')
      const result = { src: img.getAttribute('src'), css: cssFor(img) }
      unmount()
      return result
    }

    it('each sign-up and approval takes its theme key', () => {
      CASES.forEach(([businessType, approvalType, key]) => {
        const url = `https://cdn.test/${key}.png`
        const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, [key]: url } }))
        expect(image(theme, businessType, approvalType).src).toBe(url)
      })
    })

    it('without the key (an empty one), the bundle image', () => {
      CASES.forEach(([businessType, approvalType, key]) => {
        expect(THEME_IMAGE_DEFAULTS[key]).toBeTruthy()
        expect(image(themeWithValues(), businessType, approvalType).src).toBe(THEME_IMAGE_DEFAULTS[key])
      })
    })

    it('one box for the four (up to 68ch wide, 3:2)', () => {
      const themed = image(themeWithValues(), 2, 'automatic').css
      expect(themed).toMatch(/max-width:\s*min\(100%,\s*68ch\)/)
      expect(themed).toMatch(/aspect-ratio:\s*3\s*\/\s*2/)
      expect(themed).not.toMatch(/395px/)
    })
  })
})

// The state of a pending request: a heading of the content (the
// level under the modal's title) of components.section_header, no offset
describe('SignUpApproval: the pending state\'s heading', () => {
  const pending = (theme, businessType = 2) => renderWithProviders(
    <SignUpApproval {...baseProps} content={{ ...baseProps.content, approvalType: 'manual', businessType }} />,
    { theme }
  )

  it('a heading under the modal\'s, with the section title of the theme and no transform', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.base.title = { size: 27, line: 1.15, weight: 600 }
      return values
    })
    for (const [type, text] of [[2, 'Your store is under approval'], [1, 'Your request to start as a driver is under approval.']]) {
      const { getByRole, unmount } = pending(theme, type)
      const heading = getByRole('heading', { name: text })
      expect(heading.tagName).toBe('H3')
      const css = cssFor(heading).replace(/\s+/g, '')
      expect(css).toContain('font-size:27px;line-height:1.15;font-weight:600;')
      expect(css).not.toContain('transform')
      unmount()
    }
  })
})
