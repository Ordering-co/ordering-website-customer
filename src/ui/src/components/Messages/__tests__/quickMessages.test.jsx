import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { schemaDefault } from '~/utils/themeSchema'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { LanguageProvider } from '~components/contexts/LanguageContext'
import { Messages } from '../index'

// The quick messages of the chat: shown only with a real translation of the
// loaded language, under the real LanguageProvider (its t() and its loading)
// over a mocked API

const api = vi.hoisted(() => ({ dictionary: {}, resolve: null, deferred: false }))
const handlers = vi.hoisted(() => ({ setMessage: null }))

// the real provider and its t() (src/setupTests.js mocks the context)
vi.mock('~components/contexts/LanguageContext', async (importOriginal) => importOriginal())

vi.mock('~components/contexts/ApiContext', () => {
  const translations = () => {
    const chain = {
      parameters: () => chain,
      where: () => chain,
      asDictionary: () => chain,
      get: () => {
        const response = { content: { error: false, result: api.dictionary } }
        if (!api.deferred) return Promise.resolve(response)
        return new Promise((resolve) => { api.resolve = () => resolve(response) })
      }
    }
    return chain
  }
  const ordering = { language: 'en', project: 'demo', translations }
  const helper = { setLanguage: () => {} }
  return { useApi: () => [ordering, helper] }
})

vi.mock('react-hook-form', () => ({
  useForm: () => ({ handleSubmit: (fn) => fn, register: () => null, errors: {}, formState: { errors: {} }, setValue: vi.fn() })
}))
vi.mock('../MapMessages', () => ({ MapMessages: () => null }))
vi.mock('~components/components/Messages', () => ({
  Messages: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={activeOrder}
      messages={{ loading: false, messages: [] }}
      messagesToShow={{ messages: [] }}
      business
      driver={false}
      handleSend={vi.fn()}
      readMessages={vi.fn()}
      onClose={vi.fn()}
      onMessages={vi.fn()}
      setCanRead={vi.fn()}
      setImage={vi.fn()}
      setMessage={handlers.setMessage}
      image={null}
      message=''
      sendMessage={{ error: null }}
      profileMessages={false}
      {...rest}
    />
  )
}))

const strategy = {
  getItem: async (key) => (key === 'language' ? { id: 1, code: 'en', rtl: false } : null),
  setItem: async () => {}
}

const Language = ({ children }) => (
  <LanguageProvider strategy={strategy} settings={{}} restOfProps={{ app_internal_name: 'website' }}>
    {children}
  </LanguageProvider>
)

const renderChat = async (theme, dictionary) => {
  api.dictionary = dictionary
  const view = renderWithProviders(<Messages orderId={activeOrder.id} />, { theme, wrapper: Language })
  // the provider reads the stored language, then loads its dictionary
  await act(async () => {})
  await act(async () => {})
  return view
}

const shownTheme = () => themeWithValues((values) => { values.visibility['messages.quick_messages'] = true; return values })

const REAL = {
  WEBSITE_CUSTOMER_MESSAGE_1: 'On my way',
  CUSTOMER_MESSAGE_2: 'Please call me'
}

describe('chat quick messages', () => {
  beforeEach(() => {
    api.deferred = false
    api.resolve = null
    handlers.setMessage = vi.fn()
  })

  it('the schema: hidden by default', () => {
    expect(schemaDefault('visibility.messages.quick_messages')).toBe(false)
  })

  it('by default: none, even translated', async () => {
    await renderChat(themeWithValues(), REAL)
    expect(screen.queryByText('On my way')).toBeNull()
    expect(screen.queryByText('Please call me')).toBeNull()
  })

  it('shown: only the translated ones (prefixed or bare key)', async () => {
    await renderChat(shownTheme(), REAL)
    expect(screen.getByText('On my way')).toBeInTheDocument()
    expect(screen.getByText('Please call me')).toBeInTheDocument()
    expect(screen.queryByText(/lorem ipsum/i)).toBeNull()
    expect(screen.queryByText(/CUSTOMER_MESSAGE/)).toBeNull()
  })

  it('shown: none when the site has no translation (never "Lorem ipsum N")', async () => {
    await renderChat(shownTheme(), {})
    expect(screen.queryByText(/lorem ipsum/i)).toBeNull()
    expect(screen.queryByText(/CUSTOMER_MESSAGE/)).toBeNull()
    expect(document.querySelector('[data-doc-section="messages-composer"]')).toBeInTheDocument()
  })

  it('shown: none when the stored translation is the filler copy', async () => {
    await renderChat(shownTheme(), {
      WEBSITE_CUSTOMER_MESSAGE_1: 'Lorem ipsum 1',
      WEBSITE_CUSTOMER_MESSAGE_2: 'Lorem ipsum2',
      WEBSITE_CUSTOMER_MESSAGE_3: 'لوريم إيبسوم 3',
      WEBSITE_CUSTOMER_MESSAGE_4: '   '
    })
    expect(screen.queryByText(/lorem ipsum/i)).toBeNull()
    expect(screen.queryByText(/لوريم/)).toBeNull()
  })

  it('shown: none while the translations load, then the translated ones', async () => {
    api.deferred = true
    await renderChat(shownTheme(), REAL)
    expect(screen.queryByText('On my way')).toBeNull()
    expect(screen.queryByText(/lorem ipsum/i)).toBeNull()
    await act(async () => { api.resolve() })
    expect(screen.getByText('On my way')).toBeInTheDocument()
  })

  it('a chip adds its text to the message', async () => {
    await renderChat(shownTheme(), REAL)
    fireEvent.click(screen.getByText('On my way'))
    expect(handlers.setMessage).toHaveBeenCalledWith(' On my way')
  })
})
