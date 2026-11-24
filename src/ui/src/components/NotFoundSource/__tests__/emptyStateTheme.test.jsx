import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaEntry } from '~/utils/themeSchema'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { NotFoundSource } from '../index'
import { ButtonWrapper, EmptyStateImage, NotFound, emptyStateTheme } from '../styles'

const tight = (css) => css.replace(/\s+/g, '')
const box = (container) => container.querySelector('#not-found-source')

describe('components.empty_state in the schema', () => {
  it('the sizes of today: 56/32 and 360 tall from 768px, 32/16 below, 20 around, the image box of 240 / 160', () => {
    const entry = (path) => schemaEntry(`components.empty_state.${path}`)
    expect(entry('base.padding_y')).toMatchObject({ type: 'space', value: 56 }) // the type of its mobile_web override (a literal off the scale)
    expect(entry('base.padding_x')).toMatchObject({ type: 'space', value: '{space.xxl}' })
    expect(entry('base.min_height')).toMatchObject({ type: 'number', value: 360 })
    expect(entry('base.margin')).toMatchObject({ type: 'number', value: 20 })
    expect(entry('base.image_size')).toMatchObject({ type: 'number', value: 240 })
    expect(entry('platforms.mobile_web.padding_y')).toMatchObject({ type: 'space', value: '{space.xxl}' })
    expect(entry('platforms.mobile_web.padding_x')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(entry('platforms.mobile_web.image_size')).toMatchObject({ type: 'number', value: 160 })
    expect(entry('variants.compact.image_size')).toMatchObject({ type: 'number', value: 160 })
    expect(entry('variants.compact.padding_y')).toMatchObject({ type: 'space', value: '{space.lg}' })
  })
})

describe('emptyStateTheme', () => {
  it('the base, the small screen values over it, the compact variant over both', () => {
    const t = themeWithValues()
    expect(emptyStateTheme(t)).toMatchObject({ padding_y: '56px', padding_x: '32px', min_height: '360px', margin: '20px', image_size: '240px', image_gap: '24px', actions_gap: '16px' })
    expect(emptyStateTheme(t, { narrow: true })).toMatchObject({ padding_y: '32px', padding_x: '16px', min_height: '0px', image_size: '160px', image_gap: '16px' })
    expect(emptyStateTheme(t, { narrow: true, compact: true })).toMatchObject({ padding_y: '16px', padding_x: '0px', image_size: '160px', margin: '0px' })
  })
})

describe('NotFoundSource with components.empty_state', () => {
  const t = themeWithValues((values) => {
    Object.assign(values.components.empty_state.base, { padding_y: 60, padding_x: 40, min_height: 400, margin: 24, image_size: 200 })
    values.platforms.mobile_web.components.empty_state.base.padding_y = 28
    return values
  })

  it('the empty variant: its box from the theme, and below 768px the small screen values', () => {
    const { container } = renderWith(t, <NotFoundSource variant='empty' content='Nothing yet' />)
    const css = tight(cssFor(box(container)))
    expect(css).toMatch(/\.(\w+)\.\1\.\1\.\1\{margin-top:24px;margin-bottom:24px;padding:60px40px;min-height:400px;/)
    expect(css).toContain('@media(max-width:767px){.')
    expect(css).toMatch(/padding:28px16px;min-height:0px;/)
  })

  it('the not found variant: only its margin (no box)', () => {
    const { container } = renderWith(t, <NotFoundSource content='Not found' />)
    const css = tight(cssFor(box(container)))
    expect(css).toMatch(/\.(\w+)\.\1\.\1\.\1\{margin-top:24px;margin-bottom:24px;\}?/)
    expect(css).not.toContain('padding:60px40px')
  })

  it('compact: its variant at every width', () => {
    const { container } = renderWith(t, <NotFoundSource variant='empty' compact content='None' />)
    const css = tight(cssFor(box(container)))
    expect(css).toMatch(/\{margin-top:0px;margin-bottom:0px;padding:16px0px;min-height:0px;/)
  })

  it('the image box of the theme, also for an image on its own', () => {
    renderWith(t, <NotFoundSource variant='empty' content='x' image='https://cdn/x.png' />)
    expect(tight(injectedCss())).toMatch(/>img\{width:200px;height:200px;margin-bottom:24px;/)
    const img = renderWith(t, <EmptyStateImage src='https://cdn/y.png' alt='' data-testid='img' />).getByTestId('img')
    expect(tight(cssFor(img))).toMatch(/\.(\w+)\.\1\.\1\{width:200px;height:200px;/)
  })

  it('the action under the message: base.actions_gap', () => {
    const t2 = themeWithValues((values) => { values.components.empty_state.base.actions_gap = 20; return values })
    const el = renderWith(t2, <ButtonWrapper data-testid='b' />).getByTestId('b')
    expect(tight(cssFor(el))).toContain('margin-top:20px;')
  })
})

describe('NotFound: the empty box reads at a fluid width', () => {
  it('60ch on a phone and 70ch from 768px, never wider than its parent', () => {
    const css = tight(cssFor(renderWith(themeWithValues(), <NotFound $variant='empty' />).container.firstChild))
    expect(css).toContain('max-width:min(100%,60ch)')
    expect(css).toContain('max-width:min(100%,70ch)')
    expect(css).not.toMatch(/480px|560px/)
  })
})
