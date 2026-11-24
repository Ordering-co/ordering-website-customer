import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import { FlexTabs } from './styles'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { TabsAction, TabsNavigation } from '~ui/src/design-system/components/Tabs'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeValue } from '~/utils/themeTokens'

export const ProfileOptions = ({ value }) => {
  const [tabValue] = useState(value)
  const [, t] = useLanguage()
  const [events] = useEvent()
  const theme = useTheme()

  const showAddressListTab = themeValue(theme, 'address_list', 'base.layout') === 'new_page'

  const handleGoToPage = (data) => {
    events.emit('go_to_page', data)
  }

  // A real link (focusable, its address on hover); the app navigates
  const goTo = (e, page) => {
    e.preventDefault()
    handleGoToPage({ page })
  }

  const tabs = [
    { id: 'account', page: 'profile', href: '/profile', icon: 'person', label: t('MY_ACCOUNT', 'My Account') },
    showAddressListTab && { id: 'addresses', page: 'addresses', href: '/profile/addresses', icon: 'addressBook', label: t('MY_ADDRESSES', 'My addresses') },
    { id: 'orders', page: 'orders', href: '/profile/orders', icon: 'unorderedList', label: t('MY_ORDERS', 'My orders') }
  ].filter(Boolean)

  return (
    <FlexTabs>
      <TabsNavigation>
        {tabs.map(({ id, page, href, icon, label }) => (
          <TabsAction key={id} active={tabValue === id} href={href} title={label} icon={<Icon name={icon} />} onClick={(e) => goTo(e, page)}>
            {label}
          </TabsAction>
        ))}
      </TabsNavigation>
    </FlexTabs>
  )
}
