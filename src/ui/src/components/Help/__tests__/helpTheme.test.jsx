import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { orderListFixture, paginationFixture } from '../../__tests__/helpers/ordersTestMocks'
import { Help } from '../index'

// The real LastOrders (the help page's last order section) over a mocked list
vi.mock('~components/components/OrderList', () => ({
  OrderList: ({ UIComponent, ...rest }) => (
    <UIComponent orderList={orderListFixture} pagination={paginationFixture} {...rest} />
  )
}))
vi.mock('~ui/src/components/HelpStaticPage', () => ({
  HelpStaticPage: ({ slug }) => <div data-doc-section='help-topic-body' data-slug={slug}><p>Body</p></div>
}))
// the icon with its props (class, aria-hidden), so the chevron's
// own rules can be read
vi.mock('~ui-icon', () => ({
  Icon: ({ name, ...props }) => <span data-testid={`icon-${name}`} {...props} />
}))

// Non-default spaces, so each gap proves the token it comes from
const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
// (the page title, section_header.variants.page, aliases tokens.space.xl for its gap, as the API resolves it)
const spaced = (mutate = (values) => values) => themeWithValues((values) => mutate({
  ...values,
  tokens: { ...values.tokens, space: SPACE },
  components: {
    ...values.components,
    section_header: {
      ...values.components.section_header,
      variants: { ...values.components.section_header.variants, page: { ...values.components.section_header.variants.page, margin_bottom: SPACE.xl } }
    }
  }
}))

const TOPICS = ['Help with an order', 'Account and Payment Options', 'Guide to Ordering']

const renderHelp = (theme) => renderWithProviders(<Help />, { theme })

const headings = (container) => [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')]
  .map((h) => `${h.tagName.toLowerCase()}:${h.textContent}`)

const openTopic = (utils, title = TOPICS[0]) => fireEvent.click(utils.getByText(title))

describe('help page: heading outline', () => {
  it('the menu: one h1 (Help), the last order an h2; no skipped level', () => {
    const { container } = renderHelp(themeWithValues())
    expect(headings(container)).toEqual(['h1:Help', 'h2:Last order'])
  })

  it('an open topic: its title is the page\'s h1, the crumbs are not a heading', () => {
    const utils = renderHelp(themeWithValues())
    openTopic(utils)
    expect(headings(utils.container)).toEqual(['h1:Help with an order'])
  })
})

describe('help page: theme elements', () => {
  it('the topics are a list of rows: a button each (keeps its data-doc-control), the registry\'s chevron hidden from assistive tech', () => {
    const { container, getByText } = renderHelp(themeWithValues())
    const list = container.querySelector('ul')
    const items = [...list.children]
    expect(items.map((li) => li.tagName)).toEqual(['LI', 'LI', 'LI'])
    items.forEach((li, i) => {
      const row = li.firstElementChild
      expect(row.tagName).toBe('BUTTON')
      expect(row).toHaveAttribute('type', 'button')
      expect(row).toHaveAttribute('data-doc-control', `help-topic-${i + 1}`)
      expect(row).toHaveTextContent(TOPICS[i])
      expect(row.querySelector('svg.lucide-chevron-right')).toHaveAttribute('aria-hidden', 'true')
    })
    fireEvent.click(getByText(TOPICS[2]))
    expect(container.querySelector('[data-doc-section="help-topic-body"]')).toHaveAttribute('data-slug', 'helpOrderingGuide')
  })

  it('a row is components.card: its background, radius and shadow; with the themed hover and focus shadows', () => {
    const theme = themeWithValues((values) => {
      values.components.card.base.background = '#123456'
      values.components.card.base.radius = 7
      values.components.card.base.shadow = { x: 0, y: 2, blur: 6, spread: 0, color: '#000000', opacity: 0.3 }
      values.components.card.variants.default.states.hover.shadow = { x: 0, y: 3, blur: 9, spread: 0, color: '#000000', opacity: 0.2 }
      values.components.card.variants.default.states.focus.shadow = { x: 0, y: 1, blur: 3, spread: 0, color: '#000000', opacity: 0.4 }
      return values
    })
    const { container } = renderHelp(theme)
    const row = container.querySelector('[data-doc-control="help-topic-1"]')
    expect(row.style.getPropertyValue('--ui-action-card-background')).toBe('#123456')
    expect(row.style.getPropertyValue('--ui-action-card-radius')).toBe('7px')
    expect(row.style.getPropertyValue('--ui-action-card-shadow')).toBe('0px 2px 6px 0px rgba(0,0,0,0.3)')
    expect(row.style.getPropertyValue('--ui-action-card-hover-shadow')).toBe('0px 3px 9px 0px rgba(0,0,0,0.2)')
    expect(row).toHaveClass('ui:not-data-disabled:hover:[box-shadow:var(--ui-action-card-hover-shadow)]')
    expect(row.style.getPropertyValue('--ui-action-card-focus-shadow')).toBe('0px 1px 3px 0px rgba(0,0,0,0.4)')
    expect(row).toHaveClass('ui:focus-visible:[box-shadow:var(--ui-action-card-focus-shadow,var(--ui-action-card-shadow))]')
  })

  it('the open topic: the crumb back is a button of components.link, the current crumb is the page', () => {
    const utils = renderHelp(themeWithValues())
    openTopic(utils)
    const back = utils.getByText('Help')
    expect(back.tagName).toBe('BUTTON')
    expect(back).toHaveAttribute('type', 'button')
    expect(utils.getAllByText('Help with an order').find((el) => el.tagName === 'SPAN')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(back)
    expect(utils.container.querySelector('h1')).toHaveTextContent('Help')
  })

  it('the topic\'s body is the body text of the theme', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.text = '#202122'
      return values
    })
    const utils = renderHelp(theme)
    openTopic(utils)
    expect(utils.container.querySelector('[data-doc-section="help-topic-body"]')).toHaveStyle({ color: '#202122' })
  })
})

describe('help page: spacing from tokens.space', () => {
  it('the menu: title xl over the topics, rows md apart and the card\'s padding inside, xl to the line and from it, the last order\'s h2 md over its card', () => {
    const { container, getByText } = renderHelp(spaced((values) => {
      values.components.card.base.padding = 21
      return values
    }))
    expect(getByText('Help', { selector: 'h1' })).toHaveStyle({ marginBottom: `${SPACE.xl}px` })
    const list = container.querySelector('ul')
    expect(list).toHaveStyle({ gap: `${SPACE.md}px`, paddingBottom: `${SPACE.xl}px`, marginBottom: `${SPACE.xl}px`, marginTop: '0px', paddingLeft: '0px' })
    container.querySelectorAll('ul > li > button').forEach((row) => {
      expect(row.style.getPropertyValue('--ui-action-card-padding')).toBe('21px')
      expect(row).toHaveClass('ui:gap-md', 'ui:m-none')
    })
    const title = getByText('Last order')
    expect(title).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.md}px` })
    const section = title.parentElement
    expect(section).toHaveStyle({ marginBottom: '0px' })
    const orders = container.querySelector('[data-doc-section="help-last-order"]')
    expect(orders).toHaveStyle({ margin: '0px' })
    expect(orders.firstElementChild).toHaveStyle({ margin: '0px' })
  })

  it('an open topic: the crumbs md over the title, xs at each side of their chevron; the title xl over the body', () => {
    const utils = renderHelp(spaced())
    openTopic(utils)
    const crumbs = utils.getByText('Help').parentElement
    expect(crumbs).toHaveStyle({ marginBottom: `${SPACE.md}px` })
    expect(cssFor(crumbs)).toMatch(new RegExp(`svg\\{[^}]*margin:0 ${SPACE.xs}px`))
    expect(utils.container.querySelector('h1')).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.xl}px` })
  })

  it('with the schema defaults: md and xl of the theme, the card\'s padding (lg) inside a row', () => {
    const theme = themeWithValues()
    const { md, lg, xl } = theme.values.tokens.space
    expect(theme.values.components.card.base.padding).toBe(lg)
    const { container } = renderHelp(theme)
    expect(container.querySelector('ul')).toHaveStyle({ gap: `${md}px`, marginBottom: `${xl}px` })
    expect(container.querySelector('ul > li > button').style.getPropertyValue('--ui-action-card-padding')).toBe(`${lg}px`)
  })
})
