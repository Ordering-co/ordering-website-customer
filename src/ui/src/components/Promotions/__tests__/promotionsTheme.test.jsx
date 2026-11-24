import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { cssShadow } from '../../../../../utils/themeCss'
import { modalSectionLevel, modalTitleLevel } from '../../Overlay/titleLevel'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { Promotions } from '../index'
import { BusinessInfo, OfferDescriptionWrapper, SingleOfferContainer } from '../styles'

// /promotions with the real Modal and Button: the offer card's resting and
// hover looks, and the offer's modal (its title, heading outline and
// elements)

const OFFERS = [
  { id: 1, name: 'Summer Deal', description: '10% off', type: 2, coupon: 'SUMMER', target: 1, rate_type: 1, rate: 10, end: '2026-12-01', image: 'https://img/offer.png', businesses: [{ id: 7, name: 'Cafe', slug: 'cafe', logo: 'https://img/cafe.png' }] }
]

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: () => 'Jan 1', parsePrice: (v) => `$${v}`, optimizeImage: (url) => url }]
}))
vi.mock('~ui/src/components/SearchBar', () => ({
  SearchBar: ({ placeholder }) => <input placeholder={placeholder} />
}))
const emit = vi.hoisted(() => vi.fn())
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))
// the controller keeps the selected offer, as the real one
vi.mock('~components/components/PromotionsController', () => ({
  PromotionsController: ({ UIComponent, ...rest }) => {
    const [offerSelected, setOfferSelected] = useState(null)
    return (
      <UIComponent
        offersState={{ loading: false, error: null, offers: OFFERS }}
        handleSearchValue={vi.fn()}
        searchValue=''
        offerSelected={offerSelected}
        setOfferSelected={setOfferSelected}
        {...rest}
      />
    )
  }
}))

// a card shadow of its own, so a token (sm / xl) cannot pass for it
const CARD_SHADOW = { x: 0, y: 3, blur: 7, spread: 1, color: '#123456', opacity: 0.3 }
// the offer's card is components.offer_card, the business rows of its modal
// components.card: both with that shadow
const themedWithCardShadow = () => themeWithValues((values) => {
  values.components.card = { ...values.components.card, base: { ...values.components.card.base, shadow: CARD_SHADOW } }
  values.components.offer_card = { ...values.components.offer_card, base: { ...values.components.offer_card.base, shadow: CARD_SHADOW } }
  return values
})

const flat = (text) => text.replace(/\s+/g, '')
// the bodies (without the vendor prefixes of a transform) of the element's own rules whose selector has `:hover`
const hoverRules = (el) => cssFor(el).split('}')
  .map((rule) => rule.split('{'))
  .filter(([selector]) => selector && selector.includes(':hover'))
  .map(([, body = '']) => flat(body).replace(/-(webkit|ms)-transform:[^;]+;/g, ''))
// every box-shadow the element's own rules declare, in order
const shadows = (el) => (flat(cssFor(el)).match(/box-shadow:[^;}]+/g) || []).map((d) => d.slice('box-shadow:'.length))

const renderPromotions = (theme) => renderWithProviders(<Promotions />, { theme })
const card = (view) => view.container.querySelector('[data-doc-section="promotion-card"]')
const openOffer = (view) => {
  fireEvent.click(within(card(view)).getByRole('button', { name: 'Use coupon' }))
  return document.querySelector('[data-doc-section="promotion-details-dialog"]')
}

describe('/promotions offer card', () => {
  it('is not a control: only its "Use coupon" button opens the offer', () => {
    const view = renderPromotions(themeWithValues())
    const el = card(view)
    expect(el.tagName).toBe('DIV')
    expect(el).not.toHaveAttribute('role')
    expect(el).not.toHaveAttribute('tabindex')
    fireEvent.click(el)
    expect(document.querySelector('[data-doc-section="promotion-details-dialog"]')).toBeNull()
    expect(openOffer(view)).not.toBeNull()
  })

  it('no hover; the card shadow of the theme at rest and on hover, no lift, no pointer', () => {
    const theme = themedWithCardShadow()
    const el = card(renderPromotions(theme))
    const expected = flat(cssShadow(CARD_SHADOW))
    // the last box-shadow of its rules is the card's; no rule changes it on hover
    expect(shadows(el).pop()).toBe(expected)
    hoverRules(el).forEach((body) => {
      expect(body).not.toContain('box-shadow')
      expect(body).toBe('transform:none;')
    })
    const css = flat(cssFor(el))
    expect(css).not.toContain('translateY')
    expect(css).not.toContain(flat(cssShadow(theme.values.tokens.shadow.xl)))
    expect(css).not.toContain('cursor:pointer')
  })

  it('a null card shadow is none in both states', () => {
    const el = card(renderPromotions(themeWithValues((values) => {
      values.components.offer_card = { ...values.components.offer_card, base: { ...values.components.offer_card.base, shadow: null } }
      return values
    })))
    expect(shadows(el).pop()).toBe('none')
    hoverRules(el).forEach((body) => expect(body).not.toContain('box-shadow'))
  })

  it('offer_card\'s padding (its mobile_web one below 576px), md between its parts; muted expiry and description', () => {
    const theme = themeWithValues()
    const { space, color } = theme.values.tokens
    const view = renderPromotions(theme)
    const el = card(view)
    expect(el).toHaveStyle({ padding: `${theme.values.platforms.mobile_web.components.offer_card.base.padding}px` })
    expect(flat(cssFor(el))).toContain(`@media(min-width:576px){.${el.className.split(' ').pop()}{padding:${theme.values.components.offer_card.base.padding}px;`)
    const description = within(el).getByText('10% off')
    expect(description).toHaveStyle({ color: color.text_muted, fontSize: `${theme.values.tokens.typography.body.size}px` })
    const footer = description.parentElement
    expect(footer).toHaveStyle({ gap: `${space.md}px` })
    expect(within(footer).getByRole('button', { name: 'Use coupon' }).tagName).toBe('BUTTON')
    const top = footer.previousElementSibling
    expect(top).toHaveStyle({ paddingBottom: `${space.md}px`, marginBottom: `${space.md}px` })
    const expires = within(el).getByText(/Expires/).closest('div')
    expect(expires).toHaveStyle({ color: color.text_muted, marginBottom: `${space.sm}px` })
    // the offer's image: no hover of its own
    const image = el.querySelector('#offer-wrap > div')
    hoverRules(image).forEach((body) => expect(body).toBe('transform:none;'))
  })

  // the rules of the offer's name (`h4, h2` inside its container's class),
  // the wide-screen one (from 720px) apart
  const nameRules = (name) => {
    const css = flat(cssFor(name.parentElement))
    const wide = css.indexOf('@media(min-width:720px)')
    expect(wide).toBeGreaterThan(-1)
    return { base: css.slice(0, wide), wide: css.slice(wide) }
  }

  it('the offer\'s name is an h2 with the whole typography of the theme\'s h4 (also from 720px)', () => {
    const H4 = { size: 21, line: 1.38, weight: 800, letter_spacing: 1 }
    const theme = themeWithValues((values) => {
      values.tokens.typography.h4 = { ...values.tokens.typography.h4, ...H4 }
      // offer_card.base.name_text is {typography.h4}, resolved by the API
      values.components.offer_card.base.name_text = { ...values.components.offer_card.base.name_text, ...H4 }
      return values
    })
    const name = within(card(renderPromotions(theme))).getByRole('heading', { level: 2, name: 'Summer Deal' })
    expect(name).toHaveStyle({ fontSize: '21px', lineHeight: '1.38', fontWeight: '800', letterSpacing: '1px' })
    // no fixed size in its rules, the wide-screen one included
    const { base, wide } = nameRules(name)
    ;[base, wide].forEach((css) => {
      expect(css).toContain('font-size:21px;line-height:1.38;font-weight:800;')
      expect(css).toContain('letter-spacing:1px;')
      expect(css).not.toMatch(/font-size:(16|18)px/)
    })
  })
})

describe('/promotions offer modal', () => {
  it('the offer\'s name is the modal title, in the close\'s row; one heading, its section the level below', () => {
    const theme = themeWithValues()
    const view = renderPromotions(theme)
    const dialog = openOffer(view)
    const titleLevel = Number(modalTitleLevel(theme).slice(1))
    const sectionLevel = Number(modalSectionLevel(theme).slice(1))
    expect(sectionLevel).toBe(titleLevel + 1)

    const headings = within(dialog).getAllByRole('heading')
    expect(headings.map((h) => [h.tagName, h.textContent])).toEqual([
      [`H${titleLevel}`, 'Summer Deal'],
      [`H${sectionLevel}`, 'Available businesses for this offer']
    ])
    // the title is the dialog's title row (its name), the close at its end
    expect(dialog).toHaveAttribute('role', 'dialog')
    expect(dialog).toHaveAccessibleName('Summer Deal')
    expect(headings[0]).toHaveAttribute('data-slot', 'dialog-title')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    // the section's look is its level's, the theme's xl over it and md under it
    const { space, typography } = theme.values.tokens
    expect(headings[1]).toHaveStyle({
      fontSize: `${typography[modalSectionLevel(theme)].size}px`,
      marginTop: `${space.xl}px`,
      marginBottom: `${space.md}px`,
      textAlign: 'start'
    })
    // the modal's own padding, not the page's 30px all around
    expect(dialog).not.toHaveStyle({ padding: '30px' })
  })

  it('its close closes it', async () => {
    const view = renderPromotions(themeWithValues())
    openOffer(view)
    expect(await view.findByRole('dialog', { name: 'Summer Deal' })).toBeInTheDocument()
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
  })

  it('a modal title of the h3 size takes the section to h4', () => {
    const theme = themeWithValues((values) => {
      values.components.modal = { ...values.components.modal, base: { ...values.components.modal.base, title: { ...values.tokens.typography.h3 } } }
      return values
    })
    expect(modalTitleLevel(theme)).toBe('h3')
    const dialog = openOffer(renderPromotions(theme))
    expect(within(dialog).getAllByRole('heading').map((h) => h.tagName)).toEqual(['H3', 'H4'])
  })

  it('rows are still cards with a button; code and terms are panels of surface_alt without hover', () => {
    const theme = themedWithCardShadow()
    const { space, color } = theme.values.tokens
    const dialog = openOffer(renderPromotions(theme))

    // a business row: not a control, a card with the theme's shadow in every state
    const name = within(dialog).getByText('Cafe')
    const info = name.parentElement
    const row = info.parentElement
    expect(row.tagName).toBe('DIV')
    expect(row).not.toHaveAttribute('role')
    expect(row).toHaveStyle({ padding: `${space.md}px`, gap: `${space.md}px`, margin: '0px' })
    expect(shadows(row).pop()).toBe(flat(cssShadow(CARD_SHADOW)))
    hoverRules(row).forEach((body) => {
      expect(body).not.toContain('box-shadow')
      expect(body).toBe('transform:none;')
    })
    expect(info).toHaveStyle({ gap: `${space.md}px`, marginLeft: '0px' })
    // its action: the theme's button, navigating to the business
    const action = within(row).getByRole('button', { name: 'Use coupon' })
    expect(action).toHaveAttribute('data-doc-control', 'promotion-open-business')
    fireEvent.click(action)
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'cafe' } })
    // the rows the theme's md apart
    expect(row.parentElement).toHaveStyle({ gap: `${space.md}px` })

    // the coupon's code
    const code = within(dialog).getByText('SUMMER').parentElement
    expect(code).toHaveStyle({ backgroundColor: color.surface_alt, padding: `${space.sm}px`, marginTop: `${space.xs}px`, marginBottom: `${space.lg}px` })
    expect(within(dialog).getByText('SUMMER')).toHaveStyle({ color: color.primary_text })
    hoverRules(code).forEach((body) => expect(body).not.toContain('box-shadow'))
    expect(flat(cssFor(code))).not.toContain('translateY')

    // the terms panel
    const panel = dialog.querySelector('.offer-data-content-info')
    expect(panel).toHaveStyle({ backgroundColor: color.surface_alt, gap: `${space.xs}px`, padding: `${space.md}px ${space.lg}px` })
    expect(within(dialog).getByText('Terms and conditions')).toHaveStyle({ fontSize: `${theme.values.tokens.typography.label.size}px`, fontWeight: '600' })
    // (its rules are OfferData's, `.offer-data-content-info`): still on hover
    hoverRules(panel).forEach((body) => expect(body).toBe('transform:none;'))
  })
})

describe('/promotions sections and offer card (pages.promotions, offer_card)', () => {
  const withOfferCard = (base, mutate = (values) => values) => themeWithValues((values) => {
    values.components.offer_card.base = { ...values.components.offer_card.base, ...base }
    return mutate(values)
  })

  it('the search can be hidden', () => {
    const shown = renderPromotions(themeWithValues())
    expect(shown.getByPlaceholderText('Search promotion')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderPromotions(themeWithValues((values) => {
      values.pages.promotions = { footer: null, sections: [{ key: 'search', visible: false }] }
      return values
    }))
    expect(hidden.queryByPlaceholderText('Search promotion')).toBeNull()
    expect(card(hidden)).not.toBeNull()
  })

  it('the card\'s box, padding (mobile_web below 576px) and dashed line of offer_card', () => {
    const theme = withOfferCard({ background: '#FAFAFA', radius: 7, padding: 28, divider: { width: 2, color: '#ABCDEF', style: 'dotted' } })
    const el = card(renderPromotions(theme))
    const css = flat(cssFor(el))
    expect(css).toContain('background:#FAFAFA;')
    expect(css).toContain('border-radius:7px;')
    expect(css).toContain(`padding:${theme.values.platforms.mobile_web.components.offer_card.base.padding}px;`)
    expect(css).toMatch(/@media\(min-width:576px\)\{[^}]*padding:28px;/)
    expect(flat(cssFor(el.firstElementChild))).toContain('border-bottom:2pxdotted#ABCDEF;')
  })

  it('the texts of offer_card (expiry, name, description) and its image', () => {
    const theme = withOfferCard({
      expiry_text: { size: 11, line: 1.36, weight: 500 },
      expiry_color: '#101010',
      name_color: '#202020',
      description_text: { size: 13, line: 1.31, weight: 400 },
      description_color: '#303030',
      image_size: 90,
      image_radius: 3
    })
    const el = card(renderPromotions(theme))
    expect(within(el).getByText(/Expires/).closest('div')).toHaveStyle({ fontSize: '11px', color: '#101010' })
    expect(within(el).getByRole('heading', { level: 2, name: 'Summer Deal' })).toHaveStyle({ color: '#202020' })
    expect(within(el).getByText('10% off')).toHaveStyle({ fontSize: '13px', color: '#303030' })
    const image = flat(cssFor(el.querySelector('#offer-wrap > div')))
    expect(image).toContain('border-radius:3px;')
    expect(image).toMatch(/@media\(min-width:576px\)\{[^}]*width:90px;min-width:90px;height:90px;/)
  })

  it('the "Use coupon" buttons take slots.action; the coupon box takes its code props', () => {
    const theme = withOfferCard({ code_background: '#EEDDCC', code_color: '#0000AA' }, (values) => {
      values.components.offer_card.slots.action = { ...values.components.offer_card.slots.action, color: 'secondary' }
      return values
    })
    const view = renderPromotions(theme)
    // the base Button of the slot's color
    const secondary = componentVars(theme, 'button', { size: 'md', color: 'secondary', appearance: 'solid' })['--ui-button-background']
    const isSecondary = (button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.style.getPropertyValue('--ui-button-background')).toBe(secondary)
    }
    isSecondary(within(card(view)).getByRole('button', { name: 'Use coupon' }))
    const dialog = openOffer(view)
    within(dialog).getAllByRole('button', { name: 'Use coupon' }).forEach(isSecondary)
    expect(within(dialog).getByText('SUMMER').parentElement).toHaveStyle({ backgroundColor: '#EEDDCC' })
    expect(within(dialog).getByText('SUMMER')).toHaveStyle({ color: '#0000AA' })
  })

  it('the search is a section of the page, the sections\' xl from the offers', () => {
    const themed = renderPromotions(themeWithValues())
    const search = themed.container.querySelector('[data-doc-control="promotions-search"]')
    expect(flat(cssFor(search))).toMatch(/margin-bottom:24px;/)
  })
})

describe('/promotions offer parts the theme hides (visibility promotions.offer.*)', () => {
  const hide = () => themeWithValues((values) => {
    values.visibility['promotions.offer.image'] = false
    values.visibility['promotions.offer.description'] = false
    values.visibility['promotions.offer.apply_for'] = false
    return values
  })
  const offerImages = (root) => root.querySelectorAll('[style*="offer.png"]')

  it('by default: image, description and "Apply for" are shown', () => {
    const view = renderPromotions(themeWithValues())
    const el = card(view)
    expect(offerImages(el)).toHaveLength(1)
    expect(within(el).getByText('10% off')).toBeInTheDocument()
    expect(within(el).getByText('Apply for:')).toBeInTheDocument()
  })

  it('the keys hide them on the card, and the image in the modal too', () => {
    const view = renderPromotions(hide())
    const el = card(view)
    expect(offerImages(el)).toHaveLength(0)
    expect(within(el).queryByText('10% off')).toBeNull()
    expect(within(el).queryByText('Apply for:')).toBeNull()
    const dialog = openOffer(view)
    expect(offerImages(dialog)).toHaveLength(0)
  })

  it('by default the modal shows the description and both show the expiry date', () => {
    const view = renderPromotions(themeWithValues())
    expect(within(card(view)).getByText(/Expires/)).toBeInTheDocument()
    const dialog = openOffer(view)
    expect(within(dialog).getByText('10% off')).toBeInTheDocument()
    expect(within(dialog).getByText(/Expires:/)).toBeInTheDocument()
  })

  it('promotions.offer.description hides the description in the modal too', () => {
    const view = renderPromotions(hide())
    const dialog = openOffer(view)
    expect(within(dialog).queryByText('10% off')).toBeNull()
    // the rest of the offer stays
    expect(within(dialog).getByText('Terms and conditions')).toBeInTheDocument()
  })

  it('promotions.offer.expires hides the expiry date on the card and in the modal', () => {
    const view = renderPromotions(themeWithValues((values) => {
      values.visibility['promotions.offer.expires'] = false
      return values
    }))
    const el = card(view)
    expect(within(el).queryByText(/Expires/)).toBeNull()
    expect(within(el).getByText('Summer Deal')).toBeInTheDocument()
    const dialog = openOffer(view)
    expect(within(dialog).queryByText(/Expires/)).toBeNull()
    expect(within(dialog).getByText('10% off')).toBeInTheDocument()
  })
})

// implementation notesno container writes a size over the Button of the offer: its own box (min-width 0, no shrink) is the piece's
describe('Promotions: the rows place the action Button, they write no width over it', () => {
  it.each([[OfferDescriptionWrapper], [BusinessInfo], [SingleOfferContainer]])('%#', (Styled) => {
    const view = renderWith(themeWithValues(), <Styled data-testid='row' />)
    const css = cssFor(view.getByTestId('row')).replace(/\s+/g, '')
    view.unmount()
    expect(css).not.toMatch(/min-width:(fit|max)-content|[,}>]button[,{][^}]*width/)
  })
})
