import { useEffect, useMemo, useState } from 'react'
import { platformOfWidth, themeForPlatform } from '../../utils/themeVisibility'

const currentPlatform = () => (typeof window === 'undefined' ? null : platformOfWidth(window.innerWidth))

/**
 * The platform of the window (`mobile_web` below MOBILE_WEB_MAX_WIDTH, else
 * null), from the first render. It changes only when the width crosses the
 * breakpoint, so a resize within one side renders nothing.
 */
export const useThemePlatform = () => {
  const [platform, setPlatform] = useState(currentPlatform)
  useEffect(() => {
    const handleResize = () => setPlatform(currentPlatform())
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return platform
}

/**
 * `theme` for the window's platform (src/utils/themeVisibility.js
 * themeForPlatform): the theme providers pass it down, so themeVisible
 * answers the phone's value on phones.
 */
export const usePlatformTheme = (theme) => {
  const platform = useThemePlatform()
  return useMemo(() => themeForPlatform(theme, platform), [theme, platform])
}
