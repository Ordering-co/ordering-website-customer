import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { InfoCard, MapToggleLane, MapTrackingWrapper, PersonRow, StageIcon, TabsContainer, stageSizeCss } from '../styles'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { cssFor, renderWith, defaultTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

afterEach(cleanup)

const theme = (base = {}) => themeWithValues((values) => {
  Object.assign(values.components.order_tracking.base, base)
  return values
})

describe('components.order_tracking: the stages of the bar', () => {
  it('the schema defaults: today\'s 50px circle and the lg icon', () => {
    const { base } = themeWithValues().values.components.order_tracking
    expect(base.step_size).toBe(50)
    expect(base.step_icon_size).toBe(themeWithValues().values.tokens.icon.lg)
  })

  it('step_size: the circle, centered on its point; step_icon_size: its icon', () => {
    const { getByTestId } = renderWith(theme({ step_size: 40, step_icon_size: 20 }), (
      <StageIcon position={25} data-testid='stage'><svg /></StageIcon>
    ))
    const css = cssFor(getByTestId('stage'))
    expect(css).toContain('width:40px;height:40px;left:calc(25% - 20px)')
    expect(css).toContain('font-size:20px')
    expect(css).toMatch(/svg\{width:20px;height:20px;/)
  })

  it('the defaults: a 50px circle centered on its point', () => {
    expect(stageSizeCss(defaultTheme, 25)).toContain('width: 50px; height: 50px; left: calc(25% - 25px);')
    const { getByTestId } = renderWith(defaultTheme, <StageIcon position={25} data-testid='stage' />)
    const css = cssFor(getByTestId('stage'))
    expect(css).toContain('width:50px')
    expect(css).toContain('left:calc(25% - 25px)')
  })
})

describe('the people of the order (components.avatar)', () => {
  it('a person\'s row keeps xl between the avatar and its texts', () => {
    const themed = themeWithValues()
    const { getByTestId } = renderWith(themed, <PersonRow data-testid='row' />)
    expect(cssFor(getByTestId('row'))).toContain(`gap:${themed.values.tokens.space.xl}px`)
  })

  it('the driver\'s avatar of the order page, md before the name', () => {
    const themed = themeWithValues()
    const { container } = renderWith(themed, <Avatar variant='photo' endSpace='md' src='/d.jpg' size='lg' />)
    const avatar = container.firstChild
    expect(avatar.style.getPropertyValue('--ui-avatar-size')).toBe(themed.css.components.avatar.sizes.lg.size)
    expect(avatar.className).toContain('ui:me-md')
  })
})

describe('the blocks under the tracking header (pages.order_details, group tracking)', () => {
  it('each one space.xl below and none above, so they keep one space in any order', () => {
    const themed = themeWithValues()
    const xl = `${themed.values.tokens.space.xl}px`
    const { getByTestId } = renderWith(themed, (
      <>
        <MapTrackingWrapper data-testid='map'><MapToggleLane data-testid='toggle'>Map</MapToggleLane></MapTrackingWrapper>
        <TabsContainer data-testid='tabs' />
        <InfoCard data-testid='card' />
      </>
    ))
    ;['map', 'tabs', 'card'].forEach((id) => {
      expect(cssFor(getByTestId(id))).toContain(`margin-top:0;margin-bottom:${xl}`)
    })
    // the map's toggle leaves the space to its block
    expect(cssFor(getByTestId('toggle'))).toContain('width:100%;margin:0;')
  })
})

describe('the stages of the bar: reached and still to come', () => {
  it('a reached stage is filled with step_active, its icon on_primary', () => {
    const themed = theme({ step_active: '#123456', step_inactive: '#654321' })
    const { getByTestId } = renderWith(themed, <StageIcon active position={0} data-testid='stage' />)
    const css = cssFor(getByTestId('stage'))
    expect(css).toContain('background-color:#123456')
    expect(css).toContain(`color:${themed.values.tokens.color.on_primary}`)
  })

  it('one still to come is a ring of step_inactive with its icon of that color, never on_primary', () => {
    const themed = theme({ step_active: '#123456', step_inactive: '#654321' })
    const { getByTestId } = renderWith(themed, <StageIcon position={0} data-testid='stage' />)
    const css = cssFor(getByTestId('stage'))
    expect(css).toContain('color:#654321')
    expect(css).toMatch(/border:\d+px solid #654321/)
    expect(css).not.toContain('background-color:#654321')
    expect(css).not.toContain(`color:${themed.values.tokens.color.on_primary}`)
  })
})
