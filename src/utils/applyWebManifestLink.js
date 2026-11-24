const MANIFEST_LINK_ID = 'web-app-manifest'
const IOS_TITLE_META = 'apple-mobile-web-app-title'

/**
 * Sets the iOS home-screen title (`apple-mobile-web-app-title`) to `title`,
 * adding the meta when the document has none; '' changes nothing. Returns
 * the cleanup: like applyAppleTouchIcon, the meta gets its previous content
 * back, or is removed when this call added it.
 */
const applyAppleWebAppTitle = (title, doc) => {
  const text = String(title ?? '').trim()
  if (!text) return () => {}

  let meta = doc.querySelector(`meta[name="${IOS_TITLE_META}"]`)
  if (meta) {
    const previous = meta.getAttribute('content')
    meta.setAttribute('content', text)
    return () => {
      if (previous === null) meta.removeAttribute('content')
      else meta.setAttribute('content', previous)
    }
  }

  meta = doc.createElement('meta')
  meta.setAttribute('name', IOS_TITLE_META)
  meta.setAttribute('content', text)
  doc.head.appendChild(meta)
  return () => meta.remove()
}

export const applyWebManifestLink = (manifest, {
  document: doc = document,
  createObjectURL = (value) => URL.createObjectURL(value),
  revokeObjectURL = (value) => {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(value)
  },
  // the site's own name (ownAppBranding), for the iOS home-screen title;
  // unset, the document's own title (index.html's, the worker's) stays
  title
} = {}) => {
  if (!manifest?.name) return () => {}

  const href = createObjectURL(new Blob([JSON.stringify(manifest)], {
    type: 'application/manifest+json'
  }))

  let link = doc.getElementById(MANIFEST_LINK_ID) || doc.querySelector('link[rel="manifest"]')
  if (!link) {
    link = doc.createElement('link')
    link.id = MANIFEST_LINK_ID
    link.rel = 'manifest'
    doc.head.appendChild(link)
  }
  link.id = MANIFEST_LINK_ID
  link.setAttribute('href', href)

  const restoreTitle = applyAppleWebAppTitle(title, doc)

  return () => {
    revokeObjectURL(href)
    restoreTitle()
  }
}
