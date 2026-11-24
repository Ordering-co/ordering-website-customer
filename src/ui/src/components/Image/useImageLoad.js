import { useEffect, useState } from 'react'

// A picture painted as a CSS background (`background-image`) is drawn as its
// bytes arrive: a slow or cut download stays half painted (a thin strip, the
// rest blank) and nothing tells the page. This hook downloads the picture
// first and says when it can be painted whole: 'loading' | 'loaded' | 'error'.

// Time one attempt (download + decode) may take before it counts as failed.
// Not a visual value: a network budget. Long enough for a slow mobile
// connection to finish a small thumbnail, short enough that the person is not
// left waiting for a picture that is not coming.
export const IMAGE_LOAD_TIMEOUT_MS = 15000

// The query parameter of the single retry: a new URL for the same picture, so
// the retry does not reuse a cut response that was cached.
export const IMAGE_RETRY_PARAM = 'img_retry'

// Pictures that loaded whole in this session: they are painted at once when a
// card mounts again (a list that re-renders, a category that comes back)
// instead of flashing the loading state; the browser has them cached.
const loaded = new Set()

/** Forget what loaded (tests). */
export const resetImageLoadCache = () => loaded.clear()

const isInline = (src) => /^(data|blob):/i.test(src)

// The same picture with the retry parameter, after any query it already has and
// before its hash. An inline picture (data:, blob:) has nothing to re-request:
// the same URL.
export const withRetryParam = (src) => {
  if (isInline(src)) return src
  const [base, hash] = src.split(/#(.*)/s)
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}${IMAGE_RETRY_PARAM}=1${hash !== undefined ? `#${hash}` : ''}`
}

const initial = (src) => {
  if (!src) return { src, url: src, status: 'error' }
  if (loaded.has(src)) return { src, url: src, status: 'loaded' }
  return { src, url: src, status: 'loading' }
}

// The state belongs to the `src` it was computed for: right after `src`
// changes, the old picture's state is never taken for the new one's.
export const useImageLoad = (src) => {
  const [result, setResult] = useState(() => initial(src))

  useEffect(() => {
    if (!src || loaded.has(src) || typeof window === 'undefined' || typeof window.Image !== 'function') return undefined
    let active = true
    let img = null
    let timer = null

    const release = () => {
      if (timer) window.clearTimeout(timer)
      timer = null
      if (img) {
        img.onload = null
        img.onerror = null
        // stops a download that is still running
        img.src = ''
      }
      img = null
    }

    const attempt = (retry) => {
      const url = retry ? withRetryParam(src) : src
      const current = new window.Image()
      img = current
      const settle = (ok) => {
        if (!active || img !== current) return
        release()
        if (ok) {
          loaded.add(src)
          setResult({ src, url, status: 'loaded' })
        } else if (!retry) {
          attempt(true)
        } else {
          setResult({ src, url, status: 'error' })
        }
      }
      // the whole attempt, decode included, has a limit
      timer = window.setTimeout(() => settle(false), IMAGE_LOAD_TIMEOUT_MS)
      current.decoding = 'async'
      current.onerror = () => settle(false)
      current.onload = () => {
        // a picture that decodes with an error but has its size is still a
        // picture the page can paint
        const done = () => settle(current.naturalWidth > 0)
        if (typeof current.decode === 'function') {
          current.decode().then(done, done)
        } else {
          done()
        }
      }
      current.src = url
    }

    attempt(false)
    return () => {
      active = false
      release()
    }
  }, [src])

  return result.src === src ? result : initial(src)
}

/**
 * A photo with the theme's placeholder behind it, as the state to paint:
 *   - `loading`: the photo (or, once it failed, the placeholder) is on its way;
 *   - `loaded`: `url` is whole and can be painted;
 *   - `placeholder`: nothing can be shown (the photo failed and there is no
 *     placeholder image, or it failed too): the box keeps the placeholder fill.
 * The placeholder image is only tried when the photo failed and it is another URL.
 */
export const usePhotoWithFallback = (src, fallback) => {
  const photo = useImageLoad(src)
  const useFallback = photo.status === 'error' && !!fallback && fallback !== src
  const backup = useImageLoad(useFallback ? fallback : undefined)
  const current = useFallback ? backup : photo
  const state = { loaded: 'loaded', loading: 'loading' }[current.status] || 'placeholder'
  return { state, url: state === 'loaded' ? current.url : undefined }
}
