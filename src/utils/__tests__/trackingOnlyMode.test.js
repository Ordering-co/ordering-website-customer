import { describe, expect, it } from 'vitest'
import { isCourierTrackingProject } from '../trackingOnlyMode'

describe('isCourierTrackingProject', () => {
  it('matches the listed courier projects', () => {
    expect(isCourierTrackingProject('quickiedelivery')).toBe(true)
    expect(isCourierTrackingProject('quickiedeliverystaging')).toBe(true)
  })

  it('ignores other projects and missing values', () => {
    expect(isCourierTrackingProject('luisv4plus')).toBe(false)
    expect(isCourierTrackingProject('')).toBe(false)
    expect(isCourierTrackingProject(null)).toBe(false)
    expect(isCourierTrackingProject()).toBe(false)
  })
})
