import React from 'react'
import { useTheme } from 'styled-components'
import { siteName } from '~/utils/siteSettings'
import { useLanguage } from '~components/contexts/LanguageContext'
import { LandingFooter } from '../chrome/Footer'
import { LandingHeader } from '../chrome/Header'
import { useFranchiseStores, useMainStore } from '../useFranchiseStores'
import { AboutSection } from './About'
import { AppSection } from './App'
import { FeaturedSection } from './Featured'
import { GallerySection } from './Gallery'
import { HeroSection } from './Hero'
import { LocationsSection } from './Locations'
import { ReviewsSection } from './Reviews'

/**
 * The sections of the marketing page of a franchise (`mode` franchise): the
 * story, dishes, photos and reviews of its main store (`site.main_store`, else
 * the first store of the franchise; useMainStore), and `locations`, which lists
 * every store of the franchise. A franchise without stores paints none of them.
 * The page's contract (src/pages/Landing/index.js): a key of `pages.landing` to
 * a component with no props, plus the optional `Header` and `Footer`. `services`
 * and `visit` are not here: they describe one store.
 */
const withMainStore = (Section) => {
  const FranchiseSection = () => {
    const { store } = useMainStore()
    return <Section store={store} />
  }
  FranchiseSection.displayName = `Franchise(${Section.displayName || Section.name})`
  return FranchiseSection
}

// the hero is the section that shows the failure to read the stores, with its retry
const FranchiseHero = () => {
  const { store, loading, error, retry } = useMainStore()
  return <HeroSection store={store} loading={loading} error={error} retry={retry} />
}

// the logo is the main store's (the franchise has no public logo); the name is the site's. "Our locations"
// is offered while the stores load and when there are some: with none (or a failed read with nothing to
// show) the section is not drawn and the link would go nowhere.
const FranchiseHeader = () => {
  const [, t] = useLanguage()
  const { store } = useMainStore()
  const { data, loading } = useFranchiseStores()
  const brandName = siteName(useTheme()) || undefined
  return (
    <LandingHeader
      store={store}
      brandName={brandName}
      sectionKeys={['about', 'gallery', 'reviews']}
      extraAnchors={loading || data?.length > 0 ? { locations: t('LANDING_OUR_LOCATIONS', 'Our locations') } : undefined}
    />
  )
}

const FranchiseFooter = () => {
  const { store } = useMainStore()
  const brandName = siteName(useTheme()) || undefined
  const stores = useFranchiseStores().data
  // one store has no list of locations to show
  const locations = stores?.length > 1 ? stores.map((store) => store.name).filter(Boolean) : undefined
  return <LandingFooter store={store} brandName={brandName} locations={locations} />
}

export default {
  Header: FranchiseHeader,
  hero: FranchiseHero,
  featured: withMainStore(FeaturedSection),
  about: withMainStore(AboutSection),
  locations: LocationsSection,
  gallery: withMainStore(GallerySection),
  reviews: withMainStore(ReviewsSection),
  app: AppSection,
  Footer: FranchiseFooter
}
