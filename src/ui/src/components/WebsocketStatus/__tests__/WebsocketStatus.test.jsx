import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { WebsocketStatus } from '../index'

const socket = vi.hoisted(() => ({ reconnectAttemptCount: 0 }))

vi.mock('~components/components/WebsocketStatus', () => ({
  WebsocketStatus: ({ UIComponent, ...rest }) => (
    <UIComponent socketStatus={1} reconnectAttemptCount={socket.reconnectAttemptCount} connectedDate='2026-01-01T12:00:00Z' {...rest} />
  )
}))

const RECONNECT_ERROR = /error in establishing the WebSocket connection/

// The app mounts this once, on every page (checkout and the store included): it draws no pill
describe('WebsocketStatus (the app-wide shell)', () => {
  it('draws no floating Connection status pill: no button, no text, nothing on the page', () => {
    const { container } = renderWithProviders(<WebsocketStatus />)
    expect(screen.queryByText('Connection status')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('[data-slot="dot"]')).toBeNull()
  })

  it('a failed reconnection still raises its alert', () => {
    socket.reconnectAttemptCount = 4
    try {
      renderWithProviders(<WebsocketStatus />)
      expect(screen.getByText(RECONNECT_ERROR)).toBeInTheDocument()
    } finally {
      socket.reconnectAttemptCount = 0
    }
  })
})
