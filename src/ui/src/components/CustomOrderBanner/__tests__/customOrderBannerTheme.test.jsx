import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { schemaDefault, schemaEntry } from '~/utils/themeSchema'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Button } from '~ui/src/design-system/components/Button'
import { CustomOrderBanner } from '../index'
import { BannerContainer, BannerContent, BannerImage, BannerSubtitle, BannerTitle, promoImageWidth } from '../styles'

const tight = (css) => css.replace(/\s+/g, '')

const custom = themeWithValues((values) => {
  Object.assign(values.components.banner.base, { title_color: '#101010', text_color: '#505050' })
  Object.assign(values.components.banner.variants.promo, {
    max_height: 280,
    image_width: 'third',
    stacked_image_height: 200,
    image_focus_y: 30
  })
  values.components.banner.slots.action = { component: 'button', size: 'lg', appearance: 'outline', color: 'secondary', shape: null }
  return values
})

describe('components.banner (promo) in the schema', () => {
  it('today\'s custom order banner: colors, 330px, half image, 160px on a phone, 70%; its action a primary md button', () => {
    expect(schemaEntry('components.banner.base.title_color')).toMatchObject({ type: 'color', value: '{color.text}' })
    expect(schemaEntry('components.banner.base.text_color')).toMatchObject({ type: 'color', value: '{color.text_muted}' })
    const promo = (prop) => schemaEntry(`components.banner.variants.promo.${prop}`)
    expect(promo('max_height')).toMatchObject({ type: 'number', value: 330 })
    expect(promo('image_width')).toMatchObject({ type: 'option', value: 'half', options: ['third', 'half', 'two_thirds'] })
    expect(promo('stacked_image_height')).toMatchObject({ type: 'number', value: 160 })
    expect(promo('image_focus_y')).toMatchObject({ type: 'number', value: 70 })
    expect(schemaDefault('components.banner.slots.action')).toEqual({ component: 'button', size: 'md', appearance: 'solid', color: 'primary', shape: null })
  })
})

describe('the custom order banner (components.banner promo)', () => {
  it('the image\'s share, height on a phone and point in view; the text takes the rest', () => {
    expect(promoImageWidth(custom)).toBeCloseTo(33.3333, 3)
    const image = tight(cssFor(renderWith(custom, <BannerImage data-testid='i' />).getByTestId('i')))
    expect(image).toContain('@media(max-width:767px)')
    expect(image).toContain('height:200px;')
    expect(image).toContain('img{object-position:center30%;')
    expect(image).toContain('width:33.3333%;height:auto;')
    const content = tight(cssFor(renderWith(custom, <BannerContent data-testid='c' />).getByTestId('c')))
    expect(content).toContain('width:66.6667%;')
  })

  it('its greatest height, unless the screen sets one', () => {
    const box = tight(cssFor(renderWith(custom, <BannerContainer data-testid='b' />).getByTestId('b')))
    expect(box).toContain('max-height:280px;')
    const own = tight(cssFor(renderWith(custom, <BannerContainer maxHeight='180px' data-testid='o' />).getByTestId('o')))
    expect(own).toContain('max-height:180px;')
    expect(own).not.toContain('max-height:280px')
  })

  it('title and text colors', () => {
    expect(tight(cssFor(renderWith(custom, <BannerTitle>T</BannerTitle>).getByText('T')))).toMatch(/color:#101010;$/)
    expect(tight(cssFor(renderWith(custom, <BannerSubtitle>S</BannerSubtitle>).getByText('S')))).toMatch(/color:#505050;$/)
  })

  it('the action is the base button and takes the action slot (size, appearance, color)', () => {
    const { getByText } = renderWithProviders(<CustomOrderBanner onCustomOrderClick={vi.fn()} />, { theme: custom })
    const button = getByText('Custom order').closest('button')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('data-doc-control', 'custom-order-open')
    const expected = renderWith(custom, <Button size='lg' appearance='outline' color='secondary'>X</Button>).getByText('X').closest('button')
    expect(button.getAttribute('style')).toBe(expected.getAttribute('style'))
    // the slot's size is the lg one, not the md of the default theme
    expect(button.style.getPropertyValue('--ui-button-height')).toBe(`${schemaDefault('tokens.size.lg')}px`)
    const plain = renderWithProviders(<CustomOrderBanner onCustomOrderClick={vi.fn()} />, { theme: themeWithValues() })
    expect(plain.container.querySelector('button').getAttribute('style')).not.toBe(button.getAttribute('style'))
  })

  it('without a slot of its own: a primary md button; the click answers', () => {
    const onClick = vi.fn()
    const { getByText } = renderWithProviders(<CustomOrderBanner onCustomOrderClick={onClick} />, { theme: themeWithValues() })
    const button = getByText('Custom order').closest('button')
    const expected = renderWith(themeWithValues(), <Button size='md' color='primary'>X</Button>).getByText('X').closest('button')
    expect(button.getAttribute('style')).toBe(expected.getAttribute('style'))
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
