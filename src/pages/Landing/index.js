import React, { useLayoutEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import { siteMode } from '~/utils/siteSettings'
import { useApi } from '~components/contexts/ApiContext'
import { usePageSections } from '~ui/hooks/usePageSections'
import oneStore from './sections/oneStore'
import franchise from './sections/franchise'
import marketplace from './sections/marketplace'
import { removeLandingSsr, takeLandingSeed } from './ssrSwap'
import { seedLanding } from './useFranchiseStores'

/**
 * The sections of each site type, by `site.mode`. A map is the default export of
 * `sections/<mode>.js`: section key (of `pages.landing`) to a component with no
 * props, plus the optional `Header` and `Footer` (no props), which the page
 * paints before and after `<main>`. To add a mode: import its map here, add
 * its line to MODE_SECTIONS and, when its map has a `Header`, its mode to
 * LANDING_HEADER_MODES (src/utils/marketingHome.js), which hides the app's own
 * header on this page. A mode without a map paints an empty `<main>`.
 */
export const MODE_SECTIONS = {
  single_store: oneStore,
  franchise,
  marketplace
}

/**
 * Marketing home page of a full website (`pages.landing`, route '/'): the
 * visible sections of the theme, in its order, from the map of the site's
 * type. A section the map does not have paints nothing, not an empty box.
 *
 * Its first render is what the Worker painted on the server (src/pages/Landing/ssr):
 * once mounted, the server's markup goes away (ssrSwap.js) in the same frame.
 */
export const LandingPage = () => {
  const theme = useTheme()
  const [ordering] = useApi()
  // The store's (or franchise's) data the Worker already read (window.__LANDING__) goes into the hook's cache before the
  // first render, so the sections paint with it, as the server's markup did, and ask for nothing.
  useState(() => {
    const seed = takeLandingSeed()
    if (seed) seedLanding(ordering?.root, theme, seed)
  })
  useLayoutEffect(removeLandingSsr, [])
  const { sections } = usePageSections('landing')
  const map = MODE_SECTIONS[siteMode(theme)]
  if (!map) return <main />
  const { Header, Footer } = map
  return (
    <>
      {Header && <Header />}
      <main>
        {sections.filter((section) => section.visible && map[section.key]).map((section) => {
          const Section = map[section.key]
          return <Section key={section.key} />
        })}
      </main>
      {Footer && <Footer />}
    </>
  )
}

export default LandingPage
