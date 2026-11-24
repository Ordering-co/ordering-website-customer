import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useStoreLanding } from '../../useStoreLanding'
import { LandingSection, LandingSkeleton } from '../shared/LandingSection'
import { Rule } from '../shared/styles'
import { Service, ServiceDescription, ServiceList, ServiceName, ServiceTime } from './styles'

/** How the store serves: delivery, pickup and dine in, those that are on, with their time. None: no section. */
export const ServicesSection = ({ store }) => {
  const { services } = useStoreLanding(store, ['services'])
  const [, t] = useLanguage()

  if (services.loading) return <LandingSkeleton name='services' items={3} ratio='3 / 1' />
  const data = services.data
  if (!data) return null

  const minutes = (time) => (time ? `${time} ${t('TIME_MIN', 'min')}` : null)
  const items = [
    data.delivery.enabled && { key: 'delivery', name: t('DELIVERY', 'Delivery'), time: minutes(data.delivery.time), description: t('ORDERTYPE_DESCRIPTION_DELIVERY', 'We bring your order to your door') },
    data.pickup.enabled && { key: 'pickup', name: t('PICKUP', 'Pickup'), time: minutes(data.pickup.time), description: t('ORDERTYPE_DESCRIPTION_PICKUP', 'Order ahead and pick it up at the store') },
    data.eatin.enabled && { key: 'eatin', name: t('EAT_IN', 'Eat in'), time: null, description: t('ORDERTYPE_DESCRIPTION_EATIN', 'Order ahead and enjoy it at the restaurant') }
  ].filter(Boolean)
  if (!items.length) return null

  return (
    <LandingSection name='services' title={t('LANDING_SERVICES_TITLE', 'How you can enjoy us')}>
      <ServiceList>
        {items.map((item) => (
          <Service key={item.key}>
            <Rule />
            <ServiceName>{item.name}</ServiceName>
            {item.time && <ServiceTime>{item.time}</ServiceTime>}
            <ServiceDescription>{item.description}</ServiceDescription>
          </Service>
        ))}
      </ServiceList>
    </LandingSection>
  )
}
