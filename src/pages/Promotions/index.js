import React from 'react'
import { useTheme } from 'styled-components'
import { HelmetTags } from '../../components/HelmetTags'
import settings from '../../config'
import { franchiseSlug } from '../../utils/siteSettings'
import { Promotions as PromotionsController } from '~ui/src/components/Promotions'

export const Promotions = (props) => {
  const theme = useTheme()
  const updatedFranchiseSlug = franchiseSlug(theme, settings)

  const promotionsProps = {
    franchiseId: updatedFranchiseSlug,
    ...props
  }
  return (
    <>
      <HelmetTags page='promotions' />
      <PromotionsController {...promotionsProps} />
    </>
  )
}

export default Promotions
