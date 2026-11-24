import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.unmock('~ui-icon')

let Icon
let LUCIDE_ICON_REGISTRY

beforeAll(async () => {
  ;({ Icon } = await import('../index'))
  ;({ LUCIDE_ICON_REGISTRY } = await import('../lucideRegistry'))
})

describe('Icon', () => {
  it('renders a known icon from the registry', () => {
    const { container } = render(<Icon name='close' />)
    expect(container.firstChild).toBeTruthy()
  })

  it('keeps the legacy props on the base Icon: 1em box, text color, title as the accessible name', () => {
    const { container } = render(<Icon name='tag' color='rgb(1, 2, 3)' title='Offers' />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('1em')
    expect(svg.style.color).toBe('rgb(1, 2, 3)')
    expect(svg.getAttribute('aria-label')).toBe('Offers')
    expect(render(<Icon name='tag' />).container.querySelector('svg').getAttribute('aria-hidden')).toBe('true')
  })

  it('returns null for unknown icon names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Icon name='not-a-real-icon' />)
    expect(container.firstChild).toBeNull()
    warn.mockRestore()
  })

  it('has the empty-state icons and none of the icons they replaced', () => {
    for (const key of ['bag', 'carFront', 'clockHistory', 'creditCardFront', 'geoAlt', 'heartBs', 'receipt', 'shop', 'signpost', 'ticket', 'wallet', 'wifiOff']) {
      expect(LUCIDE_ICON_REGISTRY[key]).toBeTruthy()
    }
    for (const key of ['inbox', 'pageSearch', 'cancel', 'foodTruck']) {
      expect(LUCIDE_ICON_REGISTRY[key]).toBeUndefined()
    }
  })
})
