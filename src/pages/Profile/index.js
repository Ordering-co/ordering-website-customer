import React from 'react'
import { useLocation } from 'react-router-dom'
import { HelmetTags } from '../../components/HelmetTags'

import { UserProfileForm as UserProfileFormOriginal } from '~ui/src/components/UserProfileForm'
import { useWindowSize } from '~ui/hooks/useWindowSize'

// The profile's views with their own content; any other (none: /profile, the
// header's link) shows the account's form
const PROFILE_VIEWS = ['account', 'notifications', 'language', 'savedPlaces', 'students']

export const Profile = (props) => {
  const windowSize = useWindowSize()
  const { search } = useLocation()
  const searchParams = new URLSearchParams(search)
  const searchView = searchParams.get('view') || ''
  // a view without its own content is the account's (its title and photo
  // too), as the form below already shows it
  const view = PROFILE_VIEWS.includes(searchView) ? searchView : 'account'

  const profileProps = {
    ...props,
    view,
    refreshSessionUser: true,
    showLogout: true,
    hideOptions: windowSize.width < 576
  }

  return (
    <>
      <HelmetTags page='profile' />
      <UserProfileFormOriginal {...profileProps} />
    </>
  )
}

export default Profile
