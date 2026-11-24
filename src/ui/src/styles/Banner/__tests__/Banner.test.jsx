import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaEntry } from '~/utils/themeSchema'
import { bannerBoxCss, bannerSpace, bannerTextCss, bannerTheme } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { BannerContainer, BannerContent, BannerTitle } from '../../../components/CustomOrderBanner/styles'
import { RewardsBannerContainer } from '../../../components/RewardsBanner/styles'
import { ImageWrapper } from '../../../components/PageBanner/styles'

const tight = (css) => css.replace(/\s+/g, '')

describe('components.banner in the schema', () => {
  it('a promo banner on the alt surface and a rewards one as a raised card', () => {
    expect(schemaEntry('components.banner.base.radius')).toMatchObject({ type: 'radius', value: '{radius.md}' })
    expect(schemaEntry('components.banner.variants.promo.background')).toMatchObject({ type: 'color', value: '{color.surface_alt}' })
    expect(schemaEntry('components.banner.variants.promo.padding')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(schemaEntry('components.banner.variants.rewards.background')).toMatchObject({ type: 'color', value: '{color.surface}' })
    expect(schemaEntry('components.banner.variants.rewards.shadow')).toMatchObject({ type: 'shadow', value: '{shadow.sm}' })
    expect(schemaEntry('components.banner.variants.rewards.padding')).toMatchObject({ type: 'space', value: '{space.md}' })
  })
})

describe('bannerTheme and its helpers', () => {
  it('base and variant merged; an unknown variant is promo', () => {
    const t = themeWithValues()
    expect(bannerTheme(t, 'rewards').padding).toBe(12)
    expect(bannerTheme(t, 'nope')).toEqual(bannerTheme(t, 'promo'))
    expect(bannerSpace(t, 'promo', 'padding')).toBe('16px')
    expect(bannerSpace(t, 'promo', 'gap')).toBe('8px')
    // the defaults' Identity casts its sm shadow on the promo box
    expect(bannerBoxCss(t, 'promo')).toMatch(/box-shadow: [^;]+;/)
    expect(bannerTextCss(t, 'promo', 'text')).toContain('font-size: 14px;')
  })
})

describe('components.banner in the screens', () => {
  const t = themeWithValues((values) => {
    Object.assign(values.components.banner.variants.promo, { background: '#F0F0F0', padding: 20 })
    Object.assign(values.components.banner.variants.rewards, { background: '#FFFFFF', padding: 14 })
    values.components.banner.base.radius = 14
    values.components.banner.base.gap = 6
    return values
  })

  it('the custom order banner: the promo box, its padding and the gap under its title', () => {
    const box = renderWith(t, <BannerContainer data-testid='b' />).getByTestId('b')
    expect(tight(cssFor(box))).toMatch(/\.([\w-]+)\.\1\{background:#F0F0F0;border-radius:14px;/)
    const content = renderWith(t, <BannerContent data-testid='c' />).getByTestId('c')
    expect(tight(cssFor(content))).toMatch(/\.([\w-]+)\.\1\{padding:20px;\}?/)
    const title = renderWith(t, <BannerTitle>Title</BannerTitle>).getByText('Title')
    expect(tight(cssFor(title))).toContain('margin-bottom:6px;')
  })

  it('the rewards banner: the rewards box and padding', () => {
    const box = renderWith(t, <RewardsBannerContainer data-testid='r' />).getByTestId('r')
    expect(tight(cssFor(box))).toMatch(/\.([\w-]+)\.\1\.\1\{background:#FFFFFF;border-radius:14px;[^}]*padding:14px;/)
  })

  it('the page banners: the image at the carousel\'s radius (components.promo_carousel)', () => {
    const carousel = themeWithValues((values) => { values.components.promo_carousel.base.radius = 14; return values })
    const el = renderWith(carousel, <ImageWrapper data-testid='i' />).getByTestId('i')
    expect(tight(cssFor(el))).toContain('.banner-img{border-radius:14px;')
  })
})
