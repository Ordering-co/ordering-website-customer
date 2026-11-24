import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SessionsList } from '../index'

// /sessions: the box and title of the account
// pages, still cards, the delete of a session a real button

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
// the window's width the page reads (the setup mocks it at 1024)
const screen = vi.hoisted(() => ({ width: 1024 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: screen.width, height: 768 }) }))
vi.mock('~components/components/Sessions', () => ({
  Sessions: ({ UIComponent, ...rest }) => (
    <UIComponent
      sessionsList={{ loading: false, error: null, sessions: [{ id: 1, created_at: '2026-01-01', valid_thru: '2026-02-01', current: true }] }}
      actionState={{ loading: false, error: null }}
      handleDeleteSession={vi.fn()}
      handleDeleteAllSessions={vi.fn()}
      {...rest}
    />
  )
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { session_strategy: 'jwt_session' } }]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: (value) => value }]
}))

describe('sessions page', () => {
  it('a session is a card of components.card with its inner space, its delete a button that names the session', () => {
    const theme = themeWithValues()
    const { container, getByRole } = renderWithProviders(<SessionsList />, { theme })
    expect(getByRole('heading', { level: 1, name: 'Security' })).toBeInTheDocument()
    const remove = getByRole('button', { name: 'Delete the session created at 2026-01-01' })
    expect(remove.getAttribute('type')).toBe('button')
    const card = container.querySelector('[data-doc-control="session-item"]')
    expect(card).toHaveStyle({ padding: `${theme.values.components.card.base.padding}px` })
    // no hover of its own: the card at rest
    expect(cssFor(card)).not.toMatch(/translateY/)
  })

  it('the page keeps the footer under the fold: the screen minus four headers (header and footer), the theme\'s height as fallback (no 280px)', () => {
    const theme = themeWithValues((values) => { values.components.header.base.height = 72; return values })
    const { container } = renderWithProviders(<SessionsList />, { theme })
    const css = cssFor(container.querySelector('[data-doc-section]') || container.firstChild).replace(/\s+/g, '')
    expect(css).toContain('min-height:calc(100dvh-4*var(--header-height,72px))')
    expect(css).not.toContain('280px')
  })

  it('its dates are labelled; the current one a badge of the theme', () => {
    const { container, getByText } = renderWithProviders(<SessionsList />, { theme: themeWithValues() })
    expect(getByText('Created at 2026-01-01')).toBeInTheDocument()
    expect(getByText('Expires 2026-02-01')).toBeInTheDocument()
    const badge = getByText('Current')
    expect(badge.tagName).toBe('SPAN')
    expect(container.textContent).not.toContain('(Current)')
  })

  it('the sessions md apart; the buttons a section xl under them', () => {
    const theme = themeWithValues()
    const { md, xl } = theme.values.tokens.space
    const { container } = renderWithProviders(<SessionsList />, { theme })
    const card = container.querySelector('[data-doc-control="session-item"]')
    const list = card.parentElement
    expect(list).toHaveStyle({ gap: `${md}px` })
    const buttons = container.querySelector('[data-doc-control="sessions-delete-all"]').parentElement
    expect(list.nextElementSibling).toBe(buttons)
    expect(cssFor(buttons).replace(/\s+/g, '')).toContain(`margin:${xl}pxauto0;`)
  })
})

describe('sessions page without sessions', () => {
  const EMPTY = { loading: false, error: null, sessions: [] }
  const withImages = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))

  it('the empty state of the app (NotFoundSource), an h2 of the page, images.empty.sessions', () => {
    const { container, getByRole } = renderWithProviders(<SessionsList sessionsList={EMPTY} />, {
      theme: withImages({ 'empty.sessions': 'https://cdn.test/sessions.png', 'empty.not_found': 'https://cdn.test/nf.png' })
    })
    expect(getByRole('heading', { level: 2, name: 'You don\'t have any sessions' })).toBeInTheDocument()
    const img = container.querySelector('#not-found-source img')
    expect(img).toHaveAttribute('src', 'https://cdn.test/sessions.png')
    expect(img).toHaveAttribute('alt', '')
    // the fixed illustration is gone
    expect(container.querySelector('svg[width="491"]')).toBeNull()
  })

  it('without empty.sessions: the theme\'s empty.not_found; without either, the icon', () => {
    const { container, unmount } = renderWithProviders(<SessionsList sessionsList={EMPTY} />, {
      theme: withImages({ 'empty.not_found': 'https://cdn.test/nf.png' })
    })
    expect(container.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/nf.png')
    unmount()
    const theme = themeWithValues()
    expect(theme.values.images['empty.not_found']).toBe('')
    const { container: c2 } = renderWithProviders(<SessionsList sessionsList={EMPTY} />, { theme })
    expect(c2.querySelector('#not-found-source img')).toBeNull()
    expect(c2.querySelector('svg[width="491"]')).toBeNull()
  })
})

// pages.sessions: its section bulk_actions, the "delete all" buttons
describe('sessions page: the section bulk_actions (pages.sessions)', () => {
  const withBulk = (visible) => themeWithValues((values) => {
    values.pages.sessions = { ...values.pages.sessions, sections: [{ key: 'bulk_actions', visible }] }
    return values
  })

  it('shown by default; the theme hides both buttons, the sessions stay', () => {
    const shown = renderWithProviders(<SessionsList />, { theme: themeWithValues() })
    expect(shown.container.querySelector('[data-doc-control="sessions-delete-all"]')).not.toBeNull()
    expect(shown.container.querySelector('[data-doc-control="sessions-delete-others"]')).not.toBeNull()
    shown.unmount()
    const { container } = renderWithProviders(<SessionsList />, { theme: withBulk(false) })
    expect(container.querySelector('[data-doc-control="sessions-delete-all"]')).toBeNull()
    expect(container.querySelector('[data-doc-control="sessions-delete-others"]')).toBeNull()
    expect(container.querySelector('[data-doc-control="session-item"]')).not.toBeNull()
  })

  it('on a phone the theme\'s phone value decides', () => {
    screen.width = 375
    window.innerWidth = 375
    try {
      const theme = themeWithValues((values) => {
        values.platforms = { ...values.platforms, mobile_web: { ...values.platforms?.mobile_web, pages: { sessions: { sections: [{ key: 'bulk_actions', visible: false }] } } } }
        return values
      })
      const { container } = renderWithProviders(<SessionsList />, { theme })
      expect(container.querySelector('[data-doc-control="sessions-delete-all"]')).toBeNull()
    } finally {
      screen.width = 1024
      window.innerWidth = 1024
    }
  })
})

describe('sessions page, sessions not enabled', () => {
  it('the empty state of the app with its button, an h2 of the page', async () => {
    vi.resetModules()
    vi.doMock('~components/contexts/SessionContext', () => ({
      useSession: () => [{ user: { session_strategy: 'session' } }]
    }))
    const { SessionsList: List } = await import('../index')
    const { container, getByRole } = renderWithProviders(<List />, {
      theme: themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.sessions': 'https://cdn.test/sessions.png' } }))
    })
    expect(getByRole('heading', { level: 2, name: /You don't have enabled the sessions/ })).toBeInTheDocument()
    expect(container.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/sessions.png')
    expect(container.querySelector('[data-doc-control="sessions-activate"]')).toBe(getByRole('button', { name: 'Active sessions' }))
    vi.doUnmock('~components/contexts/SessionContext')
  })
})
