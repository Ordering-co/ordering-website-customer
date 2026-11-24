import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useStoreLanding } from '../../useStoreLanding'
import { LandingSection, LandingSkeleton } from '../shared/LandingSection'
import { OrderLink } from '../shared/OrderLink'
import { Dish, DishName, DishPhoto, DishPrice, Dishes } from './styles'

/** The store's featured dishes (up to 8) with their photo and price. Nothing to show, or its read failed: no section. */
export const FeaturedSection = ({ store }) => {
  const { featured } = useStoreLanding(store, ['featured'])
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()

  if (featured.loading) return <LandingSkeleton name='featured' items={4} ratio='1' />
  if (!featured.data?.length) return null

  return (
    <LandingSection
      name='featured'
      title={t('LANDING_FEATURED', 'Featured')}
      action={<OrderLink appearance='outline'>{t('LANDING_VIEW_MENU', 'View menu')}</OrderLink>}
    >
      <Dishes>
        {featured.data.map((dish) => (
          <Dish key={dish.id}>
            <DishPhoto>
              {dish.image && <img src={dish.image} alt={dish.name} loading='lazy' />}
            </DishPhoto>
            <DishName>{dish.name}</DishName>
            <DishPrice>{parsePrice(dish.price)}</DishPrice>
          </Dish>
        ))}
      </Dishes>
    </LandingSection>
  )
}
