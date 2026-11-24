import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// setupTests.js mocks the styles globally: the real CSS here.
const { UserData } = await vi.importActual('~ui/src/components/UserProfileForm/styles')

// implementation notesthe data column gives its texts and fields three quarters of its width; the Button in it is no child
// of that rule, so no `> button { width: auto }` has to take it back
describe('UserProfileForm: UserData', () => {
  it('three quarters of the width for what is not a Button, nothing written over a Button', () => {
    const { container } = renderWith(themeWithValues(), <UserData />)
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(css).toMatch(/>:not\(button\)\{width:75%;\}/)
    expect(css).not.toMatch(/>button/)
    expect(css).not.toMatch(/>\*\{[^}]*width/)
  })
})
