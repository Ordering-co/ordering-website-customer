import { describe, expect, it } from 'vitest'
import { isSegmentWriteKey } from '../segmentWriteKey'

describe('isSegmentWriteKey', () => {
  it.each([
    'GTM-KW3L9HQV',
    'G-ABC12345',
    'UA-123456-1',
    '123456789012345',
    '',
    '0',
    '   ',
    'has/slash',
    'abcdefg',
    'a'.repeat(65)
  ])('rejects %s', (value) => {
    expect(isSegmentWriteKey(value)).toBe(false)
  })

  it.each([null, undefined])('rejects %s', (value) => {
    expect(isSegmentWriteKey(value)).toBe(false)
  })

  it('accepts an alphanumeric Segment write key', () => {
    expect(isSegmentWriteKey('aB1cD2eF3gH4iJ5k')).toBe(true)
  })

  it('accepts a trimmed key and the length bounds', () => {
    expect(isSegmentWriteKey('  aB1cD2eF3gH4iJ5k  ')).toBe(true)
    expect(isSegmentWriteKey('a'.repeat(8))).toBe(true)
    expect(isSegmentWriteKey('a'.repeat(64))).toBe(true)
  })
})
