const MIN_SEGMENT_WRITE_KEY_LENGTH = 8
const MAX_SEGMENT_WRITE_KEY_LENGTH = 64
const SEGMENT_WRITE_KEY = /^[A-Za-z0-9]+$/

export const isSegmentWriteKey = (value) => {
  if (typeof value !== 'string') return false
  const key = value.trim()
  if (key.length < MIN_SEGMENT_WRITE_KEY_LENGTH || key.length > MAX_SEGMENT_WRITE_KEY_LENGTH) return false
  if (/^\d+$/.test(key)) return false
  return SEGMENT_WRITE_KEY.test(key)
}
