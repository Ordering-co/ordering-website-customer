import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { UserProfileForm } from '../index'

// /profile?view=notifications: the profile form with the real notification
// settings (its controller stubbed)
vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      isEdit={false}
      formState={{ ...formStateFixture, changes: {} }}
      validationFields={validationFieldsFixture}
      userData={userFixture}
      user={userFixture}
      toggleIsEdit={vi.fn()}
      handleButtonUpdateClick={vi.fn()}
      handleChangeNotifications={vi.fn()}
      handlechangeImage={vi.fn()}
      handleSendOtp={vi.fn()}
      verifyPhoneState={{ result: null }}
      setFormState={vi.fn()}
      cleanFormState={vi.fn()}
      isHiddenAddress={false}
      isRequiredField={() => false}
      showField={() => true}
      {...rest}
    />
  )
}))
vi.mock('react-hook-form', () => ({
  useForm: () => ({ register: () => null, handleSubmit: (fn) => fn, errors: {}, formState: { errors: {} } })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/components/StudentsList', () => ({ StudentsList: () => null }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

const renderPage = (theme, view = 'notifications') => renderWithProviders(<UserProfileForm view={view} />, { theme })
const pageBox = ({ container }) => container.querySelector('[data-doc-section="user-profile"]')
// the settings' column (SideForm): its generated class's CSS (it also has 'user-form')
const sideFormOf = (box) => box.querySelector('.user-form')
const sideFormCss = (el) => {
  const clone = el.cloneNode(false)
  clone.className = [...el.classList].filter((c) => c !== 'user-form').join(' ')
  return cssFor(clone)
}

// The outline: one h1 (the page's title), no other heading (the settings are
// a named group of labelled switches, not a section of their own)
const expectOutline = ({ getAllByRole, queryAllByRole }) => {
  const h1 = getAllByRole('heading', { level: 1 })
  expect(h1).toHaveLength(1)
  expect(h1[0]).toHaveTextContent('Notifications')
  ;[2, 3, 4, 5, 6].forEach((level) => expect(queryAllByRole('heading', { level })).toHaveLength(0))
  return h1[0]
}

describe('notifications page', () => {
  it('the h1 of the account pages, the description in the theme\'s muted body text', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.text_muted = '#777778'
      values.tokens.typography.body = { size: 13, line: 1.46, weight: 400 }
      values.tokens.typography.h1 = { size: 31, line: 1.26, weight: 600 }
      return values
    })
    const view = renderPage(theme)
    const h1 = expectOutline(view)
    const css = cssFor(h1.parentElement)
    expect(css).toMatch(/> h1\{[^}]*font-size:31px;/)
    expect(css).toMatch(/> p\{[^}]*font-size:13px;line-height:1\.46;[^}]*color:#777778;/)
    expect(view.getByText('promotional')).toHaveClass('bold')
    expect(view.getByRole('group', { name: 'Marketing Notifications' })).toBeInTheDocument()
    expect(view.getAllByRole('switch')).toHaveLength(3)
    // from the site's name, never the vendor's ("My Site" without one)
    expect(h1.parentElement).toHaveTextContent('notifications you would like to receive from My Site')
  })

  it('the h1 and the description the theme\'s xl over what follows (the gap of the account pages)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.space = { ...values.tokens.space, xl: 19 }
      // the page title (section_header.variants.page) aliases it for its gap, as the API resolves it
      values.components.section_header.variants.page.margin_bottom = 19
      return values
    })
    const view = renderPage(theme)
    const css = cssFor(pageBox(view))
    expect(css).toMatch(/> ?h1\{[^}]*margin:0 0 19px;/)
    expect(css).toMatch(/> ?p\{[^}]*margin:0 0 19px;/)
  })

  it('the same page box as the saved addresses (no 70% column), its content the whole box', () => {
    const theme = themeWithValues()
    const addresses = renderPage(theme, 'savedPlaces')
    const addressesBox = pageBox(addresses).className
    addresses.unmount()

    const view = renderPage(theme)
    const box = pageBox(view)
    // same rules (styled-components gives equal rules the same class)
    expect(box.className).toBe(addressesBox)
    expect(cssFor(box)).not.toContain('70%')
    // the settings' wrappers drop the 70% column and the space under it
    const sideForm = sideFormOf(box)
    expect(sideFormCss(sideForm).replace(/\s+/g, '')).toMatch(/\.([\w-]+)\.\1\{width:100%;/)
    expect(sideForm.parentElement).toHaveStyle({ width: '100%', marginTop: '0px', marginBottom: '0px' })
    // the account keeps its centered column
    view.unmount()
    const account = renderPage(theme, 'account')
    expect(cssFor(pageBox(account))).toContain('70%')
  })
})
