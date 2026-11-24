import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CardForm } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { stripeElementOptions } from '../../../design-system/lib/sdkStyle'

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: ({ options }) => <div data-testid='card-element' data-options={JSON.stringify(options)} />,
  CardNumberElement: ({ id, options }) => <div data-testid='card-number' id={id} data-options={JSON.stringify(options)} />,
  CardExpiryElement: ({ id, options }) => <div data-testid='card-expiry' id={id} data-options={JSON.stringify(options)} />,
  CardCvcElement: ({ id, options }) => <div data-testid='card-cvc' id={id} data-options={JSON.stringify(options)} />
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { card: { zipcode: { enabled: true, required: false } } } }]
}))

vi.mock('~components/components/StripeElementsForm/CardForm', () => ({
  CardForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      error={null}
      errorExpiry={null}
      errorCvc={null}
      loading={false}
      handleSubmit={(e) => e?.preventDefault?.()}
      handleChange={vi.fn()}
      isSplitForm
      handleChangeExpiry={vi.fn()}
      handleChangeCvc={vi.fn()}
      errorZipcode={null}
      {...rest}
    />
  )
}))

describe('CardForm', () => {
  it('renders split card form fields', () => {
    const { getByText, getByTestId } = renderWithProviders(<CardForm />)
    expect(getByTestId('card-number')).toBeInTheDocument()
    expect(getByText('Add card')).toBeInTheDocument()
  })

  it('each label names its field (the Element\'s box, the zipcode input)', () => {
    const { getByText, getByTestId, getByLabelText } = renderWithProviders(<CardForm />)
    const pairs = [['Card number', 'card-number'], ['Expire date', 'card-expiry'], ['CVC', 'card-cvc']]
    pairs.forEach(([label, testId]) => {
      const id = getByTestId(testId).id
      expect(id).toBeTruthy()
      expect(getByText(label)).toHaveAttribute('for', id)
    })
    const zipcode = getByLabelText('Zipcode')
    expect(zipcode.tagName).toBe('INPUT')
    expect(zipcode).not.toHaveAttribute('options')
  })

  it('each Stripe element sits in the box of an SdkField, with the theme\'s options', () => {
    const theme = themeWithValues()
    const { getByTestId } = renderWithProviders(<CardForm />, { theme })
    ;['card-number', 'card-expiry', 'card-cvc'].forEach((testId) => {
      const element = getByTestId(testId)
      expect(element.parentElement).toHaveAttribute('data-slot', 'sdk-field-box')
      expect(element.parentElement.parentElement).toHaveAttribute('data-slot', 'sdk-field')
      expect(JSON.parse(element.dataset.options)).toEqual(JSON.parse(JSON.stringify(stripeElementOptions(theme))))
    })
  })

  it('an error marks its field invalid and is announced under it', () => {
    const { getByTestId, getAllByRole } = renderWithProviders(<CardForm error='Your card number is incomplete.' errorCvc='The CVC is incomplete.' />)
    expect(getByTestId('card-number').parentElement).toHaveAttribute('data-invalid')
    expect(getByTestId('card-expiry').parentElement).not.toHaveAttribute('data-invalid')
    expect(getByTestId('card-cvc').parentElement).toHaveAttribute('data-invalid')
    expect(getAllByRole('alert').map((alert) => alert.textContent)).toEqual(['Your card number is incomplete.', 'The CVC is incomplete.'])
  })

  it('the single card element (no split form) is also a field box', () => {
    const { getByTestId } = renderWithProviders(<CardForm isSplitForm={false} />)
    expect(getByTestId('card-element').parentElement).toHaveAttribute('data-slot', 'sdk-field-box')
  })

  it('draws the zipcode and the submit with the base pieces and keeps their behavior', () => {
    const { getByText, getByLabelText } = renderWithProviders(<CardForm />)
    const zipcode = getByLabelText('Zipcode')
    expect(zipcode).toHaveAttribute('data-slot', 'input')
    expect(zipcode).toHaveAttribute('name', 'zipcode')
    expect(zipcode).not.toHaveAttribute('aria-invalid')
    const submit = getByText('Add card').closest('button')
    expect(submit).toHaveAttribute('data-slot', 'button')
    expect(submit).toHaveAttribute('type', 'submit')
    expect(submit).not.toBeDisabled()
  })

  it('keeps the text and the disabled submit while it loads', () => {
    const { getByText } = renderWithProviders(<CardForm loading />)
    const submit = getByText('Loading...').closest('button')
    expect(submit).toHaveAttribute('data-slot', 'button')
    expect(submit).toBeDisabled()
  })
})
