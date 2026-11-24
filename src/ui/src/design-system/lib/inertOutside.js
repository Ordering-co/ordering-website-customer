import { useLayoutEffect } from 'react'

// Base UI hides what is behind a modal from assistive technology (`aria-hidden`) and traps Tab with
// two focus guards whose redirect lands a frame later: a Tab that comes sooner (a key held down, a
// driven keyboard) goes on to the page behind, which stays tabbable. While a layer is
// open, what surrounds its portal is `inert`: not focusable, not clickable, whatever the timing.
// The legacy popups' root (`#app-modals`) is left alone: a popup may open inside it over the layer.
const LEGACY_ROOT_ID = 'app-modals'
// The layers that are open, in the order they opened (the last one is the one in front). Only that one
// isolates the page: two layers opened in the same render (two sibling dialogs) would otherwise each make
// the other inert and leave the person nothing to reach. When the front one closes, the
// next one is isolated again, and a layer that is not in front is itself inert.
const layers = []
// What this module made inert: a sibling that was already inert is the page's own, not ours to release.
const owned = new Set()
// How long a closing layer may take to leave the DOM (its exit motion) before the focus is no longer ours to place
const LEAVING_LIMIT = 2000
// Safari does not focus a button when it is clicked, so a layer opened by a click has no focused element to
// hand the focus back to: the last pointer press stands in for it, until a key press says it was the keyboard.
let pressed = null
let opener = null
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (event) => { pressed = event.target.closest?.('button, a[href], [tabindex]') }, true)
  document.addEventListener('keydown', () => { pressed = null }, true)
}

// What surrounds a layer's portal, up to the body (the popup of a layer nested in another one is
// inside the parent's portal, so the parent's own backdrop and popup are among them).
const outside = (node) => {
  const found = []
  for (let el = node.closest('[data-base-ui-portal]') || node; el && el !== document.body; el = el.parentElement) {
    Array.from(el.parentElement?.children || []).forEach((sibling) => {
      if (sibling === el || sibling.id === LEGACY_ROOT_ID || (sibling.hasAttribute('inert') && !owned.has(sibling)) || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) return
      found.push(sibling)
    })
  }
  return found
}

// A layer paints over the ones that opened before it, as it takes the interaction: its backdrop and viewport
// (the portal's fixed parts) keep their own level (a dialog's 20002, a sheet's 20601) unless an earlier layer
// is at or above it, and then go just over that one. A dialog opened over a side sheet (an alert over the
// cart) would otherwise stay under it, and be unreadable while it is the only thing that answers.
// A layer nested in another one (its portal is inside the parent's) is above it by the DOM, at the parent's level.
const stack = () => {
  const levels = new Map()
  let floor = 0
  layers.filter((node) => node.isConnected).forEach((node) => {
    const portal = node.closest('[data-base-ui-portal]')
    const parts = Array.from(portal?.children || []).filter((el) => getComputedStyle(el).position === 'fixed')
    parts.forEach((el) => el.style.removeProperty('z-index'))
    const own = Math.max(0, ...parts.map((el) => Number.parseInt(getComputedStyle(el).zIndex, 10) || 0))
    const parent = Array.from(levels.keys()).reverse().find((other) => other.closest('[data-base-ui-portal]')?.contains(portal))
    const level = parent ? Math.max(own, levels.get(parent)) : own > floor ? own : floor + 1
    levels.set(node, level)
    floor = Math.max(floor, level)
    if (level > own) parts.forEach((el) => el.style.setProperty('z-index', String(level)))
  })
}

const reconcile = () => {
  stack()
  const front = layers.filter((node) => node.isConnected).pop()
  const want = new Set(front ? outside(front) : [])
  owned.forEach((el) => {
    if (want.has(el)) return
    el.removeAttribute('inert')
    owned.delete(el)
  })
  want.forEach((el) => {
    el.setAttribute('inert', '')
    owned.add(el)
  })
}

/**
 * Makes everything around `node`'s portal inert while `active` (the layer is open, not merely
 * mounted: released as it starts to leave, so focus can go back to the element that opened it).
 * With several layers open, the one in front is the one that stays operative.
 * `node`: the popup (state, not a ref: the effect runs once it is in the document).
 */
export const useInertOutside = (node, active) => {
  useLayoutEffect(() => {
    if (!node || !active) return undefined
    if (!layers.length) opener = pressed
    layers.push(node)
    reconcile()
    return () => {
      layers.splice(layers.indexOf(node), 1)
      reconcile()
      // What the closed layer's return of focus aimed at may be outside the one that is left (inert), or have
      // no element to aim at (Safari): the focus is then nowhere, and it goes to the layer that is left, or to
      // what opened the last one. The closing layer holds the focus until it leaves the DOM
      // (its exit motion), so the check waits for that.
      const refocus = () => requestAnimationFrame(() => {
        if (document.activeElement && document.activeElement !== document.body) return
        const front = layers.filter((layer) => layer.isConnected).pop()
        const target = front || (layers.length === 0 && opener?.isConnected && !opener.closest('[inert]') ? opener : null)
        target?.focus({ preventScroll: true })
      })
      if (!node.isConnected) { refocus(); return }
      // a layer that stays in the DOM once closed (the side menu's panel) never leaves: the wait ends with its exit motion
      const gone = new MutationObserver(() => {
        if (node.isConnected) return
        clearTimeout(giveUp)
        gone.disconnect()
        refocus()
      })
      const giveUp = setTimeout(() => gone.disconnect(), LEAVING_LIMIT)
      gone.observe(document.body, { childList: true, subtree: true })
    }
  }, [node, active])
}
