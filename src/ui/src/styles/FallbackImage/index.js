import React, { useEffect, useState } from 'react'

const usable = (value) => typeof value === 'string' && !!value.trim()

/**
 * The sources an image tries, in order: its own and then the theme's
 * alternative (a placeholder of `images.dummies.*`), each once.
 */
export const imageCandidates = (src, fallback) => [src, fallback]
  .filter(usable)
  .filter((value, index, list) => list.indexOf(value) === index)

/**
 * An `<img>` that never shows the browser's broken image (nor its alt text
 * in it): when `src` fails to load it shows `fallback` (the theme's
 * placeholder), and when that fails too, or there is none, `failedContent`
 * (an icon, initials…; nothing by default). The rest of the props go to the
 * img. `fallbackAlt` is the alt of the placeholder ('' by default: a
 * placeholder says nothing).
 */
export const FallbackImage = React.forwardRef(({ src, fallback, alt = '', fallbackAlt = '', failedContent = null, onError, ...props }, ref) => {
  const candidates = imageCandidates(src, fallback)
  const key = candidates.join('\n')
  const [index, setIndex] = useState(0)
  useEffect(() => { setIndex(0) }, [key])
  const current = candidates[index]
  if (!current) return failedContent
  const isOwn = usable(src) && current === src
  return (
    <img
      ref={ref}
      {...props}
      src={current}
      alt={isOwn ? alt : fallbackAlt}
      onError={(event) => {
        setIndex(value => value + 1)
        onError && onError(event)
      }}
    />
  )
})

FallbackImage.displayName = 'FallbackImage'
