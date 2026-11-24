// implementation notes / implementation notes, fase 1: la puerta de activación del overlay de viewport. Solo desarrollo.
// src/index.js la llama tras `import.meta.env.DEV`; el build de producción no la incluye.
//   ?viewport_debug=1  enciende y lo recuerda en sessionStorage (sobrevive a recargas y a navegar dentro de la SPA)
//   ?viewport_debug=0  apaga y olvida
export const VIEWPORT_DEBUG_PARAM = 'viewport_debug'
export const VIEWPORT_DEBUG_STORAGE_KEY = 'viewport_debug'

const readStorage = (storage) => {
  try { return storage ? storage.getItem(VIEWPORT_DEBUG_STORAGE_KEY) : null } catch (e) { return null }
}
const writeStorage = (storage, value) => {
  try {
    if (!storage) return
    if (value === null) storage.removeItem(VIEWPORT_DEBUG_STORAGE_KEY)
    else storage.setItem(VIEWPORT_DEBUG_STORAGE_KEY, value)
  } catch (e) { /* sin sessionStorage (modo privado): solo vale el parámetro */ }
}

/** Pura: ¿debe estar encendido? false si no es DEV; el parámetro manda sobre lo recordado. */
export const shouldEnableViewportDebug = ({ dev, search = '', storage = null } = {}) => {
  if (!dev) return false
  const param = new URLSearchParams(search).get(VIEWPORT_DEBUG_PARAM)
  if (param === '1') return true
  if (param === '0') return false
  return readStorage(storage) === '1'
}

/** Aplica la puerta: recuerda u olvida la activación y, si está encendido, carga y monta el overlay. */
export const autoMountViewportDebug = async ({ dev = import.meta.env.DEV, win = window } = {}) => {
  let storage = null
  try { storage = win.sessionStorage } catch (e) { storage = null }
  const search = win.location.search
  const param = new URLSearchParams(search).get(VIEWPORT_DEBUG_PARAM)
  if (!dev) return false
  if (param === '1') writeStorage(storage, '1')
  if (param === '0') writeStorage(storage, null)
  const enabled = shouldEnableViewportDebug({ dev, search, storage })
  // apagado: no se carga nada más (en una carga nueva no hay overlay que desmontar)
  if (enabled) (await import('./mount')).mountViewportDebug()
  return enabled
}
