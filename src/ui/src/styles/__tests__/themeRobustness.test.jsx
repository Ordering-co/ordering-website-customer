import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { buildAppTheme } from '../../../../utils/appTheme'
import { buildCompleteValues, envelope } from '../../../../utils/__tests__/fixtures/themeFixtures'
import { defaultTheme, injectedCss, local, renderWith } from './themeTestUtils'
import { Button } from '../../design-system/components/Button'
import { Input } from '../../design-system/components/Input'
import { Textarea } from '../../design-system/components/Textarea'
import { Switch } from '../../design-system/components/Switch'
import { Checkbox } from '../../design-system/components/Checkbox'
import { Tabs, Tab } from '../Tabs'

/**
 * The primitives never throw and never emit CSS that leaks out of its rule
 * with a theme carrying bad or missing values.
 */

afterEach(cleanup)

// buildCompleteValues shares objects between calls: clone before mutating.
const themeWith = (mutate) => {
  const values = structuredClone(buildCompleteValues())
  mutate(values)
  return buildAppTheme(local, envelope(values))
}

const AllPrimitives = () => (
  <>
    <Button color='primary'>primary</Button>
    <Button color='primary' appearance='outline'>outline</Button>
    <Button color='secondary'>secondary</Button>
    <Button color='neutral' appearance='ghost'>ghost</Button>
    <Button color='unknownColor'>unknown</Button>
    <Button>none</Button>
    <Button shape='icon' color='primary' aria-label='i'>i</Button>
    <Input aria-label='a' />
    <Input aria-label='b' invalid />
    <Textarea aria-label='c' />
    <Switch aria-label='d' defaultChecked />
    <Checkbox aria-label='e' />
    <Tabs variant='primary'><Tab active>a</Tab><Tab>b</Tab></Tabs>
    <Tabs variant='underline'><Tab active>a</Tab></Tabs>
  </>
)

// A value that broke out of its declaration shows up as a selector with a
// property in it (`.x background:{…}`) or as a rule for another element.
const expectContainedCss = () => {
  const css = injectedCss()
  expect(css).not.toMatch(/\.[\w-]+ [a-z-]+:\{/)
  expect(css).not.toMatch(/\bbody\s*\{\s*display/)
  expect(css).not.toMatch(/\{color\.|\{ink\}|\{radius\./)
}

const CASES = [
  ['button.variants null', (v) => { v.components.button.variants = null }],
  ['button.variants missing', (v) => { delete v.components.button.variants }],
  ['a color without one appearance', (v) => { delete v.components.button.variants.primary.outline }],
  ['states null', (v) => {
    Object.values(v.components.button.variants).forEach((byAppearance) => {
      Object.values(byAppearance).forEach((appearance) => { appearance.states = null })
    })
    v.components.input.variants.default.states = null
  }],
  ['invalid colors', (v) => {
    v.tokens.color.primary = 'azul'
    v.components.button.variants.primary.solid.background = 'azul'
    v.components.tabs.variants.pill.active = '#12'
    v.components.input.base.background = null
    v.components.switch.base.on = 'azul'
    v.components.checkbox.base.checked = '#12'
  }],
  ['string and negative sizes', (v) => {
    v.components.button.base.radius = '8px'
    v.components.input.base.radius = -4
    v.components.switch.base.width = -40
    v.components.checkbox.base.size = -2
  }],
  ['bad text, shadow and border', (v) => {
    v.components.button.sizes.md.text = { weight: 'bold' }
    v.components.button.variants.primary.solid.shadow = '0 1px 2px red'
    v.components.input.base.border = { color: null }
    v.components.button.variants.primary.outline.border = { style: 'solid' }
  }],
  ['sections of the wrong type', (v) => {
    v.tokens = null
    v.components.tabs = []
    v.components.switch = { base: 'x' }
    v.components.checkbox = 'x'
    v.platforms = { mobile_web: { components: 'x' } }
  }],
  ['unresolved aliases', (v) => {
    v.tokens.color.primary = '{color.primary}'
    v.components.button.variants.primary.solid.background = '{color.primary}'
    v.components.input.base.text_color = '{ink}'
    v.components.tabs.base.radius = '{radius.md}'
    v.components.tabs.variants.pill.active = '{ink}'
    v.components.switch.base.on = '{color.primary}'
    v.components.checkbox.base.checked = '{ink}'
  }],
  ['a value with declaration delimiters', (v) => {
    v.components.button.variants.primary.solid.background = 'red; } body { display: none'
    v.components.input.base.placeholder = "#000'"
  }]
]

describe('primitives with a bad theme', () => {
  it.each(CASES)('%s: renders and keeps the CSS contained', (_, mutate) => {
    const theme = themeWith(mutate)
    expect(() => renderWith(theme, <AllPrimitives />)).not.toThrow()
    expectContainedCss()
  })

  it('with the defaults theme the primitives render', () => {
    expect(() => renderWith(defaultTheme, <AllPrimitives />)).not.toThrow()
  })
})
