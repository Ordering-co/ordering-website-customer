import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { ScrollToTop } from '../index'

const mockListen = vi.fn(() => vi.fn())
const mockHistory = {
  listen: mockListen,
  location: { pathname: '/', search: '' }
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    withRouter: (Component) => (props) => (
      <Component {...props} history={mockHistory} />
    )
  }
})

describe('ScrollToTop', () => {
  it('renders children with minHeight wrapper', () => {
    const { getByText } = renderWithProviders(
      <ScrollToTop><span>scroll-child</span></ScrollToTop>
    )
    expect(getByText('scroll-child')).toBeInTheDocument()
  })

  it('keeps the footer under the fold with a screen-tall wrapper', () => {
    const { getByText } = renderWithProviders(
      <ScrollToTop><span>tall</span></ScrollToTop>
    )
    expect(getByText('tall').parentElement).toHaveStyle({ minHeight: '100vh' })
  })

  it('takes only its content height when the footer is hidden', () => {
    const { getByText } = renderWithProviders(
      <ScrollToTop isFooterHidden><span>short</span></ScrollToTop>
    )
    expect(getByText('short').parentElement).toHaveStyle({ minHeight: 'auto' })
  })

  it('fills the rest of the screen on the home instead of a screen-tall wrapper', () => {
    const { getByText } = renderWithProviders(
      <ScrollToTop isHome><span>home</span></ScrollToTop>
    )
    const wrapper = getByText('home').parentElement
    expect(wrapper.style.flexGrow).toBe('1')
    expect(wrapper.style.minHeight).toBe('')
  })

  it('registers history listener on mount', () => {
    renderWithProviders(<ScrollToTop><span>x</span></ScrollToTop>)
    expect(mockListen).toHaveBeenCalled()
  })
})
