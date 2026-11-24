import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { stepConnectorCss, stepsTheme } from '../index'
import { StepBadge, stepState } from '~ui/src/components/PreorderDateTimeSteps/styles'
import { StepperDot, StepperLine } from '~ui/src/components/CustomOrderModal/styles'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

afterEach(cleanup)

const theme = () => themeWithValues((values) => {
  const steps = values.components.steps
  steps.base = {
    radius: 9999,
    text: { size: 14, line: 1.43, weight: 600 },
    connector: { width: 2, color: '#2C7BE5', style: 'dashed' },
    connector_opacity: 0.4
  }
  steps.sizes = { sm: { size: 12 }, md: { size: 28 } }
  steps.variants.default.states = {
    complete: { background: '#2C7BE5', color: '#FFFFFF', border: null },
    active: { background: '#E9F2FE', color: '#2C7BE5', border: { width: 2, color: '#2C7BE5', style: 'solid' } },
    idle: { background: '#F8F9FA', color: '#616161', border: { width: 2, color: '#D8D8D8', style: 'solid' } }
  }
  return values
})

describe('components.steps', () => {
  it('the schema defaults: today\'s markers (28 / 12), complete on the primary, active on its light fill', () => {
    const themed = themeWithValues()
    const { color } = themed.values.tokens
    expect(stepsTheme(themed, { size: 'md' }).size).toBe(28)
    expect(stepsTheme(themed, { size: 'sm' }).size).toBe(12)
    expect(stepsTheme(themed, { state: 'complete' })).toMatchObject({ background: color.primary, color: color.on_primary, border: null })
    expect(stepsTheme(themed, { state: 'active' })).toMatchObject({ background: color.primary_subtle, color: color.primary_text })
    expect(stepsTheme(themed, { state: 'idle' })).toMatchObject({ background: color.surface_alt, color: color.text_muted })
    // the defaults' Identity has no borders (border_style.width none): no line
    expect(themed.values.tokens.border_style.width).toBe('none')
    expect(stepsTheme(themed).connector).toBeNull()
    expect(stepsTheme(themed).connector_opacity).toBe(0.4)
  })

  it('the connector: its border on one side and its opacity', () => {
    expect(stepConnectorCss(theme(), 'left')).toContain('border-left: 2px dashed #2C7BE5;')
    expect(stepConnectorCss(theme(), 'left')).toContain('opacity: 0.4;')
    expect(stepConnectorCss(theme(), 'top')).toContain('border-top: 2px dashed #2C7BE5;')
  })

  it('PreorderDateTimeSteps: the step badge is the md marker of its state', () => {
    expect(stepState(true, true)).toBe('complete')
    expect(stepState(false, true)).toBe('active')
    expect(stepState(false, false)).toBe('idle')
    const { getByText } = renderWith(theme(), (
      <>
        <StepBadge completed active>1</StepBadge>
        <StepBadge active={false}>2</StepBadge>
      </>
    ))
    expect(cssFor(getByText('1'))).toContain('width:28px;min-width:28px;height:28px')
    expect(cssFor(getByText('1'))).toContain('background:#2C7BE5')
    expect(cssFor(getByText('2'))).toContain('border:2px solid #D8D8D8')
  })

  it('CustomOrderModal: the route\'s points are sm markers, the line the connector', () => {
    const { container } = renderWith(theme(), (
      <div>
        <StepperDot active />
        <StepperLine />
        <StepperDot active filled />
        <StepperDot />
      </div>
    ))
    const [pickup, line, delivery, empty] = container.firstChild.children
    expect(cssFor(pickup)).toContain('width:12px')
    expect(cssFor(pickup)).toContain('background:#E9F2FE')
    expect(cssFor(delivery)).toContain('background:#2C7BE5')
    expect(cssFor(empty)).toContain('background:#F8F9FA')
    expect(cssFor(line)).toContain('border-left:2px dashed #2C7BE5')
    expect(cssFor(line)).toContain('opacity:0.4')
  })
})
