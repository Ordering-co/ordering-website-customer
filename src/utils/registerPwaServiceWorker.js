// onNeedReload no-op: autoUpdate would reload the open tab when a new SW activates; the new code enters on the next load (mandatory updates go through the front_version modal in App.js).
const keepTabOpen = () => {}

export const registerPwaServiceWorker = (registerSW, { enabled = true } = {}) => {
  if (!enabled || typeof registerSW !== 'function') return undefined

  try {
    return registerSW({ immediate: true, onNeedReload: keepTabOpen })
  } catch (error) {
    return undefined
  }
}
