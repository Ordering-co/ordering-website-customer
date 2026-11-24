import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserDetails } from '../index'

const toggleIsEdit = vi.fn()
const cleanFormState = vi.fn()

vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      isEdit={false}
      cartStatus={0}
      formState={formStateFixture}
      validationFields={validationFieldsFixture}
      userState={{ loading: false }}
      userData={userFixture}
      toggleIsEdit={toggleIsEdit}
      cleanFormState={cleanFormState}
      handleSendVerifyCode={vi.fn()}
      verifyPhoneState={{ result: null }}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => <form data-testid='user-form' />
}))
vi.mock('~ui/hooks/useCountdownTimer', () => ({
  useCountdownTimer: () => [60, vi.fn(), vi.fn()]
}))

const theme = themeWithValues()

// CSS of an element's generated class (the title row also has 'user-form').
const cssOfStyled = (el) => {
  const clone = el.cloneNode()
  clone.className = [...el.classList].filter((c) => c !== 'user-form').join(' ')
  return cssFor(clone)
}
const LINK = 'Change customer details'

describe('customer details in the checkouts', () => {
  it('the edit action is an icon button of the title row, not the text link', () => {
    toggleIsEdit.mockClear()
    const { container, getByLabelText, queryByText } = renderWithProviders(<UserDetails isCheckoutSection />, { theme })
    const edit = getByLabelText(LINK)
    expect(edit.tagName).toBe('BUTTON')
    expect(edit).toHaveAttribute('type', 'button')
    expect(edit).toHaveAttribute('data-doc-control', 'checkout-customer-edit')
    // in the row of the title (an h2 of the checkout's h1), at its end
    expect(edit.parentElement.querySelector('h2')).toHaveTextContent('Customer Details')
    expect(edit.parentElement.lastElementChild).toBe(edit)
    expect(edit.querySelector('svg.lucide-pencil')).toBeInTheDocument()
    expect(queryByText(LINK)).toBeNull()
    expect(container.querySelector('[data-doc-control="checkout-customer-cancel"]')).toBeNull()
    fireEvent.click(edit)
    expect(toggleIsEdit).toHaveBeenCalledTimes(1)
  })

  it('the title row and the lines take the section\'s look', () => {
    const { getByLabelText, getByText } = renderWithProviders(<UserDetails isCheckoutSection />, { theme })
    expect(cssOfStyled(getByLabelText(LINK).parentElement)).toContain('margin-bottom:8px')
    // the lines: body text without margins, the name in bold
    const data = getByText(/Jane/).parentElement
    const css = cssFor(data)
    expect(css).toMatch(/ > \*\{margin:0;\}/)
    expect(css).toMatch(/ p\{font-family:[^;]+;font-size:14px;line-height:1\.71;font-weight:400;[^}]*margin:0;\}/)
    expect(css).toMatch(/ \.UserName[^{]*\{font-weight:600;\}/)
    // the phone row: no fixed height, its line without margins
    expect(css).toMatch(/ > div\{height:auto;\}/)
    expect(css).toMatch(/ > div p\{margin:0;/)
  })

  it('the flag of the phone row is centered on its line', () => {
    const { getByText } = renderWithProviders(<UserDetails isCheckoutSection />, { theme })
    const flag = getByText('+12025550123').parentElement.firstElementChild
    const css = cssFor(flag)
    // flex boxes down to the flag, and a block image: no baseline space under it
    expect(css).toMatch(/ \.PhoneInput,\.[^ ]+ \.PhoneInputCountry\{[^}]*display:flex;[^}]*align-items:center;\}/)
    expect(css).toMatch(/ \.PhoneInputCountryIconImg\{display:block;width:100%;height:auto;/)
  })

  it('without a cart that can change, there is no edit action', () => {
    const { queryByLabelText } = renderWithProviders(<UserDetails isCheckoutSection cartStatus={2} />, { theme })
    expect(queryByLabelText(LINK)).toBeNull()
  })

  it('while editing, the cancel action is the same icon button and leaves the form', () => {
    toggleIsEdit.mockClear()
    cleanFormState.mockClear()
    const { getByLabelText, getByTestId, queryByLabelText } = renderWithProviders(<UserDetails isCheckoutSection isEdit />, { theme })
    expect(getByTestId('user-form')).toBeInTheDocument()
    expect(queryByLabelText(LINK)).toBeNull()
    const cancel = getByLabelText('Cancel')
    expect(cancel.tagName).toBe('BUTTON')
    expect(cancel).toHaveAttribute('data-doc-control', 'checkout-customer-cancel')
    expect(cancel.parentElement.querySelector('h2')).toBeInTheDocument()
    expect(cancel.querySelector('svg.lucide-x')).toBeInTheDocument()
    // the form starts at the title row's gap
    expect(cssFor(getByTestId('user-form').parentElement)).toContain('margin-top:0;')
    fireEvent.click(cancel)
    expect(toggleIsEdit).toHaveBeenCalledTimes(1)
    expect(cleanFormState).toHaveBeenCalledWith({ changes: {} })
  })
})

describe('implementation notes round 4: the step card\'s collapsed summary', () => {
  const CollapsedSummaryStub = ({ userData }) => <div data-testid='collapsed-summary'>{userData?.name}</div>

  it('read mode: hideSectionHeading drops the heading text; CollapsedSummaryComponent replaces the read-mode lines entirely', () => {
    const { queryByText, getByTestId, getByLabelText } = renderWithProviders(
      <UserDetails isCheckoutSection hideSectionHeading CollapsedSummaryComponent={CollapsedSummaryStub} />,
      { theme }
    )
    // the step card already shows its own heading — this section's is gone
    expect(queryByText('Customer Details')).toBeNull()
    // the usual read-mode lines (UserData) are gone too, replaced by the stub
    expect(queryByText(LINK)).toBeNull()
    const summary = getByTestId('collapsed-summary')
    expect(summary).toHaveTextContent(userFixture.name)
    // "Edit" lives in the step card's own header now, not here — but the
    // read mode's pencil (the only other control this section could offer)
    // is gone too, since the stub replaces the whole row
    expect(() => getByLabelText('Change customer details')).toThrow()
  })

  // round 5: the step card's header carries "Cancel" (its own X, alone on
  // a row of its own, is gone); cancelEditNudge leaves the form as the X did
  it('edit mode: hideSectionHeading drops the whole title row, X included; each new cancelEditNudge leaves the form', () => {
    toggleIsEdit.mockClear()
    cleanFormState.mockClear()
    const { queryByText, queryByLabelText, getByTestId, rerender } = renderWithProviders(
      <UserDetails isCheckoutSection isEdit hideSectionHeading cancelEditNudge={0} CollapsedSummaryComponent={CollapsedSummaryStub} />,
      { theme }
    )
    expect(queryByText('Customer Details')).toBeNull()
    expect(getByTestId('user-form')).toBeInTheDocument()
    expect(queryByLabelText('Cancel')).toBeNull()
    expect(toggleIsEdit).not.toHaveBeenCalled()
    rerender(<UserDetails isCheckoutSection isEdit hideSectionHeading cancelEditNudge={1} CollapsedSummaryComponent={CollapsedSummaryStub} />)
    expect(toggleIsEdit).toHaveBeenCalledTimes(1)
    expect(cleanFormState).toHaveBeenCalledWith({ changes: {} })
  })

  // round 5 review: the guest's "Log in / Sign up for faster checkout"
  // (BelowTitleComponent) stay under the collapsed line too
  it('collapsed: BelowTitleComponent still renders under the collapsed line (isEdit false)', () => {
    const Below = ({ isEdit }) => <div data-testid='below'>{String(isEdit)}</div>
    const { getByTestId } = renderWithProviders(
      <UserDetails isCheckoutSection hideSectionHeading CollapsedSummaryComponent={CollapsedSummaryStub} BelowTitleComponent={Below} />,
      { theme }
    )
    const summary = getByTestId('collapsed-summary')
    const below = getByTestId('below')
    expect(below).toHaveTextContent('false')
    // eslint-disable-next-line no-bitwise
    expect(summary.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('read mode: a cancelEditNudge never toggles a closed form open', () => {
    toggleIsEdit.mockClear()
    const { rerender } = renderWithProviders(<UserDetails isCheckoutSection hideSectionHeading cancelEditNudge={0} />, { theme })
    rerender(<UserDetails isCheckoutSection hideSectionHeading cancelEditNudge={1} />)
    expect(toggleIsEdit).not.toHaveBeenCalled()
  })

  it('without the props, nothing changes (default checkout usage keeps its heading and read mode)', () => {
    const { getByText, queryByTestId } = renderWithProviders(<UserDetails isCheckoutSection />, { theme })
    expect(getByText('Customer Details')).toBeInTheDocument()
    expect(queryByTestId('collapsed-summary')).toBeNull()
  })
})

describe('customer details elsewhere', () => {
  it('out of the checkouts (reservation, customer modal) keeps the text link, a button of components.link', () => {
    const { container, getByText } = renderWithProviders(<UserDetails />, { theme })
    expect(getByText(LINK).tagName).toBe('BUTTON')
    expect(getByText(LINK)).toHaveAttribute('type', 'button')
    expect(container.querySelector('[data-doc-control^="checkout-customer"]')).toBeNull()
  })

  it('the modal of the customer mode keeps its header in', () => {
    const { container, getByText } = renderWithProviders(<UserDetails isCheckoutSection isModal />, { theme })
    expect(getByText(LINK).tagName).toBe('BUTTON')
    expect(container.querySelector('[data-doc-control^="checkout-customer"]')).toBeNull()
  })
})
