import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { SessionsList } from '../index'
import { baseSessionsUIProps } from '../../__tests__/helpers/authTestUtils'

// implementation notesthe delete icon of each session, "delete all" (two) and
// "Active sessions" are the design system's Button. The current-session
// badge is not a control.

const { state } = vi.hoisted(() => ({ state: { strategy: 'jwt_session', sessions: [], actionState: { loading: false } } }))

vi.mock('~components/components/Sessions', () => ({
  Sessions: ({ UIComponent, ...rest }) => (
    <UIComponent
      {...baseSessionsUIProps}
      handleDeleteSession={vi.fn()}
      handleDeleteAllSessions={vi.fn()}
      sessionsList={{ loading: false, sessions: state.sessions }}
      actionState={state.actionState}
      {...rest}
    />
  )
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { session_strategy: state.strategy } }]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: (value) => value }]
}))

const sessions = [
  { id: 1, created_at: '2026-01-01', valid_thru: '2026-02-01', current: false },
  { id: 2, created_at: '2026-01-02', valid_thru: '2026-02-02', current: true }
]

describe('SessionsList: the pieces', () => {
  it('each session deletes with an icon Button named for its date, with a base Icon', () => {
    state.strategy = 'jwt_session'
    state.sessions = sessions
    const { getByRole, container } = renderWithProviders(<SessionsList />)
    const remove = getByRole('button', { name: 'Delete the session created at 2026-01-01' })
    expect(remove).toHaveAttribute('data-slot', 'button')
    expect(remove).toHaveAttribute('type', 'button')
    expect(remove.className).toContain('ui:w-(--ui-button-height)')
    expect(remove.querySelector('svg.lucide-x')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('[data-doc-control="session-delete"]')).toHaveLength(2)
    container.querySelectorAll('[data-doc-control="session-delete"]').forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
    })
  })

  it('the two "delete all" actions are base Buttons that share one column and stay disabled while an action runs', () => {
    state.sessions = sessions
    state.actionState = { loading: true }
    const { container } = renderWithProviders(<SessionsList />)
    const all = container.querySelector('[data-doc-control="sessions-delete-all"]')
    const others = container.querySelector('[data-doc-control="sessions-delete-others"]')
    ;[all, others].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toBeDisabled()
    })
    expect(all.parentElement).toBe(others.parentElement)
    state.actionState = { loading: false }
  })

  it('"Active sessions" is an outline base Button and asks to enable them', () => {
    state.strategy = 'session'
    const { container, getByRole, getByText } = renderWithProviders(<SessionsList />)
    const activate = getByRole('button', { name: 'Active sessions' })
    expect(activate).toBe(container.querySelector('[data-doc-control="sessions-activate"]'))
    expect(activate).toHaveAttribute('data-slot', 'button')
    expect(activate).toHaveAttribute('type', 'button')
    // outline: no fill
    expect(activate.style.getPropertyValue('--ui-button-background')).toBe('transparent')
    fireEvent.click(activate)
    expect(getByText('Are you sure to enable all sessions?')).toBeInTheDocument()
    state.strategy = 'jwt_session'
  })
})
