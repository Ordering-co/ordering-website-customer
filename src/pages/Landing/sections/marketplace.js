import { MarketplaceHero } from './MarketplaceHero'
import { Categories } from './Categories'
import { PopularStores } from './PopularStores'
import { HowItWorks } from './HowItWorks'
import { Partner } from './Partner'
import { MarketplaceHeader } from './MarketplaceHeader'
import { AppSection } from './App'

/**
 * The sections of the marketing page of a Marketplace site with Full Website:
 * a component without props per key of `pages.landing`, and its own `Header`
 * (the app's header is not painted on a full website's `/`).
 */
export const marketplaceSections = {
  hero: MarketplaceHero,
  categories: Categories,
  popular_stores: PopularStores,
  how_it_works: HowItWorks,
  app: AppSection,
  partner: Partner,
  Header: MarketplaceHeader
}

export default marketplaceSections
