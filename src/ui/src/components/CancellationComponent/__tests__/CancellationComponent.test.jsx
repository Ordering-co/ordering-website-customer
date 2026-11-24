import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CancellationComponent } from '../index'
import { Content, Hero, HeroText, Segment } from '../styles'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const Button = ({ children, ...props }) => <button type='button' {...props}>{children}</button>
const Input = (props) => <input {...props} />

describe('CancellationComponent', () => {
  it('renders outage title and contact actions', () => {
    const { getByText } = renderWithProviders(
      <CancellationComponent ButtonComponent={Button} InputComponent={Input} />
    )
    expect(getByText('SITE OUT OF SERVICE')).toBeInTheDocument()
    expect(getByText('Contact us')).toBeInTheDocument()
    expect(getByText('Send')).toBeInTheDocument()
  })

  it('the owner and the customer each read their own text, their role in bold', () => {
    const { container } = renderWithProviders(
      <CancellationComponent ButtonComponent={Button} InputComponent={Input} />
    )
    const texts = Array.from(container.querySelectorAll('p')).map((p) => p.textContent)
    expect(texts).toContain('If you are the owner of this website contact us to reactivate your website.')
    expect(texts).toContain('If you are a customer, let the owner know you miss this website. Just write your email below.')
    expect(Array.from(container.querySelectorAll('p b')).map((b) => b.textContent)).toEqual(expect.arrayContaining(['owner', 'customer']))
  })
})

describe('CancellationComponent: fluid layout', () => {
  const css = (Component) => {
    const { container } = renderWith(themeWithValues(), <Component />)
    return cssFor(container.firstChild)
  }

  it('the hero is a share of the screen, not a fixed height', () => {
    expect(css(Hero)).toMatch(/height:\s*45dvh/)
    expect(css(Hero)).toMatch(/height:\s*50dvh/)
  })

  it('the content box and the texts follow the size and the measure of the text', () => {
    expect(css(Content)).toMatch(/min-height:\s*calc\(3\.5 \* 56px\)/)
    expect(css(Content)).toMatch(/max-width:\s*min\(100%,\s*75ch\)/)
    expect(css(Segment)).toMatch(/max-width:\s*min\(100%,\s*82ch\)/)
    expect(css(HeroText)).toMatch(/max-width:\s*min\(100%,\s*70ch\)/)
  })
})
