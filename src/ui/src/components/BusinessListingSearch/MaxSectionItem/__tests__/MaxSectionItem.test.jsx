import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { UtilsProviders } from '~components/contexts/UtilsContext'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { MaxSectionItem } from '../index'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'

const config = vi.hoisted(() => ({ state: { configs: {} } }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [config.state] }))
vi.mock('~components/contexts/UtilsContext', async (importOriginal) => importOriginal())

const strategy = { getItem: () => new Promise(() => {}) }
const CurrencyProvider = ({ children }) => <UtilsProviders strategy={strategy}>{children}</UtilsProviders>

const setCurrency = (symbol, position = 'left', separator = '.') => {
  config.state = {
    configs: {
      format_number_currency: { value: symbol },
      currency_position: { value: position },
      format_number_decimal_length: { value: 2 },
      format_number_decimal_separator: { value: separator },
      distance_unit: { value: 'km' }
    }
  }
}

describe('MaxSectionItem', () => {
  beforeEach(() => setCurrency('$'))
  it('renders filter title and options', () => {
    const { getByText } = renderWithProviders(
      <MaxSectionItem
        filter='max_delivery_price'
        options={[5, 10, 15, 'default']}
        filters={{ max_delivery_price: 10 }}
        handleChangeFilters={vi.fn()}
      />,
      { wrapper: CurrencyProvider }
    )
    expect(getByText('Under $ 10.00')).toBeInTheDocument()
  })

  it.each([
    ['€', 'left', '.', ['€ 1.00', '€ 2.00', '€ 5.00', '€ 5.00+']],
    ['£', 'left', '.', ['£ 1.00', '£ 2.00', '£ 5.00', '£ 5.00+']],
    ['SRD', 'right', ',', ['1,00 SRD', '2,00 SRD', '5,00 SRD', '5,00 SRD+']],
    [undefined, 'left', '.', ['$ 1.00', '$ 2.00', '$ 5.00', '$ 5.00+']]
  ])('uses configured currency %s and number formatting for every stop', (symbol, position, separator, labels) => {
    setCurrency(symbol, position, separator)
    const handleChangeFilters = vi.fn()
    const { getByText, rerender } = renderWithProviders(
      <MaxSectionItem filter='max_delivery_price' options={[1, 2, 5, 'default']} filters={{ max_delivery_price: 2 }} handleChangeFilters={handleChangeFilters} />,
      { wrapper: CurrencyProvider }
    )
    labels.forEach(label => expect(getByText(label)).toBeInTheDocument())
    expect(getByText(`Under ${labels[1]}`)).toBeInTheDocument()
    fireEvent.click(getByText(labels[1]))
    fireEvent.click(getByText(labels[3]))
    expect(handleChangeFilters.mock.calls).toEqual([['max_delivery_price', 2], ['max_delivery_price', 'default']])
    rerender(
      <MaxSectionItem filter='max_delivery_price' options={[1, 2, 5, 'default']} filters={{ max_delivery_price: 'default' }} handleChangeFilters={handleChangeFilters} />
    )
    expect(getByText(`Under ${labels[2]}`)).toBeInTheDocument()
  })

  it('updates labels when runtime currency configuration changes', () => {
    const element = <MaxSectionItem filter='max_delivery_price' options={[1, 2, 5, 'default']} filters={{}} handleChangeFilters={vi.fn()} />
    const { getByText, queryByText, rerender } = renderWithProviders(element, { wrapper: CurrencyProvider })
    expect(getByText('$ 1.00')).toBeInTheDocument()
    setCurrency('€')
    rerender(<MaxSectionItem filter='max_delivery_price' options={[1, 2, 5, 'default']} filters={{}} handleChangeFilters={vi.fn()} />)
    expect(getByText('€ 1.00')).toBeInTheDocument()
    expect(getByText('€ 5.00+')).toBeInTheDocument()
    expect(queryByText('$ 1.00')).not.toBeInTheDocument()
  })

  it.each([
    ['max_eta', [1, 2, 5, 'default'], ['1 min', '2 min', '5 min', '5 min+']],
    ['max_distance', [1000, 2000, 5000, 'default'], ['1 Km', '2 Km', '5 Km', '5 Km+']]
  ])('preserves %s units', (filter, options, labels) => {
    setCurrency('€')
    const { getByText } = renderWithProviders(
      <MaxSectionItem filter={filter} options={options} filters={{}} handleChangeFilters={vi.fn()} />,
      { wrapper: CurrencyProvider }
    )
    labels.forEach(label => expect(getByText(label)).toBeInTheDocument())
  })

  it('the thumb is the slider\'s (a decorative span)', () => {
    const props = { filter: 'max_eta', options: [1, 2, 5, 'default'], filters: { max_eta: 2 }, handleChangeFilters: vi.fn() }
    const { container } = renderWithProviders(<MaxSectionItem {...props} />, { wrapper: CurrencyProvider, theme: themeWithValues() })
    const thumb = container.querySelector('span[aria-hidden="true"][style*="left"]')
    expect(thumb).not.toBeNull()
    expect(thumb.style.left).toBe(`${(1 / 3) * 100}%`)
  })

  it('the track is for the pointer only: the stops are the buttons (keyboard, assistive technology)', () => {
    const props = { filter: 'max_eta', options: [1, 2, 5, 'default'], filters: { max_eta: 2 }, handleChangeFilters: vi.fn() }
    const { container, getAllByRole } = renderWithProviders(<MaxSectionItem {...props} />, { wrapper: CurrencyProvider, theme: themeWithValues() })
    // the origin dot is the base Dot (no px of its own), inside the track that is hidden
    const dot = container.querySelector('[data-slot="dot"]')
    expect(dot.closest('[aria-hidden="true"]').contains(dot)).toBe(true)
    expect(dot.style.getPropertyValue('--ui-dot-size')).toMatch(/^calc\(/)
    // drawn as a stroke (D9 A): a ring with a clear centre
    expect(dot).toHaveClass('ui:bg-transparent', 'ui:border-solid')
    // the stops are the base Button of the slider-stop appearance
    expect(getAllByRole('button')).toHaveLength(4)
    getAllByRole('button').forEach((stop) => expect(stop).toHaveAttribute('data-slot', 'button'))
    expect(getAllByRole('button')[1]).toHaveAttribute('aria-pressed', 'true')
  })
})
