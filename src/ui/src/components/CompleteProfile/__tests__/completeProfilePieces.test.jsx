import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CompleteProfile } from '../index'

// implementation notes"Skip for now" is the design system's Button (primary ghost).

// stable tuple: a fresh `user` each render would loop the [user]-keyed effect
const { sessionTuple } = vi.hoisted(() => ({ sessionTuple: [{ auth: true, user: { id: 1 } }, { refreshUserInfo: () => {} }] }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => sessionTuple }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => null }))
vi.mock('~ui/src/components/LogoutButton', () => ({ LogoutButton: () => null }))

describe('CompleteProfile: the pieces', () => {
  it('Skip for now is the base Button (a button, not a submit) and skips on click', () => {
    const onSkip = vi.fn()
    const { getByRole } = renderWithProviders(<CompleteProfile missingFields={['name']} checkoutFields={[]} canSkip onSkip={onSkip} />)
    const skip = getByRole('button', { name: 'Skip for now' })
    expect(skip).toHaveAttribute('data-slot', 'button')
    expect(skip).toHaveAttribute('type', 'button')
    // primary ghost: the text is the primary color, no fill
    expect(skip.style.getPropertyValue('--ui-button-background')).toBe('transparent')
    fireEvent.click(skip)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })
})
