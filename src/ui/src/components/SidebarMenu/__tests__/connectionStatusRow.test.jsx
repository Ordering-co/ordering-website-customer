import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues, cssFor } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { SidebarMenu } from '../index'

const socket = vi.hoisted(() => ({ status: 1 }))
const session = vi.hoisted(() => ({ auth: true }))

vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 1024, height: 768 }) }))
vi.mock('../../../../config', () => ({ default: { franchiseSlug: null, businessSlug: null } }))
vi.mock('../../../hooks/useEnabledLanguages', () => ({ useEnabledLanguages: () => ({ hasMultiple: true }) }))
vi.mock('../../SavedCards/useSavedCardsGateway', () => ({ useSavedCardsGateway: () => ({ isAvailable: true }) }))
vi.mock('~ui/src/components/LogoutButton', () => ({ LogoutButton: () => <button type='button'>Logout</button> }))
vi.mock('~components/contexts/EventContext', () => ({ useEvent: () => [{ emit: vi.fn(), on: vi.fn(), off: vi.fn() }] }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: session.auth, user: { id: 1, name: 'Jane', lastname: 'Doe' }, token: 't' }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: {} }] }))
vi.mock('~components/components/WebsocketStatus', () => ({
  WebsocketStatus: ({ UIComponent, ...rest }) => (
    <UIComponent
      socketStatus={socket.status}
      reconnectAttemptCount={0}
      connectedDate='2026-01-01T12:00:00Z'
      getWebsocketStatus={(n) => ({ 0: 'Connecting', 1: 'Ok', 2: 'Disconnected' })[n]}
      {...rest}
    />
  )
}))

const open = (theme) => {
  const view = renderWithProviders(<SidebarMenu auth={session.auth} isHideSignup={false} />, { theme })
  fireEvent.click(view.getAllByLabelText('Open menu').slice(-1)[0])
  return view
}
const rowOf = (view) => view.getByText('Connection status').closest('[data-doc-section="sidebar-connection-status"]')

describe('SidebarMenu: the Connection status row', () => {
  beforeEach(() => { socket.status = 1; session.auth = true })

  it('the theme key visibility.connection_status (on by default) controls the row', () => {
    expect(schemaDefault('visibility.connection_status')).toBe(true)
    const hidden = themeWithValues((values) => { values.visibility.connection_status = false; return values })
    expect(open(hidden).queryByText('Connection status')).toBeNull()
  })

  it('online: a success dot named Ok, in Information, before Logout', () => {
    const view = open(themeWithValues())
    const row = rowOf(view)
    const dot = within(row).getByRole('img', { name: 'Ok' })
    expect(dot).toHaveClass('ui:bg-success')
    const nodes = [...view.baseElement.querySelectorAll('h3, [data-doc-section="sidebar-connection-status"], button')]
    const info = nodes.findIndex((n) => n.textContent === 'Information')
    expect(info).toBeGreaterThanOrEqual(0)
    expect(nodes.indexOf(row)).toBeGreaterThan(info)
    expect(nodes.indexOf(row)).toBeLessThan(nodes.findIndex((n) => n.textContent === 'Logout'))
  })

  it('offline: a danger dot named Disconnected; connecting: a warning dot', () => {
    socket.status = 2
    const offline = open(themeWithValues())
    expect(within(rowOf(offline)).getByRole('img', { name: 'Disconnected' })).toHaveClass('ui:bg-danger')
    offline.unmount()
    socket.status = 0
    const connecting = open(themeWithValues())
    expect(within(rowOf(connecting)).getByRole('img', { name: 'Connecting' })).toHaveClass('ui:bg-warning')
  })

  it('is not an option: a plain block, no link, no button, no click handler', () => {
    const row = rowOf(open(themeWithValues()))
    expect(row.tagName).toBe('DIV')
    expect(row.getAttribute('href')).toBeNull()
    expect(row.querySelector('a, button')).toBeNull()
    expect(cssFor(row)).toContain('cursor:default')
  })

  it('keeps the Information title even when Help and Sessions are hidden', () => {
    const theme = themeWithValues((values) => { values.visibility['menu.help'] = false; values.visibility['menu.sessions'] = false; return values })
    expect(open(theme).getByText('Information')).toBeInTheDocument()
  })

  it('a guest has no row', () => {
    session.auth = false
    expect(open(themeWithValues()).queryByText('Connection status')).toBeNull()
  })
})

describe('SidebarMenu: the Connection status row without icons', () => {
  it('sidebar_menu.base.show_icons false: one dot, after the label, still named', () => {
    socket.status = 2
    session.auth = true
    const theme = themeWithValues((values) => { values.components.sidebar_menu.base.show_icons = false; return values })
    const row = rowOf(open(theme))
    expect(within(row).getAllByRole('img', { name: 'Disconnected' })).toHaveLength(1)
  })
})
