import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LEGACY_LAYERS, MOBILE_FIELD_MIN_TEXT, PROGRESS_PULSE, PROGRESS_PULSE_MS, SPINNER_SLOW_TURN, SPINNER_SLOW_TURN_MS, SPINNER_TURN, SPINNER_TURN_MS,
  srOnlyCss, visuallyHiddenControlCss
} from '..'
import * as Rules from '..'

const read = (file) => readFileSync(path.join(__dirname, '../../..', file), 'utf8')

describe('named rules', () => {
  it('the phone field floor is the one of the pieces sheet (they read it by CSS; no helper without a consumer)', () => {
    expect(read('design-system/styles.css')).toContain(`--ui-field-min-text: ${MOBILE_FIELD_MIN_TEXT};`)
    expect(Rules).not.toHaveProperty('mobileFieldTextCss')
  })

  it('sr-only text is out of the flow, clipped to a pixel and keeps no box', () => {
    for (const rule of ['position: absolute', 'width: 1px', 'height: 1px', 'margin: -1px', 'overflow: hidden', 'clip: rect(0 0 0 0)', 'white-space: nowrap']) {
      expect(srOnlyCss).toContain(rule)
      expect(visuallyHiddenControlCss).toContain(rule)
    }
    expect(visuallyHiddenControlCss).toContain('opacity: 0')
  })

  it('the pieces write each legacy layer as a whole Tailwind class equal to its number', () => {
    const uses = {
      popover: 'design-system/components/Popover.jsx',
      dialog: 'design-system/components/Dialog.jsx',
      sheet: 'design-system/components/Sheet.jsx',
      selectList: 'design-system/components/Select.jsx'
    }
    for (const [layer, file] of Object.entries(uses)) expect(read(file)).toContain(`ui:z-${LEGACY_LAYERS[layer]}`)
    expect(read('design-system/components/Popover.jsx')).toContain(`ui:z-${LEGACY_LAYERS.selectList}`)
    // the share menu reads its layer from the named rule, not a literal
    expect(read('components/ProductShare/styles.js')).toMatch(/z-index:\s*\$\{LEGACY_LAYERS\.shareMenu\}/)
    expect(LEGACY_LAYERS.shareMenu).toBe(9999999)
  })

  it('the spinner turns once in 800 ms, and in 2400 ms when it keeps turning with reduced motion', () => {
    expect([SPINNER_TURN_MS, SPINNER_SLOW_TURN_MS]).toEqual([800, 2400])
    expect([SPINNER_TURN, SPINNER_SLOW_TURN]).toEqual(['800ms', '2400ms'])
    expect([PROGRESS_PULSE_MS, PROGRESS_PULSE]).toEqual([1600, '1600ms'])
  })
})
