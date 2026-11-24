import { useEffect, useState } from 'react'

/**
 * The URL to paint as a background image (`bgimage`): `src` while it loads
 * or once it did, `fallback` (the theme's placeholder) when it fails, so a
 * missing photo never leaves an empty box. A background image fails
 * silently, so this loads it once more (from the cache) to know.
 */
export const useImageFallback = (src, fallback) => {
  const [failed, setFailed] = useState(null)
  useEffect(() => {
    if (!src || typeof window === 'undefined' || typeof window.Image !== 'function') return
    let active = true
    const probe = new window.Image()
    probe.onerror = () => { if (active) setFailed(src) }
    probe.src = src
    return () => {
      active = false
      probe.onerror = null
    }
  }, [src])
  if (!src) return fallback || src
  return failed === src && fallback ? fallback : src
}
