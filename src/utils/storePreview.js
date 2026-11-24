/**
 * Private store. A private project answers its public API with
 * 403 `STORE_PRIVATE` unless the request carries the preview token in
 * `X-Preview-Token-X`. The token arrives once as `?preview=<token>`: it is kept
 * (memory + localStorage), taken off the URL, and sent only to the API origin
 * by the boot shims (src/shims/network-boot.js). The 403 flips `storePrivate`
 * (read it with useStorePrivate) so App shows the private-store screen, which
 * trades the password for the token (unlockStorePreview).
 */
export const PREVIEW_PARAM = 'preview'
export const PREVIEW_STORAGE_KEY = 'ordering_store_preview'
export const PREVIEW_HEADER = 'X-Preview-Token-X'
const PRIVATE_CODE = 'STORE_PRIVATE'

let memoryToken = null
let storePrivate = false
const listeners = new Set()

// The iframe of the demo is third-party: Safari can block storage altogether.
const readStored = () => {
  try { return window.localStorage.getItem(PREVIEW_STORAGE_KEY) } catch { return null }
}
const writeStored = (token) => {
  try { window.localStorage.setItem(PREVIEW_STORAGE_KEY, token) } catch {}
}

export const getStorePreviewToken = () => memoryToken || (memoryToken = readStored() || null)

/** Keeps a token (memory + localStorage): the one `?preview=` brings or the password unlock returns. */
export const setStorePreviewToken = (token) => {
  memoryToken = token
  writeStored(token)
}

/** Takes `?preview=<token>` off the URL and keeps it. Returns the token in use. */
export const captureStorePreviewToken = () => {
  try {
    const url = new URL(window.location.href)
    const token = url.searchParams.get(PREVIEW_PARAM)
    if (token === null) return getStorePreviewToken()
    url.searchParams.delete(PREVIEW_PARAM)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    if (token) setStorePreviewToken(token)
  } catch {}
  return getStorePreviewToken()
}

/** Whether `url` (string, URL or Request URL) points at the API origin and so may carry the token. */
export const isApiUrl = (url, apiUrl) => {
  if (!url || !apiUrl) return false
  try {
    return new URL(url, window.location.href).origin === new URL(apiUrl).origin
  } catch {
    return false
  }
}

/** Marks the store private when a 403 answer carries STORE_PRIVATE. */
export const detectStorePrivate = (status, body) => {
  if (status !== 403 || storePrivate || typeof body !== 'string' || !body.includes(PRIVATE_CODE)) return
  storePrivate = true
  listeners.forEach((listener) => listener())
}

const WRONG_PASSWORD_CODE = 'STORE_PREVIEW_WRONG_PASSWORD'
const RATE_LIMITED_CODE = 'STORE_PREVIEW_RATE_LIMITED'

/**
 * Trades the password for the preview token (POST store_preview/unlock, open to
 * everybody). The API refuses with 400 and an `error_codes`, so the codes are
 * read (a 429, which it does not emit today, also counts as `rate`). Resolves the token; rejects with `{ reason }`:
 * `wrong` (the password), `rate` (too many attempts) or `network` (anything else).
 */
export const unlockStorePreview = async (ordering, password) => {
  let content, status
  try {
    const response = await ordering.post('store_preview/unlock', { password })
    content = response.content
    status = response.status
  } catch {
    throw { reason: 'network' } // eslint-disable-line no-throw-literal
  }
  const codes = Array.isArray(content?.error_codes) ? content.error_codes : []
  const token = content?.result?.token
  if (!content?.error && typeof token === 'string' && token) return token
  throw { reason: status === 429 || codes.includes(RATE_LIMITED_CODE) ? 'rate' : codes.includes(WRONG_PASSWORD_CODE) ? 'wrong' : 'network' } // eslint-disable-line no-throw-literal
}

export const isStorePrivate = () => storePrivate
export const subscribeStorePrivate = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test helper: back to a clean boot. */
export const resetStorePreview = () => {
  memoryToken = null
  storePrivate = false
  listeners.clear()
}
