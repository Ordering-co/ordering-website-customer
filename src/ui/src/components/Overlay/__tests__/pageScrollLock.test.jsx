import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { lockPageScroll, unlockPageScroll } from '../pageScrollLock'

afterEach(() => {
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

describe('page scroll lock of the modals', () => {
  it('the first lock saves the body, the last unlock restores it', () => {
    document.body.style.overflow = 'scroll'
    lockPageScroll()
    expect(document.body.style.overflow).toBe('hidden')
    lockPageScroll()
    unlockPageScroll()
    // one modal still open: still locked
    expect(document.body.style.overflow).toBe('hidden')
    unlockPageScroll()
    expect(document.body.style.overflow).toBe('scroll')
    // an extra unlock does nothing
    unlockPageScroll()
    expect(document.body.style.overflow).toBe('scroll')
  })

})
