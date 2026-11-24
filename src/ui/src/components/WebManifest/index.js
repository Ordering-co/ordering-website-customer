import { useEffect } from 'react'

import { applyAppleTouchIcon } from '../../../../utils/applyAppleTouchIcon'
import { applyWebManifestLink } from '../../../../utils/applyWebManifestLink'
import { buildWebManifest } from '../../../../utils/buildWebManifest'
import { ownAppBranding, resolvePwaBranding } from '../../../../utils/resolvePwaBranding'

export const WebManifest = ({
  ready,
  theme,
  site,
  languageCode,
  hostname,
  origin = typeof window !== 'undefined' ? window.location.origin : ''
}) => {
  useEffect(() => {
    if (!ready) return undefined

    const branding = resolvePwaBranding({
      theme,
      site,
      languageCode,
      hostname
    })
    // only the site's own name, never the schema's default ("My Site")
    const own = ownAppBranding({ theme, site })
    const removeManifest = applyWebManifestLink(buildWebManifest({ ...branding, origin }), { title: own?.name })
    // with an app icon: it is also the iOS home-screen icon
    const restoreTouchIcon = applyAppleTouchIcon(branding.appleTouchIcon)
    return () => {
      removeManifest()
      restoreTouchIcon()
    }
  }, [ready, theme, site, languageCode, hostname, origin])

  return null
}

export default WebManifest
