// The server render paints no portal and flushes nothing (modals and popups open on a click):
// `react-dom` (the client entry) is replaced by this in the landing's SSR bundle, which would
// otherwise carry the whole DOM renderer. `react-dom/server` is untouched.
export const createPortal = (children) => children
export const flushSync = (fn) => fn()
export default { createPortal, flushSync }
