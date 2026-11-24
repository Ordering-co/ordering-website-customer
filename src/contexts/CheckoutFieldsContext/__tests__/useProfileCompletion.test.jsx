import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

import { mockFetch, mockFetchError } from '../../../__tests__/helpers/testUtils'
import { CheckoutFieldsProvider, useProfileCompletion } from '../index'

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useConfig: vi.fn(),
  useApi: vi.fn(),
  useLanguage: vi.fn()
}))

vi.mock('~components/contexts/SessionContext', () => ({ useSession: mocks.useSession }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: mocks.useConfig }))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: mocks.useApi }))
vi.mock('~components/contexts/LanguageContext', () => ({ useLanguage: mocks.useLanguage }))

const field = (code, overrides = {}) => ({
  order_type_id: 1,
  enabled: true,
  required: true,
  validation_field: { code },
  ...overrides
})

const setSession = (session) => mocks.useSession.mockReturnValue([session, { login: vi.fn(), logout: vi.fn() }])
const setConfigs = (configs, loading = false) => mocks.useConfig.mockReturnValue([{ configs, loading }])

const wrapper = ({ children }) => <CheckoutFieldsProvider>{children}</CheckoutFieldsProvider>

describe('useProfileCompletion (web)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useApi.mockReturnValue([{ root: 'https://api.test' }])
    // No language context: nothing to wait for.
    mocks.useLanguage.mockReturnValue([{}])
    setConfigs({ default_order_type: { value: 'delivery' } })
    mockFetch({ error: false, result: [] })
  })

  it('nunca gatea a un invitado y no dispara el fetch', async () => {
    setSession({ auth: true, user: { id: 1, guest_id: 'g1' }, token: 'tok' })
    mockFetch({ error: false, result: [field('name')] })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isRequired).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('no gatea a un usuario no autenticado', async () => {
    setSession({ auth: false, user: null, token: null })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isRequired).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('gatea cuando faltan campos requeridos del default order type', async () => {
    setSession({ auth: true, user: { id: 7 }, token: 'tok' })
    mockFetch({ error: false, result: [field('name'), field('lastname')] })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.isRequired).toBe(true))
    expect(result.current.missingFields).toEqual(['name', 'lastname'])
    const codes = result.current.checkoutFields.map((f) => f?.validation_field?.code)
    expect(codes).toEqual(['name', 'lastname'])
  })

  it('un campo sin configurar en el order type (null, como lo crea la API) toma el del proyecto', async () => {
    setSession({ auth: true, user: { id: 7, name: 'Carlos' }, token: 'tok' })
    mockFetch({
      error: false,
      result: [
        field('name', { enabled: null, required: null, validation_field: { code: 'name', enabled: true, required: true } }),
        field('lastname', { enabled: null, required: null, validation_field: { code: 'lastname', enabled: true, required: true } }),
        field('birthdate', { enabled: null, required: null, validation_field: { code: 'birthdate', enabled: true, required: false } })
      ]
    })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.isRequired).toBe(true))
    expect(result.current.missingFields).toEqual(['lastname'])
  })

  it('no gatea a un usuario con todos los campos completos', async () => {
    setSession({ auth: true, user: { id: 7, name: 'Carlos', lastname: 'Gomez' }, token: 'tok' })
    mockFetch({ error: false, result: [field('name'), field('lastname')] })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isRequired).toBe(false)
    expect(result.current.missingFields).toEqual([])
  })

  it('fail-open: si el fetch falla, no gatea', async () => {
    setSession({ auth: true, user: { id: 7 }, token: 'tok' })
    mockFetchError('network down')

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isRequired).toBe(false)
  })

  it('fail-open: mientras carga, no gatea', async () => {
    setSession({ auth: true, user: { id: 7 }, token: 'tok' })
    global.fetch = vi.fn(() => new Promise(() => {})) // nunca resuelve

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(true))
    expect(result.current.isRequired).toBe(false)
  })

  it('skip() desactiva el gate en la sesión actual', async () => {
    setSession({ auth: true, user: { id: 7 }, token: 'tok' })
    mockFetch({ error: false, result: [field('name')] })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.isRequired).toBe(true))
    act(() => { result.current.skip() })
    await waitFor(() => expect(result.current.isRequired).toBe(false))
  })

  it('canSkip refleja el flag profile_completion_skip_enabled', async () => {
    setSession({ auth: true, user: { id: 7 }, token: 'tok' })
    setConfigs({ default_order_type: { value: 'delivery' }, profile_completion_skip_enabled: { value: '1' } })
    mockFetch({ error: false, result: [field('name')] })

    const { result } = renderHook(() => useProfileCompletion(), { wrapper })

    await waitFor(() => expect(result.current.canSkip).toBe(true))
  })

  describe('el idioma de la API', () => {
    const setApi = (language) => mocks.useApi.mockReturnValue([{ root: `https://api.test/v400/${language}/p`, language }])
    const setLanguage = (languageState) => mocks.useLanguage.mockReturnValue([languageState])

    it('pide una sola vez, ya en el idioma resuelto (arranca en en, pasa a es)', async () => {
      setSession({ auth: true, user: { id: 7 }, token: 'tok' })
      setApi('en')
      setLanguage({ loading: true })
      const { result, rerender } = renderHook(() => useProfileCompletion(), { wrapper })
      // Sin idioma resuelto: no pide y sigue cargando (no gatea).
      expect(result.current.loading).toBe(true)
      expect(result.current.isRequired).toBe(false)

      // El contexto resuelve es; el SDK todavía pregunta en en.
      setLanguage({ loading: true, language: { code: 'es' } })
      rerender()
      expect(global.fetch).not.toHaveBeenCalled()

      // El SDK pasa a es: una petición, en es.
      setApi('es')
      rerender()
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch.mock.calls[0][0]).toBe('https://api.test/v400/es/p/validation_field_order_types')
    })

    it('con el idioma de config igual al resuelto, pide una vez', async () => {
      setSession({ auth: true, user: { id: 7 }, token: 'tok' })
      setApi('en')
      setLanguage({ loading: true, language: { code: 'en' } })
      const { result } = renderHook(() => useProfileCompletion(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('si no se resuelve ningún idioma, pide al terminar de cargar', async () => {
      setSession({ auth: true, user: { id: 7 }, token: 'tok' })
      setApi('en')
      setLanguage({ loading: true })
      const { result, rerender } = renderHook(() => useProfileCompletion(), { wrapper })
      expect(global.fetch).not.toHaveBeenCalled()
      setLanguage({ loading: false })
      rerender()
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('al cambiar de idioma vuelve a pedir, en el nuevo', async () => {
      setSession({ auth: true, user: { id: 7 }, token: 'tok' })
      setApi('es')
      setLanguage({ loading: false, language: { code: 'es' } })
      const { result, rerender } = renderHook(() => useProfileCompletion(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))
      setLanguage({ loading: true, language: { code: 'fr' } })
      rerender()
      setApi('fr')
      rerender()
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
      expect(global.fetch.mock.calls[1][0]).toBe('https://api.test/v400/fr/p/validation_field_order_types')
      await waitFor(() => expect(result.current.loading).toBe(false))
    })
  })
})
