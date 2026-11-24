const APPLE_TOUCH_ICON = 'link[rel="apple-touch-icon"]'
const LINK_ID = 'theme-apple-touch-icon'

/**
 * Points every `apple-touch-icon` of the document (index.html ships four
 * fixed ones, the worker may add another) at `href`, the theme's app icon,
 * and adds one when the document has none. iOS reads them when the user adds
 * the site to the home screen.
 *
 * Returns the cleanup: the links get their own href back and the added one is
 * removed. Without `href` it changes nothing.
 */
export const applyAppleTouchIcon = (href, { document: doc = document } = {}) => {
  const url = String(href ?? '').trim()
  if (!url || !doc?.head) return () => {}

  const restore = []
  const links = Array.from(doc.querySelectorAll(APPLE_TOUCH_ICON))

  if (links.length) {
    links.forEach((link) => {
      const previous = link.getAttribute('href')
      link.setAttribute('href', url)
      restore.push(() => {
        if (previous === null) link.removeAttribute('href')
        else link.setAttribute('href', previous)
      })
    })
  } else {
    const link = doc.createElement('link')
    link.id = LINK_ID
    link.rel = 'apple-touch-icon'
    link.setAttribute('sizes', '180x180')
    link.setAttribute('href', url)
    doc.head.appendChild(link)
    restore.push(() => link.remove())
  }

  return () => restore.forEach((undo) => undo())
}
