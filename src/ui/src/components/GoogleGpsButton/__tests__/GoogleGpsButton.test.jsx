import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { GoogleGpsButton } from '../index'

const gps = vi.hoisted(() => ({ current: {} }))

vi.mock('~components/components/GpsButton', () => ({
  GpsButton: ({ UIComponent, ...rest }) => (
    <UIComponent
      handleGPS={vi.fn()}
      isGoogleButton
      googleReady
      isLoading={false}
      IconButton={() => <span>GPS</span>}
      {...gps.current}
      {...rest}
    />
  )
}))

describe('GoogleGpsButton', () => {
  beforeEach(() => { gps.current = {} })

  it('renders gps button label', () => {
    const { getByText } = renderWithProviders(<GoogleGpsButton />)
    expect(getByText('GPS')).toBeInTheDocument()
  })

  it('is the base icon Button named for the action, with the Lucide pin by default', () => {
    gps.current = { IconButton: undefined }
    const { getByRole } = renderWithProviders(<GoogleGpsButton />)
    const button = getByRole('button', { name: 'Use my current location' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('aria-busy', 'false')
    expect(button).toBeEnabled()
    expect(button.querySelector('svg.lucide-map-pin')).not.toBeNull()
  })

  it('while it locates it shows the loader glyph, is disabled and says it is busy', () => {
    gps.current = { isLoading: true, IconButton: undefined }
    const { getByRole } = renderWithProviders(<GoogleGpsButton />)
    const button = getByRole('button', { name: 'Use my current location' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('svg.lucide-loader-circle')).not.toBeNull()
  })

  it('waits for Google before answering', () => {
    gps.current = { googleReady: false }
    const { getByRole } = renderWithProviders(<GoogleGpsButton />)
    expect(getByRole('button', { name: 'Use my current location' })).toBeDisabled()
  })
})
