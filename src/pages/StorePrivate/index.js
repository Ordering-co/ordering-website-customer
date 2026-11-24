import React from 'react'
import { Helmet } from 'react-helmet'
import { useTheme } from 'styled-components'
import { useApi } from '~components/contexts/ApiContext'
import { useSite } from '~components/contexts/SiteContext'
import { StorePrivate as StorePrivateUI } from '~ui/src/components/StorePrivate'
import { ownSiteName } from '../../utils/resolvePwaBranding'
import { PREVIEW_PARAM, setStorePreviewToken, unlockStorePreview } from '../../utils/storePreview'

/** The screen of a private store; without the preview token it is all a visitor gets. */
export const StorePrivate = () => {
  const [ordering] = useApi()
  const [{ site }] = useSite()
  const theme = useTheme()
  const name = ownSiteName({ theme, site })

  // storePrivate does not reset in place, so the page reloads; the token also rides in ?preview=
  // because a third-party iframe (Safari) may block localStorage and lose it across the reload
  const unlock = async (password) => {
    const token = await unlockStorePreview(ordering, password)
    setStorePreviewToken(token)
    const url = new URL(window.location.href)
    url.searchParams.set(PREVIEW_PARAM, token)
    window.location.replace(url.toString())
  }

  return (
    <>
      <Helmet>
        {name && <title>{name}</title>}
        <meta name='robots' content='noindex, nofollow' />
      </Helmet>
      <StorePrivateUI name={name} onUnlock={unlock} />
    </>
  )
}

export default StorePrivate
