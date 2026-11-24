import React from 'react'
import { useTheme } from 'styled-components'

import { HelmetTags } from '../../components/HelmetTags'
import { PageBox } from './styles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { AddressList as AddressListController } from '~ui/src/components/AddressList'
import { ProfileOptions } from '~ui/src/components/UserProfileForm/ProfileOptions'
import { SavedPlaces as ProfileSavedPlaces } from '~ui/src/components/UserProfileForm/styles'
import { themeValue } from '~/utils/themeTokens'
import { usePageSections } from '../../ui/hooks/usePageSections'

export const AddressList = (props) => {
  const [{ user }] = useSession()
  const [, t] = useLanguage()
  const theme = useTheme()
  const addressListParams = {
    ...props,
    addressList: user?.addresses,
    isProfile: true,
    isModal: true
  }
  // the profile's tabs over the list (the saved places as a page of their
  // own), a section of the page the theme may hide (pages.addresses)
  const { isVisible } = usePageSections('addresses')
  const showProfileOptions = themeValue(theme, 'address_list', 'base.layout') === 'new_page' &&
    isVisible('profile_tabs')

  return (
    <>
      <HelmetTags page='addresses' />
      {/* the box of the account pages and the saved places of the profile,
          the list's title the page's h1; the profile's tabs the box's first
          section, xl over the title */}
      <PageBox>
        {showProfileOptions && (
          <ProfileOptions value='addresses' />
        )}
        <ProfileSavedPlaces>
          <AddressListController {...addressListParams} titleAs='h1' title={t('SAVED_PLACES', 'Saved places')} />
        </ProfileSavedPlaces>
      </PageBox>
    </>
  )
}

export default AddressList
