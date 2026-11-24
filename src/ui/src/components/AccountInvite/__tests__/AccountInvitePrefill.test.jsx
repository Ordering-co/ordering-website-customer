import React, { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { AccountInvite } from '../index'

// The real sign-up controller and form behind the invitation (AccountInvite.test.jsx mocks them): what the
// guest gave at checkout must be in the sign-up fields when "Create account" opens them.
const mocks = vi.hoisted(() => ({ session: null, save: vi.fn() }))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.session, { login: vi.fn() }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { verification_phone_required: { value: '1' } } }]
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{
    loading: false,
    fields: {
      checkout: {
        name: { id: 1, code: 'name', name: 'Name', type: 'text', enabled: true, required: true },
        lastname: { id: 2, code: 'lastname', name: 'Lastname', type: 'text', enabled: true, required: true },
        email: { id: 3, code: 'email', name: 'Email', type: 'email', enabled: true, required: true }
      }
    }
  }]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ users: () => ({ save: mocks.save }), root: 'https://api.test' }, {}]
}))
vi.mock('~components/contexts/WebsocketContext', () => ({
  useWebsocket: () => ({ getId: () => 'socket' })
}))
// the setup's parser returns null for every number: this one reads a +1 number
vi.mock('libphonenumber-js', () => {
  const parse = (value) => value ? { country: 'US', countryCallingCode: '1', nationalNumber: String(value).replace(/\D/g, '').slice(-10) } : null
  return { default: parse, parsePhoneNumber: parse }
})
// the setup's phone field ignores its value: this one shows it, as the field does
vi.mock('~ui/src/components/InputPhoneNumber', () => ({
  InputPhoneNumber: ({ value }) => <input data-testid='phone-input' readOnly value={value || ''} />
}))
// the setup's loadable never resolves a lazy chunk: React.lazy does
vi.mock('@loadable/component', async () => {
  const { lazy } = await import('react')
  return { default: (loader) => lazy(() => loader().then((component) => ({ default: component }))) }
})

const guest = { guest_id: 'g-1', name: 'Ana', lastname: 'Torres', guest_email: 'ana.torres@example.com', guest_cellphone: '4155550134', country_phone_code: '1' }

describe('AccountInvite -> sign-up form, prefilled with the guest', () => {
  beforeEach(() => {
    mocks.session = { auth: true, user: { ...guest } }
  })

  it('Create account opens the sign-up with the guest\'s name, email and phone in its fields', async () => {
    renderWithProviders(<Suspense fallback={null}><AccountInvite entry='confirmation' open onClose={vi.fn()} /></Suspense>)
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(document.querySelector('input[name=email]')).toBeInTheDocument())
    await waitFor(() => expect(document.querySelector('input[name=email]')).toHaveValue('ana.torres@example.com'))
    expect(document.querySelector('input[name=name]')).toHaveValue('Ana')
    expect(document.querySelector('input[name=lastname]')).toHaveValue('Torres')
    expect(screen.getByTestId('phone-input')).toHaveValue('+14155550134')
  })
})
