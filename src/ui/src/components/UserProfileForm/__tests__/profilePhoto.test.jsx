import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { useSession } from '~components/contexts/SessionContext'
import { UserProfileForm } from '../index'

// /profile (view account): the photo, a section of the profile page the
// theme may hide (pages.profile profile_photo), of components.profile_photo
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

const renderProfile = (theme) => renderWithProviders(<UserProfileForm view='account' />, { theme })
const photoOf = ({ container }) => container.querySelector('[data-doc-control="profile-photo"]')
const flat = (el) => cssFor(el).replace(/\s+/g, '')

const hidden = () => themeWithValues((values) => ({
  ...values,
  pages: { ...values.pages, profile: { ...values.pages.profile, sections: [{ key: 'profile_photo', visible: false }] } }
}))

const PHOTO = { size: 90, radius: 6, text: { size: 19, line: 1.42, weight: 700 }, text_color: '#0B0C0D', placeholder_icon_size: 33 }
const themed = (mutate = (values) => values) => themeWithValues((values) => {
  values.components.profile_photo.base = { ...values.components.profile_photo.base, ...PHOTO }
  return mutate(values)
})

describe('/profile: the photo section (pages.profile)', () => {
  it('shown by default, hidden by the theme (the form stays)', () => {
    expect(photoOf(renderProfile(themeWithValues()))).not.toBeNull()
    const view = renderProfile(hidden())
    expect(photoOf(view)).toBeNull()
    expect(view.container.querySelector('.user-form')).not.toBeNull()
  })
})

describe('/profile: components.profile_photo', () => {
  it('the photo\'s size and radius, the placeholder icon, the message\'s text and color', () => {
    const view = renderProfile(themed())
    const photo = photoOf(view)
    const image = photo.querySelector('p').nextElementSibling
    expect(image).toHaveStyle({ width: '90px', height: '90px', borderRadius: '6px' })
    expect(flat(image)).toMatch(/svg\{width:33px;height:33px;/)
    // (the card's own class, not its user-image one)
    const own = Array.from(photo.classList).find((c) => !c.includes('sc-') && c !== 'user-image')
    const photoCss = injectedCss().split('}').filter((rule) => rule.includes(`.${own}`)).join('}').replace(/\s+/g, '')
    expect(photoCss).toMatch(/>p\{(?:font-family:[^;]*;)?font-size:19px;line-height:1\.42;font-weight:700;color:#0B0C0D;/)
  })

  it('the pencil is a button of the edit slot that opens the file picker', () => {
    const theme = themed((values) => {
      values.components.profile_photo.slots.edit = { component: 'button', size: 'sm', appearance: 'solid', color: 'primary', shape: 'icon' }
      return values
    })
    const view = renderProfile(theme)
    const button = view.getByRole('button', { name: 'Change profile photo' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.style.getPropertyValue('--ui-button-background')).toBe(theme.values.components.button.variants.primary.solid.background)
    expect(button.style.getPropertyValue('--ui-button-height')).toBe(`${theme.values.components.button.sizes.sm.height}px`)
    const input = view.container.querySelector('input[type="file"]')
    const click = vi.spyOn(input, 'click')
    fireEvent.click(button)
    expect(click).toHaveBeenCalled()
  })

  it('a ghost neutral icon button', () => {
    const theme = themeWithValues()
    const button = renderProfile(theme).getByRole('button', { name: 'Change profile photo' })
    const ghost = theme.values.components.button.variants.neutral.ghost
    expect(button.style.getPropertyValue('--ui-button-color')).toBe(ghost.color)
  })

  it('the card\'s spaces from the theme (lg inside, xl to the form)', () => {
    const theme = themeWithValues()
    const { lg, xl } = theme.values.tokens.space
    const photo = photoOf(renderProfile(theme))
    const own = Array.from(photo.classList).find((c) => !c.includes('sc-') && c !== 'user-image')
    const photoCss = injectedCss().split('}').filter((rule) => rule.includes(`.${own}`)).join('}').replace(/\s+/g, '')
    expect(photoCss).toContain(`margin-bottom:${xl}px;`)
    expect(photoCss).toContain(`>p{margin:${lg}px;`)
    expect(photo.querySelector('p').nextElementSibling).toHaveStyle({ padding: `${lg}px` })
  })
})

describe('/profile: a photo that fails to load', () => {
  // the session's user (the screen's photo) with a photo, for these tests
  const session = useSession()[0]
  let saved
  beforeEach(() => {
    saved = session.user
    session.user = { ...userFixture, ...session.user, photo: 'https://example.test/me.jpg' }
  })
  afterEach(() => { session.user = saved })

  it('the placeholder of the photo (as without one), never the broken image with its alt', () => {
    const view = renderWithProviders(<UserProfileForm view='account' />, { theme: themeWithValues() })
    const photo = photoOf(view)
    const img = photo.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.test/me.jpg')
    expect(img).toHaveAttribute('alt', 'Profile photo')
    fireEvent.error(img)
    expect(photo.querySelector('img')).toBeNull()
    // the base Icon: a decorative svg beside the text
    expect(photo.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(photo).toHaveTextContent('Put your image here')
  })
})
