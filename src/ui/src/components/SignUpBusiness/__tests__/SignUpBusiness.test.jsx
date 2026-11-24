import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from 'react-hook-form'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseSignupUIProps } from '../../__tests__/helpers/authTestUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '../../../design-system/lib/componentVars'

import { SignUpBusiness } from '../index'

const { signupUIPropsRef, mockPagesGet } = vi.hoisted(() => {
  const mockPagesGet = vi.fn()
  return { signupUIPropsRef: { current: null }, mockPagesGet }
})

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
vi.mock('~components/components/SignupForm', () => ({
  SignupForm: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...signupUIPropsRef.current} />
  )
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      verification_phone_required: { value: '0' },
      terms_and_conditions: { value: 'true' }
    }
  }]
}))
vi.mock('~components/contexts/SiteContext', () => ({
  useSite: () => [{ site: { name: 'Mi Marketplace' } }]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ pages: vi.fn(() => ({ get: mockPagesGet })) }]
}))

describe('SignUpBusiness', () => {
  beforeEach(() => {
    signupUIPropsRef.current = { ...baseSignupUIProps }
    mockPagesGet.mockResolvedValue({
      content: { error: null, result: { body: '<p>Business signup content</p>', enabled: true } }
    })
  })

  it('loads business signup content', async () => {
    const { container } = renderWithProviders(<SignUpBusiness />)
    await waitFor(() => {
      expect(container.innerHTML).toContain('Business signup content')
    })
  })

  it('renders signup form when page content is unavailable', async () => {
    mockPagesGet.mockResolvedValue({
      content: { error: true, result: null }
    })
    const { getByText, getByLabelText, getByPlaceholderText } = renderWithProviders(<SignUpBusiness />)
    await waitFor(() => {
      expect(getByText('Sign up now')).toBeInTheDocument()
      expect(getByLabelText('email')).toBeInTheDocument()
      expect(getByPlaceholderText('Password')).toBeInTheDocument()
    })
  })

  it('the description names the site, not a fixed word', async () => {
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const { getByText } = renderWithProviders(<SignUpBusiness />)
    const text = await waitFor(() => getByText(/Register as a new business owner/))
    expect(text).toHaveTextContent('in Mi Marketplace Website')
    expect(text).not.toHaveTextContent('in test Website')
  })

  it('submits business signup form', async () => {
    const handleButtonSignupClick = vi.fn()
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    signupUIPropsRef.current = { ...baseSignupUIProps, handleButtonSignupClick }
    const { container, getByText } = renderWithProviders(<SignUpBusiness />)
    await waitFor(() => expect(getByText('Submit')).toBeInTheDocument())
    fireEvent.submit(container.querySelector('form'))
    expect(handleButtonSignupClick).toHaveBeenCalled()
  })

  it('shows alert on signup error', async () => {
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      formState: { loading: false, result: { error: true, result: ['Business error'] } }
    }
    const { getByTestId } = renderWithProviders(<SignUpBusiness />)
    await waitFor(() => {
      expect(getByTestId('alert')).toHaveTextContent('Please try again')
      expect(getByTestId('alert')).not.toHaveTextContent('Business error')
    })
  })

  it('toggles password visibility', async () => {
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const { getByPlaceholderText, getByLabelText } = renderWithProviders(<SignUpBusiness />)
    await waitFor(() => expect(getByPlaceholderText('Password')).toBeInTheDocument())
    fireEvent.click(getByLabelText('Show password'))
    expect(getByPlaceholderText('Password')).toHaveAttribute('type', 'text')
    expect(getByLabelText('Hide password')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('SignUpBusiness — the background of the page (signup.business_background)', () => {
  const IMAGE = 'https://cdn.test/signup.business_background.jpg'
  const BUNDLED = '/business-signup-background.jpg'
  const withImage = () => themeWithValues((values) => ({ ...values, images: { ...values.images, 'signup.business_background': IMAGE } }))
  const renderForm = async (theme) => {
    signupUIPropsRef.current = { ...baseSignupUIProps }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const view = renderWithProviders(<SignUpBusiness />, { theme })
    await waitFor(() => expect(view.getByText('Sign up now')).toBeInTheDocument())
    const page = view.container.querySelector('[data-doc-section="application-business"]')
    return { ...view, page, band: page.previousElementSibling }
  }
  // The rule of the class that sets background-image, and whether it is
  // inside the 768px media query.
  const backgroundRule = (el) => cssFor(el).split('}').find((rule) => rule.includes('background-image'))

  it('with the image: the theme\'s, with cover from 768px, and the only image of the page', async () => {
    const theme = withImage()
    const { page, container, getByText } = await renderForm(theme)
    const rule = backgroundRule(page)
    expect(rule).toContain('@media (min-width:768px)')
    expect(rule).toContain(`url("${IMAGE}")`)
    expect(rule).toContain('background-size:cover')
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(getByText('Start Selling with us.').previousElementSibling).toBeNull()
  })

  it('without the image: the bundled background, as today', async () => {
    const { page, band } = await renderForm(themeWithValues())
    const rule = backgroundRule(page)
    expect(rule).toContain('@media (min-width:768px)')
    expect(rule).toContain(`url("${BUNDLED}")`)
    expect(band).toHaveAttribute('aria-hidden', 'true')
    expect(cssFor(band)).toContain(`background-image:url("${BUNDLED}")`)
  })

  it('under 768px: no full-page background, a decorative 16:9 band with cover and the form on the page background', async () => {
    const theme = withImage()
    const { page, band } = await renderForm(theme)
    // the page: the background token of the theme, the image only from 768px
    const pageCss = cssFor(page)
    expect(pageCss).toContain(`background-color:${theme.values.tokens.color.background}`)
    expect(pageCss.split('}').filter((rule) => rule.includes('background-image')).every((rule) => rule.includes('@media (min-width:768px)'))).toBe(true)
    // the band: before the page, full width, 16:9, cover, hidden from 768px
    expect(band.nextElementSibling).toBe(page)
    expect(band.tagName).toBe('DIV')
    expect(band).toHaveAttribute('aria-hidden', 'true')
    const bandCss = cssFor(band)
    expect(bandCss).toContain(`background-image:url("${IMAGE}")`)
    expect(bandCss).toContain('width:100%')
    expect(bandCss).toMatch(/aspect-ratio:16 ?\/ ?9/)
    expect(bandCss).toContain('background-size:cover')
    expect(bandCss).toMatch(/@media \(min-width:768px\)\{\.[\w-]+\{display:none;/)
  })
})

describe('SignUpBusiness — sections (pages.signup_business) and components.signup_page', () => {
  const renderPage = async (theme) => {
    signupUIPropsRef.current = { ...baseSignupUIProps }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const view = renderWithProviders(<SignUpBusiness />, { theme })
    await waitFor(() => expect(view.getByText('Sign up now')).toBeInTheDocument())
    const page = view.container.querySelector('[data-doc-section="application-business"]')
    return { ...view, page, band: page.previousElementSibling }
  }
  // The sections in the order of the page
  const order = (page) => [...page.children]
    .map((child) => (child.textContent.includes('Start Selling with us.') ? 'description' : child.querySelector('form') ? 'form' : null))
    .filter(Boolean)
  const withSections = (sections, mutate = (values) => values) => themeWithValues((values) => {
    values.pages.signup_business = { ...values.pages.signup_business, sections }
    return mutate(values)
  })

  it('by default: the band, the description and then the form (also one over the other under 993px: one column in the order of the theme)', async () => {
    const { page, band } = await renderPage(themeWithValues())
    expect(band).not.toBeNull()
    expect(order(page)).toEqual(['description', 'form'])
    // the theme's order, not mirrored
    expect(cssFor(page)).toMatch(/(\.[\w-]+){2}\{[^}]*;flex-direction:column;/)
    expect(cssFor(page)).toMatch(/@media \(min-width:993px\)\{(\.[\w-]+){2}\{[^}]*;flex-direction:row;/)
  })

  it('the theme puts the form first', async () => {
    const { page } = await renderPage(withSections([
      { key: 'background_band', visible: true },
      { key: 'form', visible: true },
      { key: 'description', visible: true }
    ]))
    expect(order(page)).toEqual(['form', 'description'])
  })

  it('the theme hides the band and the description; the form cannot be hidden', async () => {
    const { page, band, queryByText } = await renderPage(withSections([
      { key: 'background_band', visible: false },
      { key: 'description', visible: false },
      { key: 'form', visible: false }
    ]))
    expect(band).toBeNull()
    expect(queryByText('Start Selling with us.')).toBeNull()
    expect(order(page)).toEqual(['form'])
  })

  it('the description has no margin of its own, the container\'s gap separates the sides', async () => {
    const theme = themeWithValues()
    const { page, getByText } = await renderPage(theme)
    expect(cssFor(getByText('Start Selling with us.').parentElement)).toContain('margin:0;')
    const css = cssFor(page)
    expect(css).toContain(`row-gap:${theme.values.tokens.space.xxxl}px;`)
    expect(css).toMatch(/@media \(min-width:993px\)\{[^}]*column-gap:24px;/)
  })

  it('the props of components.signup_page', async () => {
    const theme = themeWithValues((values) => {
      values.components.signup_page.base = {
        ...values.components.signup_page.base,
        description_title_color: '#101010',
        description_title_color_on_page: '#111111',
        description_color: '#202020',
        description_color_on_page: '#222222',
        form_padding: 40,
        padding_y: 60,
        padding_x: 70,
        max_width: 600,
        band_ratio: '4:3'
      }
      // its padding on phones (platforms.mobile_web)
      values.platforms.mobile_web.components.signup_page.base = { padding_y: 10, padding_x: 12 }
      // the form's title: the page title of components.section_header (its color, the base's)
      values.components.section_header.base = { ...values.components.section_header.base, title_color: '#303030' }
      return values
    })
    const { page, band, getByText } = await renderPage(theme)
    expect(cssFor(getByText('Start Selling with us.'))).toContain('color:#101010;')
    expect(cssFor(getByText('Start Selling with us.').nextElementSibling)).toContain('color:#202020;')
    // over the page background (under 768px, or no image): the _on_page colors
    expect(cssFor(getByText('Start Selling with us.'))).toContain('color:#111111;')
    expect(cssFor(getByText('Start Selling with us.').nextElementSibling)).toContain('color:#222222;')
    expect(cssFor(getByText('Sign up now'))).toContain('color:#303030;')
    expect(cssFor(getByText('Sign up now').parentElement)).toContain('padding:40px;')
    const css = cssFor(page)
    // one column (below 993px, tablets too): the phone padding; two
    // columns (from 993px): padding_y / padding_x
    expect(css).toMatch(/\.([\w-]+)\.\1\{[^}]*;flex-direction:column;padding:10px 12px;/)
    expect(css).toMatch(/@media \(min-width:993px\)\{[^}]*padding:60px 70px;/)
    expect(css).not.toMatch(/max-width:575px/)
    expect(css).toContain('max-width:600px;')
    expect(cssFor(band)).toMatch(/aspect-ratio:4 ?\/ ?3;/)
  })
})

describe('SignUpBusiness — the veil of the photo, a lone form, the password field', () => {
  const IMAGE = 'https://cdn.test/signup.business_background.jpg'
  const renderPage = async (mutate = (values) => values) => {
    signupUIPropsRef.current = { ...baseSignupUIProps }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const theme = themeWithValues((values) => mutate({ ...values, images: { ...values.images, 'signup.business_background': IMAGE } }) ?? values)
    const view = renderWithProviders(<SignUpBusiness />, { theme })
    await waitFor(() => expect(view.getByText('Sign up now')).toBeInTheDocument())
    const page = view.container.querySelector('[data-doc-section="application-business"]')
    return { ...view, theme, page }
  }
  const backgroundRule = (el) => cssFor(el).split('}').find((rule) => rule.includes('background-image'))

  it('the description on the photo: the photo takes description_overlay as a veil from 768px', async () => {
    const { page } = await renderPage((values) => {
      values.components.signup_page.base.description_overlay = 'rgba(10,20,30,0.5)'
      return values
    })
    const rule = backgroundRule(page)
    expect(rule).toContain('@media (min-width:768px)')
    expect(rule.replace(/\s+/g, '')).toContain(`background-image:linear-gradient(rgba(10,20,30,0.5),rgba(10,20,30,0.5)),url("${IMAGE}")`)
  })

  it('without the description, or a transparent veil: the photo as it is', async () => {
    const hidden = await renderPage((values) => {
      values.pages.signup_business = { ...values.pages.signup_business, sections: [{ key: 'background_band', visible: true }, { key: 'description', visible: false }, { key: 'form', visible: true }] }
      return values
    })
    expect(backgroundRule(hidden.page)).toContain(`background-image:url("${IMAGE}")`)
    expect(backgroundRule(hidden.page)).not.toContain('linear-gradient')
    hidden.unmount()
    const clear = await renderPage((values) => {
      values.components.signup_page.base.description_overlay = 'rgba(0,0,0,0)'
      return values
    })
    expect(backgroundRule(clear.page)).not.toContain('linear-gradient')
  })

  it('the form alone (no description) takes the whole width up to max_width, centered, also with two columns', async () => {
    const { page } = await renderPage()
    const css = cssFor(page)
    expect(css.slice(css.indexOf('@media (min-width:993px)'))).toMatch(/> ?div:only-child\{width:100%;margin-inline:auto;/)
  })

  it('the password: the eye is the suffix of the base Input, which gives it the room and the icon of components.input', async () => {
    const { getByPlaceholderText, getByLabelText } = await renderPage()
    const password = getByPlaceholderText('Password')
    expect(password).toHaveAttribute('data-slot', 'input')
    const group = password.parentElement
    expect(group).toHaveAttribute('data-slot', 'input-group')
    // the eye is in the Input's suffix (its position at padding_x from the end and its
    // icon size and color are the piece's), not an absolute button of this screen
    const eye = getByLabelText('Show password')
    expect(eye.closest('[data-slot="input-suffix"]')).not.toBeNull()
    expect(group).toContainElement(eye)
    expect(eye).toHaveAttribute('type', 'button')
    expect(eye).toHaveAttribute('data-slot', 'button')
    expect(eye.className).toContain('ui:w-(--ui-button-height)')
    expect(eye).toHaveAttribute('aria-pressed', 'false')
    expect(cssFor(eye)).not.toMatch(/position:absolute/)
  })

  it('autocomplete: email and new-password; the terms checkbox has an id of its own', async () => {
    const { getByLabelText, getByPlaceholderText, container } = await renderPage()
    expect(getByLabelText('email')).toHaveAttribute('autocomplete', 'email')
    expect(getByPlaceholderText('Password')).toHaveAttribute('autocomplete', 'new-password')
    const terms = container.querySelector('input[name="acceptTerms"]')
    expect(terms.id).toBeTruthy()
    expect(terms.id).not.toBe('acceptTerms')
    // the label is the base Checkbox's: the box and its text are one hit area
    expect(terms.closest('label')).toHaveTextContent('Terms & Conditions')
    expect(terms.closest('label').querySelector('[data-slot="checkbox"]')).not.toBeNull()
  })

  it('the description text is a paragraph', async () => {
    const { getByText } = await renderPage()
    expect(getByText('Start Selling with us.').nextElementSibling.tagName).toBe('P')
  })
})

describe('SignUpBusiness — the link to log in (visibility auth.login_link)', () => {
  const renderPage = async (theme, props = {}) => {
    signupUIPropsRef.current = { ...baseSignupUIProps, ...props }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const view = renderWithProviders(<SignUpBusiness />, { theme })
    await waitFor(() => expect(view.getByText('Sign up now')).toBeInTheDocument())
    return view
  }
  const link = <a href='/'>Login</a>

  it('shown under the form with the route\'s link', async () => {
    const { getByText } = await renderPage(themeWithValues(), { elementLinkToLogin: link })
    expect(getByText('Already have an account?').parentElement).toContainElement(getByText('Login'))
  })

  it('hidden by the theme, or without a link from the route', async () => {
    const hidden = await renderPage(themeWithValues((values) => {
      values.visibility['auth.login_link'] = false
      return values
    }), { elementLinkToLogin: link })
    expect(hidden.queryByText('Already have an account?')).toBeNull()
    hidden.unmount()
    const none = await renderPage(themeWithValues())
    expect(none.queryByText('Already have an account?')).toBeNull()
  })
})

describe('SignUpBusiness — validation errors under their fields', () => {
  afterEach(() => {
    const errors = useForm().errors
    Object.keys(errors).forEach((key) => { delete errors[key] })
  })

  it('a field\'s error is under it, tied to it (aria-describedby, aria-invalid)', async () => {
    Object.assign(useForm().errors, {
      password: { type: 'minLength', message: 'The Password must be at least 8 characters.' },
      acceptTerms: { type: 'required', message: 'You must accept the Terms & Conditions.' }
    })
    signupUIPropsRef.current = { ...baseSignupUIProps }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const { getByPlaceholderText, container } = renderWithProviders(<SignUpBusiness />, { theme: themeWithValues() })
    await waitFor(() => expect(getByPlaceholderText('Password')).toBeInTheDocument())
    const password = getByPlaceholderText('Password')
    expect(password).toHaveAttribute('aria-invalid', 'true')
    const message = container.querySelector(`#${CSS.escape(password.getAttribute('aria-describedby'))}`)
    expect(message).not.toBeNull()
    expect(message.textContent).toBe('The Password must be at least 8 characters.')
    const terms = container.querySelector('[data-slot="checkbox"]')
    expect(terms).toHaveAttribute('aria-invalid', 'true')
    expect(container.querySelector(`#${CSS.escape(terms.getAttribute('aria-describedby'))}`)).toHaveTextContent('You must accept the Terms & Conditions.')
    // the email has no error: nothing tied to it
    expect(container.querySelector('input[name="email"]')).not.toHaveAttribute('aria-describedby')
  })
})

describe('SignUpBusiness — the controls are the base pieces', () => {
  const renderForm = async (theme = themeWithValues(), props = {}) => {
    signupUIPropsRef.current = { ...baseSignupUIProps, ...props }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
    const view = renderWithProviders(<SignUpBusiness />, { theme })
    await waitFor(() => expect(view.getByText('Sign up now')).toBeInTheDocument())
    return { ...view, theme }
  }
  const submitOf = (view) => view.container.querySelector('[data-doc-control="application-submit"]')
  const withSubmitSlot = (slot) => themeWithValues((values) => {
    values.components.auth_form.slots.submit = { ...values.components.auth_form.slots.submit, ...slot }
    return values
  })

  it('every field is the base Input and the terms box the base Checkbox', async () => {
    const { container } = await renderForm()
    const fields = [...container.querySelectorAll('form input:not([type="checkbox"])')]
    expect(fields.length).toBeGreaterThan(0)
    fields.forEach((field) => expect(field).toHaveAttribute('data-slot', 'input'))
    expect(container.querySelectorAll('form [data-slot="checkbox"]')).toHaveLength(1)
  })

  it('Submit is the base Button: slots.submit (primary solid lg by default) and the full width of the main action', async () => {
    const view = await renderForm()
    const submit = submitOf(view)
    expect(submit).toHaveAttribute('data-slot', 'button')
    expect(submit).toHaveAttribute('type', 'submit')
    const expected = componentVars(view.theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })
    expect(submit.style.getPropertyValue('--ui-button-height')).toBe(expected['--ui-button-height'])
    expect(submit.style.getPropertyValue('--ui-button-background')).toBe(expected['--ui-button-background'])
  })

  it('Submit takes what the store chose for slots.submit (size, color and appearance)', async () => {
    const theme = withSubmitSlot({ size: 'xs', color: 'danger', appearance: 'outline' })
    const view = await renderForm(theme)
    const submit = submitOf(view)
    const chosen = componentVars(theme, 'button', { size: 'xs', color: 'danger', appearance: 'outline' })
    const byDefault = componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })
    expect(chosen['--ui-button-height']).not.toBe(byDefault['--ui-button-height'])
    expect(chosen['--ui-button-color']).not.toBe(byDefault['--ui-button-color'])
    ;['--ui-button-height', '--ui-button-color', '--ui-button-border'].forEach((name) => {
      expect(submit.style.getPropertyValue(name)).toBe(chosen[name])
    })
  })

  it('Submit is busy while the form sends (aria-busy, spinner, no new click) and keeps its label', async () => {
    const view = await renderForm(themeWithValues(), { formState: { loading: true, result: null } })
    const submit = submitOf(view)
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(submit).toHaveAttribute('data-loading')
    expect(submit.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    expect(submit).toHaveTextContent('Submit')
  })

  it('Submit is disabled, not busy, while the fields load', async () => {
    const view = await renderForm(themeWithValues(), { validationFields: { ...baseSignupUIProps.validationFields, loading: true } })
    const submit = submitOf(view)
    expect(submit).toBeDisabled()
    expect(submit).not.toHaveAttribute('aria-busy')
  })
})
