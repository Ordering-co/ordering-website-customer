import React from 'react'
import { Route } from 'react-router-dom'
import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { QueryLoginSpoonity } from '../index'

const emit = vi.fn()
const setStateValues = vi.fn()
const controllerMounted = vi.fn()

const { session } = vi.hoisted(() => ({ session: { auth: null, listeners: new Set() } }))

vi.mock('~components/components/QueryLoginSpoonity', () => ({
  QueryLoginSpoonity: ({ UIComponent, ...rest }) => {
    controllerMounted()
    return (
      <UIComponent
        {...rest}
        userState={{ loading: false }}
        authModalOpen
        setAuthModalOpen={() => {}}
        modalPageToShow='login'
        setModalPageToShow={() => {}}
      />
    )
  }
}))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => [{ root: 'https://api.test' }] }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{}, { setStateValues }] }))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/SessionContext', async () => {
  const React = await import('react')
  return {
    useSession: () => {
      const [, rerender] = React.useReducer((n) => n + 1, 0)
      React.useEffect(() => {
        session.listeners.add(rerender)
        return () => session.listeners.delete(rerender)
      }, [])
      const login = ({ token }) => {
        session.auth = token
        session.listeners.forEach((l) => l())
      }
      return [{ auth: session.auth }, { login }]
    }
  }
})
vi.mock('~components/contexts/EventContext', () => ({ useEvent: () => [{ emit }] }))
vi.mock('~components/contexts/SiteContext', () => ({
  useSite: () => [{ site: { business_url_template: '/store/:business_slug' } }]
}))
vi.mock('~ui/src/components/SpinnerLoader', () => ({ SpinnerLoader: () => <div data-testid='spinner' /> }))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: ({ handleSuccessLogin }) => (
    <div data-testid='login-form'>
      <button type='button' onClick={() => handleSuccessLogin({ id: 1 })}>success-login</button>
    </div>
  )
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

const START = '/order?integration_code=spoonity&integration_token=t&lat=1&lng=2'
const DESTINATION = '/order?lat=1&lng=2'

let current
const Probe = () => <Route render={({ location }) => { current = `${location.pathname}${location.search}`; return null }} />
const renderIt = (props = { destination: '/order' }) =>
  renderWithProviders(<><Probe /><QueryLoginSpoonity token='t' {...props} /></>, { initialEntries: [START] })

const mockToken = (body) => vi.fn().mockResolvedValue({ json: async () => body })

describe('QueryLoginSpoonity con destination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.auth = null
    current = undefined
  })
  afterEach(() => vi.unstubAllGlobals())

  it('token válido: navega al destino sin credenciales, guarda la ubicación y no emite business', async () => {
    const fetchMock = mockToken({ error: false, result: { session: { access_token: 'tok' } } })
    vi.stubGlobal('fetch', fetchMock)
    renderIt()
    await waitFor(() => expect(current).toBe(DESTINATION))
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/auth/spoonity', {
      // idéntica a la del controlador del submódulo (src/@/components/src/components/QueryLoginSpoonity)
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spoonity_token: 't' })
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(session.auth).toBe('tok')
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
    expect(setStateValues).toHaveBeenCalledWith({ location: { lat: '1', lng: '2' } })
    expect(emit).not.toHaveBeenCalled()
    expect(controllerMounted).not.toHaveBeenCalled()
  })

  it('token rechazado: muestra el login y el login manual navega al mismo destino', async () => {
    vi.stubGlobal('fetch', mockToken({ error: true, result: ['bad token'] }))
    const { findByRole } = renderIt()
    const dialog = await findByRole('dialog')
    expect(current).toBe(START)
    await act(async () => {
      fireEvent.click(within(dialog).getByText('success-login'))
      // el login de LoginForm real llama a useSession().login; aquí lo simula la sesión mockeada
      session.auth = 'tok'
      session.listeners.forEach((l) => l())
    })
    await waitFor(() => expect(current).toBe(DESTINATION))
    expect(setStateValues).toHaveBeenCalledWith({ location: { lat: '1', lng: '2' } })
    expect(emit).not.toHaveBeenCalled()
  })

  it('cerrar el diálogo navega al mismo destino sin emitir business', async () => {
    vi.stubGlobal('fetch', mockToken({ error: true, result: ['bad token'] }))
    const { findByRole } = renderIt()
    fireEvent.click(within(await findByRole('dialog')).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(current).toBe(DESTINATION))
    expect(emit).not.toHaveBeenCalled()
  })

  it('sin destination usa el controlador del submódulo y no navega (comportamiento actual)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.history.pushState({}, '', '/store/demo-store')
    const { findByRole } = renderIt({})
    expect(controllerMounted).toHaveBeenCalled()
    fireEvent.click(within(await findByRole('dialog')).getByRole('button', { name: 'Close' }))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'demo-store' } })
    expect(current).toBe(START)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
