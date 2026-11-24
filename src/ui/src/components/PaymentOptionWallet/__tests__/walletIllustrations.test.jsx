import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeIconSize } from '~/utils/themeTokens'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { getUtils } from '../utils'

describe('wallet illustrations (shared by Cart, Checkout and OrderRewardsBanner through getIcon)', () => {
  it('each wallet is an image file at the theme\'s lg icon size, decorative, with no inline svg', () => {
    const theme = themeWithValues()
    const { getIcon } = getUtils()
    const cash = renderWithProviders(<div>{getIcon('cash')}</div>, { theme })
    const img = cash.container.querySelector('img')
    expect(img).toHaveAttribute('src', BUNDLED_IMAGES.illustrations.walletCredits)
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', parseInt(themeIconSize(theme, 'lg'), 10).toString())
    expect(img).toHaveAttribute('height', parseInt(themeIconSize(theme, 'lg'), 10).toString())
    expect(cash.container.querySelector('svg')).toBeNull()
    cash.unmount()
    const points = renderWithProviders(<div>{getIcon('credit_point')}</div>, { theme })
    expect(points.container.querySelector('img')).toHaveAttribute('src', BUNDLED_IMAGES.illustrations.walletPoints)
  })

  it('the artwork keeps its own colors (not the theme\'s)', () => {
    const credits = readFileSync('src/assets/illustrations/wallet-credits.svg', 'utf8')
    expect(credits).toContain('#FFCF23')
    expect(credits).not.toContain('currentColor')
  })
})
