import { describe, expect, it } from 'vitest'
import {
  integrationIds,
  isPlaceholderId,
  validFacebookAppId,
  validFacebookPixelId,
  validGoogleAnalyticsId,
  validOneSignalAppId
} from '../integrationIds'

describe('isPlaceholderId', () => {
  it('blank values', () => {
    expect(isPlaceholderId(null)).toBe(true)
    expect(isPlaceholderId(undefined)).toBe(true)
    expect(isPlaceholderId('')).toBe(true)
    expect(isPlaceholderId('   ')).toBe(true)
    expect(isPlaceholderId('0')).toBe(true)
    expect(isPlaceholderId(0)).toBe(true)
  })

  it('the config\'s filler text, case-insensitive and trimmed', () => {
    expect(isPlaceholderId('Add your Google Analytics ID')).toBe(true)
    expect(isPlaceholderId('add your facebook pixel id')).toBe(true)
    expect(isPlaceholderId('  Add Your OneSignal App Id  ')).toBe(true)
  })

  it('a real id is not a placeholder', () => {
    expect(isPlaceholderId('G-ABC123')).toBe(false)
    expect(isPlaceholderId('123456789')).toBe(false)
  })
})

describe('validGoogleAnalyticsId', () => {
  it('a GA4 id (G-XXXX), trimmed', () => {
    expect(validGoogleAnalyticsId('G-ABC123')).toBe('G-ABC123')
    expect(validGoogleAnalyticsId('  G-ABC123  ')).toBe('G-ABC123')
  })

  it('a UA id (UA-123-1)', () => {
    expect(validGoogleAnalyticsId('UA-123456789-1')).toBe('UA-123456789-1')
  })

  it('a placeholder, blank or malformed value: null', () => {
    expect(validGoogleAnalyticsId('Add your Google Analytics ID')).toBeNull()
    expect(validGoogleAnalyticsId('')).toBeNull()
    expect(validGoogleAnalyticsId(null)).toBeNull()
    expect(validGoogleAnalyticsId('not-an-id')).toBeNull()
    expect(validGoogleAnalyticsId('UA-123')).toBeNull()
  })
})

describe('validFacebookPixelId', () => {
  it('a digits-only id, trimmed', () => {
    expect(validFacebookPixelId('123456789012345')).toBe('123456789012345')
    expect(validFacebookPixelId(' 123  ')).toBe('123')
  })

  it('a placeholder, blank or non-numeric value: null', () => {
    expect(validFacebookPixelId('Add your Facebook Pixel ID')).toBeNull()
    expect(validFacebookPixelId('')).toBeNull()
    expect(validFacebookPixelId('abc123')).toBeNull()
  })
})

describe('validFacebookAppId', () => {
  it('same rule as the Pixel id (login and Pixel share facebook_id)', () => {
    expect(validFacebookAppId('1234567890')).toBe('1234567890')
    for (const value of [null, '', 0, '0', 'Add your Facebook ID', 'fb-app']) {
      expect(validFacebookAppId(value)).toBeNull()
    }
  })
})

describe('validOneSignalAppId', () => {
  it('a UUID (8-4-4-4-12 hex), trimmed, case-insensitive', () => {
    expect(validOneSignalAppId('01234567-89ab-cdef-0123-456789abcdef')).toBe('01234567-89ab-cdef-0123-456789abcdef')
    expect(validOneSignalAppId('  01234567-89AB-CDEF-0123-456789ABCDEF  ')).toBe('01234567-89AB-CDEF-0123-456789ABCDEF')
  })

  it('a placeholder, blank or malformed value: null', () => {
    expect(validOneSignalAppId('Add your OneSignal App ID')).toBeNull()
    expect(validOneSignalAppId('')).toBeNull()
    expect(validOneSignalAppId('not-a-uuid')).toBeNull()
    expect(validOneSignalAppId('01234567-89ab-cdef-0123')).toBeNull()
  })
})

describe('integrationIds', () => {
  const configs = {
    track_id_google_analytics: { value: 'G-CONFIG1' },
    facebook_id: { value: '1122334455' },
    segment_track_id: { value: 'config-segment-key' }
  }
  const settings = {
    store_google_analytics_id: 'G-STORE1',
    store_facebook_pixel_id: '9988776655',
    store_segment_id: 'store-segment-key'
  }

  it('marketplace (not single business): the config ids', () => {
    expect(integrationIds({ configs, settings, singleBusiness: false })).toEqual({
      gaId: 'G-CONFIG1',
      pixelId: '1122334455',
      segmentKey: 'config-segment-key'
    })
  })

  it('single business active and the store ids are valid: the store ids', () => {
    expect(integrationIds({ configs, settings, singleBusiness: true })).toEqual({
      gaId: 'G-STORE1',
      pixelId: '9988776655',
      segmentKey: 'store-segment-key'
    })
  })

  it('single business active but the store id is empty: null (not mounted), even though the config has one', () => {
    const emptyStoreSettings = { store_google_analytics_id: '', store_facebook_pixel_id: '', store_segment_id: '' }
    expect(integrationIds({ configs, settings: emptyStoreSettings, singleBusiness: true })).toEqual({
      gaId: null,
      pixelId: null,
      segmentKey: null
    })
  })

  it('marketplace with a placeholder config: null (not mounted)', () => {
    const placeholderConfigs = {
      track_id_google_analytics: { value: 'Add your Google Analytics ID' },
      facebook_id: { value: 'Add your Facebook Pixel ID' },
      segment_track_id: { value: '0' }
    }
    expect(integrationIds({ configs: placeholderConfigs, settings, singleBusiness: false })).toEqual({
      gaId: null,
      pixelId: null,
      segmentKey: null
    })
  })

  it('nothing given: every id null', () => {
    expect(integrationIds()).toEqual({ gaId: null, pixelId: null, segmentKey: null })
  })
})
