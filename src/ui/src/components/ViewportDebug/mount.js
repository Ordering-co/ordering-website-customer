import { VIEWPORT_DEBUG_ID, createViewportDebug } from './core'

// implementation notes / implementation notes, fase 1: solo desarrollo (lo carga autoMount.js, que solo existe tras import.meta.env.DEV).
//
// Qué mide en la tienda, con selectores que ya existen (no se edita ningún componente):
//   cabecera              [data-app-header]                                  (Header/index.js, y lo lee useKeyboardOpen)
//   barra del carrito     [data-doc-section='business-cart-bar']             (MobileCartViewWrapper; solo con carrito visible, <576 px)
//   navegación inferior   [data-doc-section='mobile-bottom-navigation']      (NavigationBarContainer; solo <576 px)
// `data-doc-section` es el gancho de las capturas de documentación: si alguien lo renombra, la fila pasa a «no encontrado».
const bySelector = (selector) => (doc) => doc.querySelector(selector)

export const VIEWPORT_DEBUG_TARGETS = [
  { key: 'header', label: 'Cabecera', short: 'cabecera', find: bySelector('[data-app-header]'), right: true },
  { key: 'cart', label: 'Barra del carrito', short: 'carrito', find: bySelector("[data-doc-section='business-cart-bar']"), right: true },
  { key: 'nav', label: 'Navegación inferior', short: 'nav', find: bySelector("[data-doc-section='mobile-bottom-navigation']"), right: true, bottom: true }
]

// lo que lleva cada entrada del registro: el rect de la nav y el right de la cabecera
export const VIEWPORT_DEBUG_COMPACT = [
  { key: 'nav', label: 'nav', mode: 'rect' },
  { key: 'header', label: 'cab', mode: 'right' }
]

let current = null

/** Monta el overlay fuera de #root (en document.body). Devuelve la función que lo desmonta. Montar dos veces no duplica. */
export const mountViewportDebug = () => {
  if (current && document.getElementById(VIEWPORT_DEBUG_ID)) return current.unmount
  const instance = createViewportDebug({ win: window, targets: VIEWPORT_DEBUG_TARGETS, compact: VIEWPORT_DEBUG_COMPACT })
  const unmount = () => {
    instance.unmount()
    if (current && current.instance === instance) current = null
  }
  current = { instance, unmount }
  return unmount
}

/** Desmonta el overlay si está montado (lo usa ?viewport_debug=0). */
export const unmountViewportDebug = () => { if (current) current.unmount() }
