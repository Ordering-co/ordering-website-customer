import React from 'react'
import { useTheme } from 'styled-components'
import settings from '~/config'
import { singleStoreSlug } from '~/utils/siteSettings'
import { LandingFooter } from '../chrome/Footer'
import { LandingHeader } from '../chrome/Header'
import { AboutSection } from './About'
import { AppSection } from './App'
import { FeaturedSection } from './Featured'
import { GallerySection } from './Gallery'
import { HeroSection } from './Hero'
import { ReviewsSection } from './Reviews'
import { ServicesSection } from './Services'
import { VisitSection } from './Visit'

/**
 * The sections of the marketing page of a site that is one store
 * (`mode` single_store): each one tied to the site's store. The page's
 * contract (src/pages/Landing/index.js): a key of `pages.landing` to a
 * component with no props, plus the optional `Header` and `Footer`.
 */
const withStore = (Section) => {
  const OneStoreSection = () => {
    const theme = useTheme()
    return <Section store={singleStoreSlug(theme, settings)} />
  }
  OneStoreSection.displayName = `OneStore(${Section.displayName || Section.name})`
  return OneStoreSection
}

export default {
  Header: withStore(LandingHeader),
  hero: withStore(HeroSection),
  featured: withStore(FeaturedSection),
  about: withStore(AboutSection),
  services: withStore(ServicesSection),
  gallery: withStore(GallerySection),
  reviews: withStore(ReviewsSection),
  visit: withStore(VisitSection),
  app: AppSection,
  Footer: withStore(LandingFooter)
}
