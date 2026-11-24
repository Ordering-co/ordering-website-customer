// The open modals (and dialogs: Confirm / Alert), the last one
// on top. Escape closes only the top one, so a modal opened over another (a
// form over its list, an alert over a form) goes back to the one below.
const openModals = []

/** A dialog opens on top of the open ones (`key`: its own object). */
export const pushOpenModal = (key) => { openModals.push(key) }

/** A dialog leaves the stack (it closed). */
export const removeOpenModal = (key) => {
  const index = openModals.lastIndexOf(key)
  if (index >= 0) openModals.splice(index, 1)
}

/** Whether the dialog of `key` is the top one (Escape is its). */
export const isTopModal = (key) => openModals[openModals.length - 1] === key
