import React from 'react'
import { HomeHero } from '~ui/src/components/HomeHero'
import { useFindBusiness } from '~ui/hooks/useFindBusiness'

/**
 * The marketing page's hero: the home's hero (its h1 is the page's only one),
 * whose search takes the customer to the stores as the home does. Its
 * "Use your account" block is left out: the page's header has the sign-in.
 */
export const MarketplaceHero = () => <HomeHero {...useFindBusiness()} hideLoginAccount />
