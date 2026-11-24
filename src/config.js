import baseSettings from './config.json'
import localSettings from 'virtual:marketplace-local-config'

const runtimeOverride = (typeof window !== 'undefined' && window.__CONFIG__) || {}

// Dev-only override so a developer can target a real site locally without editing config.json; production never sets import.meta.env.DEV.
const devEnvOverride = import.meta.env.DEV
  ? {
      ...(import.meta.env.VITE_PROJECT ? { project: import.meta.env.VITE_PROJECT } : {}),
      ...(import.meta.env.VITE_APP_ID ? { app_id: import.meta.env.VITE_APP_ID } : {})
    }
  : {}

const localOverride = import.meta.env.DEV && localSettings._local_project_pin ? localSettings : {}
if (localOverride.project && runtimeOverride.project && runtimeOverride.project !== localOverride.project) {
  throw new Error('Local Website project conflicts with Worker configuration')
}
if (localOverride.project && devEnvOverride.project && devEnvOverride.project !== localOverride.project) {
  throw new Error('Local Website project conflicts with VITE_PROJECT')
}

const settings = {
  ...baseSettings,
  ...devEnvOverride,
  ...runtimeOverride,
  ...localOverride,
  api: {
    ...(baseSettings.api || {}),
    ...(runtimeOverride.api || {}),
    ...(localOverride.api || {})
  },
  ...(localOverride._local_project_pin
    ? { socket: { ...(baseSettings.socket || {}), ...(runtimeOverride.socket || {}), ...(localOverride.socket || {}) } }
    : {})
}

const keysToNull = [
  'franchiseSlug',
  'businessSlug',
  'store_facebook_pixel_id',
  'store_google_analytics_id',
  'store_segment_id'
]

keysToNull.forEach(key => {
  if (settings[key] === '0' || settings[key] === 'null') {
    settings[key] = null
  };
})

export default settings
