import React, { useEffect, useState } from 'react'

/**
 * A static map `<img>` with a failover chain (Google → Mapbox, or any
 * ordered list of static map URLs): renders `sources[index]`, and on
 * `onError` moves to the next one. Once every source has failed (or none
 * were given) it renders nothing — never a broken image or an empty box.
 * `wrap` (optional) wraps the `<img>` with the parent's containers, so they
 * disappear with it too instead of leaving an empty card.
 */
export const StaticMap = ({ sources, alt, wrap, ...imgProps }) => {
  const list = (sources || []).filter(Boolean)
  const key = list.join('|')
  const [index, setIndex] = useState(0)

  // a different set of sources (a new order, a token that just loaded…)
  // starts the chain over
  useEffect(() => { setIndex(0) }, [key])

  if (index >= list.length) return null

  const img = (
    <img
      src={list[index]}
      alt={alt}
      onError={() => setIndex((current) => current + 1)}
      {...imgProps}
    />
  )
  return wrap ? wrap(img) : img
}
