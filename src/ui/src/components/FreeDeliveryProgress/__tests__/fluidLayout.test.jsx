import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Message } from '../styles'

// implementation notesthe message's base is its reading measure (ch), not 140px.
describe('FreeDeliveryProgress fluid layout', () => {
  it('the message grows from 18ch', () => {
    const { getByText } = renderWith(themeWithValues(), <Message>text</Message>)
    expect(cssFor(getByText('text'))).toContain('flex:1 1 18ch')
    expect(cssFor(getByText('text'))).not.toContain('140px')
  })
})
