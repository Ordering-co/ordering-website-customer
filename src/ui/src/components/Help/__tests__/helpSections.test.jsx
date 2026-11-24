import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { orderListFixture, paginationFixture } from '../../__tests__/helpers/ordersTestMocks'
import { Help } from '../index'

// /help as the theme lays it out (pages.help: the topics and the last order
// ordered and hidden; the line between them) and components.help_topic
let orders = orderListFixture
vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => (
    <UIComponent orderList={orders} pagination={paginationFixture} {...rest} />
  )
}))
vi.mock('~ui/src/components/HelpStaticPage', () => ({
  HelpStaticPage: ({ slug }) => <div data-doc-section='help-topic-body' data-slug={slug} />
}))
// the icon with its props (class, aria-hidden), so the chevron's
// own rules can be read
vi.mock('~ui-icon', () => ({
  Icon: ({ name, ...props }) => <span data-testid={`icon-${name}`} {...props} />
}))

const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
const withSections = (sections, mutate = (values) => values) => themeWithValues((values) => mutate({
  ...values,
  tokens: { ...values.tokens, space: SPACE },
  pages: { ...values.pages, help: { ...values.pages.help, sections: sections.map(([key, visible = true]) => ({ key, visible })) } }
}))
const renderHelp = (theme) => renderWithProviders(<Help />, { theme })
const blocks = (container) => Array.from(container.querySelector('h1').nextElementSibling.children)
const name = (el) => (el.tagName === 'UL' || (el.tagName === 'DIV' && el.querySelector('[data-doc-control^="help-topic"]')) ? 'topics' : 'last_order')
// The rules of the content's wrapper (it places the line between the sections)
const wrapperCss = (container) => cssFor(container.querySelector('h1').nextElementSibling).replace(/\s+/g, '')

describe('/help: sections of the theme (pages.help)', () => {
  it('with the schema defaults: the topics, then the last order', () => {
    const { container } = renderHelp(themeWithValues())
    expect(blocks(container).map(name)).toEqual(['topics', 'last_order'])
  })

  it('the last order first; the line under it (not under the topics, last)', () => {
    const { container } = renderHelp(withSections([['last_order'], ['help_topics']]))
    const [last, topics] = blocks(container)
    expect([last, topics].map(name)).toEqual(['last_order', 'topics'])
    const css = wrapperCss(container)
    // the topics: never a line nor space under them
    expect(css).toMatch(/>\.[\w-]+\{border-bottom:none;padding-bottom:0;margin-bottom:0;/)
    // the last order, first and with an order: the item line, xl at each side
    expect(css).toMatch(new RegExp(`>\\.[\\w-]+:not\\(:last-child\\):not\\(:empty\\)\\{border-bottom:[^;]+;padding-bottom:${SPACE.xl}px;margin-bottom:${SPACE.xl}px;`))
    // (jsdom cascades by source order only: the rules are read, and these
    // are the elements they reach)
    expect(last.matches(':not(:last-child):not(:empty)')).toBe(true)
  })

  it('the topics first; the line over the last order (on its side facing them)', () => {
    const { container } = renderHelp(themeWithValues((values) => ({ ...values, tokens: { ...values.tokens, space: SPACE } })))
    const [topics, last] = blocks(container)
    expect([topics, last].map(name)).toEqual(['topics', 'last_order'])
    const css = wrapperCss(container)
    expect(css).toMatch(new RegExp(`>\\.[\\w-]+\\+\\.[\\w-]+:not\\(:empty\\)\\{border-top:[^;]+;padding-top:${SPACE.xl}px;margin-top:${SPACE.xl}px;`))
    expect(last.matches(':not(:empty)')).toBe(true)
  })

  it('no past order (the last order empty): no line left under the topics', () => {
    const saved = orders
    orders = { ...orderListFixture, orders: [] }
    try {
      const { container } = renderHelp(themeWithValues((values) => ({ ...values, tokens: { ...values.tokens, space: SPACE } })))
      const [topics, last] = blocks(container)
      expect(name(topics)).toBe('topics')
      // the last order renders nothing: the rule that draws the line skips it
      expect(last.matches(':empty')).toBe(true)
      // and the topics' own line is removed whatever follows them
      expect(wrapperCss(container)).toMatch(/>\.[\w-]+\{border-bottom:none;padding-bottom:0;margin-bottom:0;/)
    } finally {
      orders = saved
    }
  })

  it('the topics hidden, the last order alone; the last order hidden, the topics alone', () => {
    const one = renderHelp(withSections([['help_topics', false]]))
    expect(blocks(one.container).map(name)).toEqual(['last_order'])
    one.unmount()
    const two = renderHelp(withSections([['last_order', false]]))
    expect(blocks(two.container).map(name)).toEqual(['topics'])
    expect(blocks(two.container)[0].matches(':last-child')).toBe(true)
  })
})

describe('/help: components.help_topic', () => {
  const TOPIC = { text: { size: 18, line: 1.44, weight: 400 }, text_color: '#0C0D0E', chevron_color: '#1C1D1E', chevron_size: 28 }
  const themed = () => withSections([], (values) => {
    values.components.help_topic.base = { ...values.components.help_topic.base, ...TOPIC }
    return values
  })

  it('a topic\'s label (its weight kept) and color, its chevron\'s color and size', () => {
    const { container } = renderHelp(themed())
    const row = container.querySelector('[data-doc-control="help-topic-1"]')
    const labelCss = cssFor(row.firstElementChild)
    expect(row.style.getPropertyValue('--ui-help-topic-text-color')).toBe('#0C0D0E')
    expect(labelCss).toMatch(/font-size:18px;line-height:1\.44;font-weight:600;/)
    const chevron = row.querySelector('svg.lucide-chevron-right')
    expect(chevron).toHaveAttribute('aria-hidden', 'true')
    // its color on the svg (from its wrapper), its size the chevron's own
    expect(cssFor(chevron.parentElement).replace(/\s+/g, '')).toMatch(/svg\{color:#1C1D1E;/)
    expect(cssFor({ className: chevron.getAttribute('class') }).replace(/\s+/g, '')).toContain('width:28px;height:28px;')
  })
})
