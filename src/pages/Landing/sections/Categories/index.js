import React from 'react'
import { useHistory } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { BusinessTypeFilter } from '~components/components/BusinessTypeFilter'
import { useLanguage } from '~components/contexts/LanguageContext'
import { BusinessTypesUI } from '~ui/src/components/BusinessTypes'
import settings from '../../../../config'
import { menuPath } from '../../../../utils/siteSettings'
import { MarketplaceSection } from '../MarketplaceSection'

// The listing has no type to start on (a type is chosen inside it), so a type
// takes the customer to the stores, as the menu's home does
const CategoriesUI = (props) => {
  const { typesState } = props
  const [, t] = useLanguage()
  const loading = !!typesState.loading
  // no types (loaded and empty, or failed without data): no section, no title
  if (!loading && !typesState.types?.some((type) => type.enabled)) return null

  return (
    <MarketplaceSection id='landing-categories' title={t('LANDING_CATEGORIES_TITLE', 'Browse by craving')} loading={loading}>
      <BusinessTypesUI {...props} hideAllCategory defaultLayout='tiles' />
    </MarketplaceSection>
  )
}

export const Categories = () => {
  const history = useHistory()
  const theme = useTheme()
  return (
    <BusinessTypeFilter
      UIComponent={CategoriesUI}
      hideAllCategory
      // (the controller also asks for null when its selection stops being valid)
      onChangeBusinessType={(type) => type != null && history.push(menuPath(theme, settings))}
    />
  )
}
