import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { getThemeLogoUrl } from '../../../../../utils/siteBranding'
import { LogoHeader as HeaderLogo } from '../../../components/Header/styles'
import { LogoHeader as SearchLogo } from '../../../components/SearchProducts/styles'
import { FormSide } from '../../../components/ResetPassword/styles'
import { LogoImg } from '../../../components/CancellationComponent/styles'
import { LogoWrapper } from '../../../components/HomeHero/styles'
import { CancellationComponent } from '../../../components/CancellationComponent'
import { logoBox } from '..'
import { schemaEntry } from '~/utils/themeSchema'
import THEME_COMPILED from '~/theme.compiled.json'

// T6 (docs/theme-v2/imagenes-tamanos.md §3.4): the theme never stretches a
// logo; its box is defined by the height, the width follows the image up to a
// maximum.
const css = (theme, Component, props = {}) => {
  const ui = Component === LogoImg
    ? <Component {...props} alt='logo' />
    : <Component {...props}><img alt='logo' src='/logo.png' /></Component>
  const { container } = renderWith(theme, ui)
  return cssFor(container.firstChild)
}

describe('logo boxes', () => {
  it('header: 45 tall and up to 200 wide, fitted', () => {
    const themed = css(themeWithValues(), HeaderLogo)
    expect(themed).toMatch(/height:\s*45px/)
    expect(themed).toMatch(/max-width:\s*200px/)
    expect(themed).toMatch(/width:\s*auto/)
    expect(themed).toMatch(/object-fit:\s*contain/)
    expect(themed).not.toMatch(/width:\s*150px/)
  })

  it('SearchProducts: the header box, and the logo is a button', () => {
    const { container } = renderWith(themeWithValues(), <SearchLogo><img alt='logo' src='/logo.png' /></SearchLogo>)
    expect(container.querySelector('button')).toHaveAttribute('type', 'button')
    const themed = cssFor(container.firstChild)
    expect(themed).toMatch(/height:\s*45px/)
    expect(themed).toMatch(/max-width:\s*200px/)
  })

  it('ResetPassword and the site out of service: 60 tall, up to 240 wide', () => {
    ;[[FormSide, {}], [LogoImg, { src: '/logo.png' }]].forEach(([Component, props]) => {
      const themed = css(themeWithValues(), Component, props)
      expect(themed).toMatch(/height:\s*60px/)
      expect(themed).toMatch(/max-width:\s*240px/)
      expect(themed).toMatch(/object-fit:\s*contain/)
    })
  })

  it('mobile hero: up to 60 tall and fitted', () => {
    const themed = css(themeWithValues(), LogoWrapper)
    expect(themed).toMatch(/max-height:\s*60px/)
    expect(themed).toMatch(/object-fit:\s*contain/)
  })
})

// The sizes of the logo boxes are values of the theme (components.header.base)
const withLogoSizes = (sizes) => themeWithValues((values) => {
  values.components.header.base = { ...values.components.header.base, ...sizes }
  return values
})

describe('logo sizes of the theme (header.base.logo_* / screen_logo_*)', () => {
  it('the schema defaults are the T6 boxes', () => {
    const base = (prop) => schemaEntry(`components.header.base.${prop}`)
    expect(base('logo_height')).toMatchObject({ type: 'number', value: 45 })
    expect(base('logo_width')).toMatchObject({ type: 'number', value: 200 })
    expect(base('screen_logo_height')).toMatchObject({ type: 'number', value: 60 })
    expect(base('screen_logo_width')).toMatchObject({ type: 'number', value: 240 })
  })

  it('logoBox: the theme\'s sizes; one out of range is clamped, one that is not a number keeps the default', () => {
    const theme = withLogoSizes({ logo_height: 40, logo_width: 160, screen_logo_height: 80, screen_logo_width: 300 })
    expect(logoBox(theme, 'header')).toEqual({ height: 40, maxWidth: 160 })
    expect(logoBox(theme, 'screen')).toEqual({ height: 80, maxWidth: 300 })
    expect(logoBox(theme, 'hero')).toEqual({ maxHeight: 80 })
    const [minHeight] = THEME_COMPILED.values.components.header.base.logo_height.$rule
    expect(logoBox(withLogoSizes({ logo_height: 0, logo_width: '160px' }), 'header')).toEqual({ height: minHeight, maxWidth: 200 })
    expect(logoBox(themeWithValues(), 'header')).toEqual({ height: 45, maxWidth: 200 })
    expect(logoBox(themeWithValues(), 'screen')).toEqual({ height: 60, maxWidth: 240 })
    expect(logoBox(themeWithValues(), 'hero')).toEqual({ maxHeight: 60 })
  })

  it('the header, its overlays, the standalone screens and the hero take them', () => {
    const theme = withLogoSizes({ logo_height: 40, logo_width: 160, screen_logo_height: 80, screen_logo_width: 300 })
    ;[HeaderLogo, SearchLogo].forEach((Component) => {
      const header = css(theme, Component)
      expect(header).toMatch(/height:\s*40px/)
      expect(header).toMatch(/max-width:\s*160px/)
    })
    ;[[FormSide, {}], [LogoImg, { src: '/logo.png' }]].forEach(([Component, props]) => {
      const screen = css(theme, Component, props)
      expect(screen).toMatch(/height:\s*80px/)
      expect(screen).toMatch(/max-width:\s*300px/)
    })
    expect(css(theme, LogoWrapper)).toMatch(/max-height:\s*80px/)
  })
})

describe('site out of service: the logo over the dark hero', () => {
  const LOGOTYPE = 'https://cdn.test/logotype-inverse.svg'
  const ISOTYPE = 'https://cdn.test/isotype-inverse.svg'
  const withInverse = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
  const Button = ({ children }) => <button type='button'>{children}</button>
  const Input = (props) => <input {...props} />

  const renderCancellation = (theme) => renderWithProviders(
    <CancellationComponent ButtonComponent={Button} InputComponent={Input} />,
    { theme }
  )

  // null without an <img> at all (no logo and no own name: never a broken image)
  const logoSrc = (theme) => {
    const img = renderCancellation(theme).container.querySelector('img[alt="Logo"]')
    return img ? img.getAttribute('src') : null
  }

  it('takes images.logotype_inverse, else the logotype (not images.isotype_inverse)', () => {
    expect(logoSrc(withInverse({ logotype_inverse: LOGOTYPE, isotype_inverse: ISOTYPE }))).toBe(LOGOTYPE)
    const isotypeOnly = withInverse({ isotype_inverse: ISOTYPE, logotype: 'https://cdn.test/logotype.svg' })
    expect(logoSrc(isotypeOnly)).toBe(getThemeLogoUrl(isotypeOnly))
  })

  it('without it, the site\'s logo', () => {
    const theme = withInverse({ logotype: 'https://cdn.test/logotype.svg' })
    expect(logoSrc(theme)).toBe(getThemeLogoUrl(theme))
  })

  it('without any logo and without an own name: no <img>, no broken image', () => {
    expect(logoSrc(themeWithValues())).toBeNull()
  })

  it('without any logo, the site\'s own name as text instead', () => {
    const theme = themeWithValues((values) => { values.site.name = 'Acme Eats'; return values })
    const { getByText, container } = renderCancellation(theme)
    expect(container.querySelector('img[alt="Logo"]')).toBeNull()
    expect(getByText('Acme Eats')).toBeInTheDocument()
  })
})
