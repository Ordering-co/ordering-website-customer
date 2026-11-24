import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Cms } from '../index'

const cmsState = vi.hoisted(() => ({
  current: { loading: false, body: '<p>Hello CMS</p>', error: null }
}))

vi.mock('~components/components/CmsContent', () => ({
  CmsContent: ({ UIComponent, ...rest }) => (
    <UIComponent cmsState={cmsState.current} handleCmsRedirect={vi.fn()} {...rest} />
  )
}))

describe('Cms', () => {
  beforeEach(() => {
    cmsState.current = { loading: false, body: '<p>Hello CMS</p>', error: null }
  })

  it('renders cms body when loaded', () => {
    const { container } = renderWithProviders(<Cms />)
    expect(container.querySelector('#cms')).toBeTruthy()
    expect(container.innerHTML).toContain('Hello CMS')
  })

  it('renders loading skeletons', () => {
    cmsState.current = { loading: true, body: null, error: null }
    const { getAllByTestId } = renderWithProviders(<Cms />)
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('the loading skeleton reserves its space in fluid units, not pixels', () => {
    cmsState.current = { loading: true, body: null, error: null }
    const { getAllByTestId } = renderWithProviders(<Cms />)
    const heights = getAllByTestId('skeleton').map((el) => el.dataset.height).filter((h) => h !== '100%')
    expect(heights.length).toBe(4)
    expect(heights.every((h) => h.endsWith('dvh'))).toBe(true)
  })

  it('without an h1 in its HTML, the page title is its (visually hidden) h1', () => {
    const { getByRole, rerender } = renderWithProviders(<Cms pageTitle='About us' />)
    expect(getByRole('heading', { level: 1, name: 'About us' })).toBeInTheDocument()
    rerender(<Cms />)
    expect(getByRole('heading', { level: 1, name: 'Pages' })).toBeInTheDocument()
  })

  it('with an h1 in its HTML, that one is the page\'s only h1', () => {
    cmsState.current = { loading: false, body: '<h1 class="x">Own title</h1><p>Text</p>', error: null }
    const { getAllByRole } = renderWithProviders(<Cms pageTitle='About us' />)
    const h1s = getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('Own title')
  })

  it('its HTML: links of the theme, images that fit, blocks lg apart', () => {
    const theme = themeWithValues()
    const { lg } = theme.values.tokens.space
    const { container } = renderWithProviders(<Cms />, { theme })
    const body = container.querySelector('[data-doc-section="content-page-body"]')
    const css = cssFor(body).replace(/\s+/g, ' ')
    expect(css).toMatch(/ img ?\{ ?max-width: ?100%; ?height: ?auto;/)
    expect(css).toMatch(new RegExp(` blockquote ?\\{ ?margin-block: ?${lg}px;`))
    expect(css).toMatch(/ a ?\{ ?display: ?inline;/)
  })
})
