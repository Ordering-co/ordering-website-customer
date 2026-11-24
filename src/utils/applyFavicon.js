import { faviconLinks } from './iconLinks'

const LINK_IDS = ['favicon-fallback', 'favicon']
const ATTRIBUTES = ['type', 'sizes', 'href']

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')

/**
 * Makes the document's favicon links those of `url` (iconLinks.faviconLinks):
 * `link#favicon` with the file's real `type` (none when it cannot be told)
 * and, for an SVG, `link#favicon-fallback` with the PNG `fallbackPng` before
 * it; without an SVG that one goes.
 *
 * Without a site-level favicon at all (`url` falsy — white label, nothing
 * configured), there is never no favicon (implementation notes/implementation notes): `link#favicon`
 * is instead pointed at `fallbackHref` verbatim, with no `type`/`sizes` and no
 * re-transform (it may already be a business logo/header cropped to a square
 * on the CDN; faviconLinks' own transform would undo that crop). The worker
 * injects that same href into index.html (`window.__CONFIG__.favicon_fallback`,
 * the caller reads it) and into its own `link#favicon`, so on the first
 * render this changes nothing.
 */
export const applyFavicon = (url, fallbackPng, fallbackHref, { document: doc = document } = {}) => {
  if (!doc?.head) return
  const fallback = trimmed(fallbackHref)
  const wanted = url ? faviconLinks(url, fallbackPng) : (fallback ? [{ rel: 'icon', href: fallback, id: 'favicon' }] : [])
  if (!wanted.length) {
    // nothing resolves at all (no site favicon and no fallback href): no
    // placeholder lingers, the browser's own default icon shows
    LINK_IDS.forEach((id) => doc.getElementById(id)?.remove())
    return
  }

  const byId = Object.fromEntries(wanted.map(link => [link.id, link]))
  let favicon = doc.getElementById('favicon')
  if (!favicon) {
    favicon = doc.createElement('link')
    favicon.id = 'favicon'
    favicon.rel = 'icon'
    doc.head.appendChild(favicon)
  }

  LINK_IDS.forEach((id) => {
    const attrs = byId[id]
    let link = id === 'favicon' ? favicon : doc.getElementById(id)
    if (!attrs) {
      link?.remove()
      return
    }
    if (!link) {
      link = doc.createElement('link')
      link.id = id
      link.rel = 'icon'
      favicon.parentNode.insertBefore(link, favicon)
    }
    ATTRIBUTES.forEach((name) => {
      if (attrs[name] === undefined) link.removeAttribute(name)
      else if (link.getAttribute(name) !== attrs[name]) link.setAttribute(name, attrs[name])
    })
  })
}
