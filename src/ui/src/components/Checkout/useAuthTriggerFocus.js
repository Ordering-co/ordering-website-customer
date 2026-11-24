import { useEffect, useRef } from 'react'

// Login and Sign up, opened from the checkout's links (the marks `data-checkout-auth`), close onto the link
// that opened them. Base UI cannot do it: it picks the element to return to while the dialog
// leaves the DOM, and the "Your details" links are rebuilt in that same commit (their component is a new
// function on every render), so the clicked link is gone and the new one is not yet in. The dialog is told
// not to return the focus (`finalFocus`), and it is given after the commit, to the link of that moment.
// A dialog opened by something else (Place order) keeps Base UI's own return.
export const useAuthTriggerFocus = (open) => {
  const openedBy = useRef(null)
  useEffect(() => {
    if (open) return
    const kind = openedBy.current
    openedBy.current = null
    // after a login the links are gone (the customer is in): nothing to focus
    if (kind) document.querySelector(`[data-checkout-auth='${kind}']`)?.focus({ preventScroll: true })
  }, [open])
  return {
    openedBy: (kind) => { openedBy.current = kind },
    finalFocus: () => !openedBy.current
  }
}
