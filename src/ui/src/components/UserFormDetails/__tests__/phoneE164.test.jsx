import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { InputPhoneNumber } from '~ui/src/components/InputPhoneNumber'

vi.unmock('~ui/src/components/InputPhoneNumber')
// setupTests stubs the library for the screens' tests; the base InputPhone is the real thing here
vi.unmock('react-phone-number-input')
vi.mock('libphonenumber-js', () => ({ default: () => ({ isValid: () => true }) }))

// implementation notesthe library logs an error for a value that is not E.164
const draw = (value) => renderWith(themeWithValues(), <InputPhoneNumber label='Phone' value={value} setValue={vi.fn()} handleIsValid={vi.fn()} user={{}} />)

describe('the phone input and the value of the forms', () => {
  it('a number with a space makes the library log an error; the E.164 the forms give it does not', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    draw('+12025550199')
    expect(error).not.toHaveBeenCalled()
    draw('+1 2025550199')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
