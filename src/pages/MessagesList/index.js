import React from 'react'
import { useTheme } from 'styled-components'

import { HelmetTags } from '../../components/HelmetTags'
import settings from '../../config'
import { franchiseSlug, singleStoreSlug } from '../../utils/siteSettings'

import { useEvent } from '~components/contexts/EventContext'
import { MessagesListing } from '~ui/src/components/MessagesListing'

export const MessagesList = (props) => {
  const [events] = useEvent()
  const theme = useTheme()
  const updatedFranchiseSlug = franchiseSlug(theme, settings)
  const updatedBusinessSlug = singleStoreSlug(theme, settings)

  const messageprops = {
    ...props,
    franchiseId: updatedFranchiseSlug,
    businessId: updatedBusinessSlug,
    onRedirectPage: (data) => events.emit('go_to_page', data)
  }
  return (
    <>
      <HelmetTags page='messages' />
      <MessagesListing {...messageprops} />
    </>
  )
}

export default MessagesList
