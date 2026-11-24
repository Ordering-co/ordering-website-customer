import { describe, expect, it } from 'vitest'
import themeSchema from '../../theme.compiled.json'
import { withFirstLoadThemeVersion } from '../network-boot'

const FIRST_LOAD = 'https://api.test/v400/es/development/frontends/first_load'

describe('withFirstLoadThemeVersion', () => {
  it('asks first_load for the v2 theme of the marketplace', () => {
    expect(withFirstLoadThemeVersion(FIRST_LOAD)).toBe(`${FIRST_LOAD}?theme_version=2&product_type=${themeSchema.product_type}&theme_schema_version=${themeSchema.version}`)
  })

  it('keeps the query it has', () => {
    expect(withFirstLoadThemeVersion(`${FIRST_LOAD}?params=a%2Cb`)).toBe(`${FIRST_LOAD}?params=a%2Cb&theme_version=2&product_type=${themeSchema.product_type}&theme_schema_version=${themeSchema.version}`)
  })

  it('sets this build\'s theme_version, product_type and theme_schema_version whatever the caller put', () => {
    expect(withFirstLoadThemeVersion(`${FIRST_LOAD}?theme_version=1&product_type=other&theme_schema_version=1.0.0`))
      .toBe(`${FIRST_LOAD}?theme_version=2&product_type=${themeSchema.product_type}&theme_schema_version=${themeSchema.version}`)
  })

  it('leaves any other request as it is', () => {
    const theme = 'https://api.test/v400/es/development/theme'
    const request = { url: FIRST_LOAD }
    expect(withFirstLoadThemeVersion(theme)).toBe(theme)
    expect(withFirstLoadThemeVersion(`${FIRST_LOAD}_extra`)).toBe(`${FIRST_LOAD}_extra`)
    expect(withFirstLoadThemeVersion(request)).toBe(request)
    expect(withFirstLoadThemeVersion('/frontends/first_load')).toBe('/frontends/first_load')
  })
})
