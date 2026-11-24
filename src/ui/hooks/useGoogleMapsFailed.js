import { useEffect, useState } from 'react'

// useGoogleMaps (src/@/components) injects #google-maps-sdk and never
// notices a rejected key (gm_authFailure), a network error on the script, or
// a request that never calls back. This hook does, so the UI layer can swap
// the JS map for the Mapbox static failover instead of Google's own error UI.
export const GOOGLE_MAPS_FAILURE_TIMEOUT_MS = 10000

// Module-level: every map on the page shares the one #google-maps-sdk
// script, so once Google fails it has failed for all of them, not just the
// map that noticed.
let failed = false
const subscribers = new Set()
let authFailureInstalled = false
let scriptErrorInstalled = false
let timeoutStarted = false
let timeoutId = null

const markFailed = () => {
  if (failed) return
  failed = true
  if (timeoutId != null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  subscribers.forEach((notify) => notify())
}

const installAuthFailureHook = () => {
  if (authFailureInstalled) return
  authFailureInstalled = true
  const previous = window.gm_authFailure
  window.gm_authFailure = (...args) => {
    markFailed()
    previous?.(...args)
  }
}

// A resource's `error` event never bubbles, but it does reach window in the
// capturing phase (same trick global error trackers use), so this catches
// #google-maps-sdk whether it was already in the document or gets appended
// after this hook's first mount.
const installScriptErrorHook = () => {
  if (scriptErrorInstalled) return
  scriptErrorInstalled = true
  window.addEventListener('error', (event) => {
    if (event.target?.id === 'google-maps-sdk') markFailed()
  }, true)
}

// The clock runs only once #google-maps-sdk exists: a page whose maps are
// all static never loads the SDK, and that is not a failure. Failing needs
// the script seen on one tick and google.maps still missing on the next, so
// it always got at least a whole GOOGLE_MAPS_FAILURE_TIMEOUT_MS to load.
const startTimeoutOnce = () => {
  if (timeoutStarted) return
  timeoutStarted = true
  let scriptSeen = false
  const tick = () => {
    timeoutId = null
    if (window.google?.maps || failed) return
    // no map is listening any more: stop, the next one to mount restarts it
    if (!subscribers.size) {
      timeoutStarted = false
      return
    }
    if (scriptSeen) return markFailed()
    scriptSeen = !!document.getElementById('google-maps-sdk')
    timeoutId = setTimeout(tick, GOOGLE_MAPS_FAILURE_TIMEOUT_MS)
  }
  tick()
}

/** Test-only: clears the shared state between specs. */
export const resetGoogleMapsFailed = () => {
  failed = false
  authFailureInstalled = false
  scriptErrorInstalled = false
  timeoutStarted = false
  if (timeoutId != null) clearTimeout(timeoutId)
  timeoutId = null
  subscribers.clear()
  delete window.gm_authFailure
}

/**
 * Whether Google Maps' JS SDK has failed: no `apiKey`, `gm_authFailure`
 * (rejected key, referrer, quota), the `#google-maps-sdk` script's `error`
 * event, or `window.google.maps` still missing after
 * GOOGLE_MAPS_FAILURE_TIMEOUT_MS from this hook's first mount. Once
 * `google.maps` exists the timeout no longer applies, but a later
 * `gm_authFailure` still counts.
 */
export const useGoogleMapsFailed = (apiKey) => {
  const [local, setLocal] = useState(failed)

  useEffect(() => {
    installAuthFailureHook()
    installScriptErrorHook()

    // only this map: the key may just not have loaded yet (configs), so it
    // must not mark Google failed for the whole page
    if (!apiKey) {
      setLocal(true)
      return undefined
    }

    setLocal(failed)
    if (failed) return undefined

    const notify = () => setLocal(true)
    subscribers.add(notify)
    if (!window.google?.maps) startTimeoutOnce()
    return () => subscribers.delete(notify)
  }, [apiKey])

  return local
}
