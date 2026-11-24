import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useTheme } from 'styled-components'
import helmetData from '../../helmetdata.json'
import { useSite } from '~components/contexts/SiteContext'
import { useCookieConsent } from '../../contexts/CookieConsentContext'
import { resolveSeoDescription } from '../../utils/seoDescription'
import { siteDescription as themeSiteDescription, siteName as themeSiteName, thirdPartyCode } from '../../utils/siteSettings'

const orderingSubdomains = ['tryordering.com', 'ordering.co', 'orderingplus.com']

const isOrderingHost = () => {
  if (typeof window === 'undefined') return false
  return orderingSubdomains.some(subdomain => window.location.hostname.includes(subdomain))
}

export const HelmetTags = (props) => {
  const {
    page
  } = props

  const theme = useTheme()
  const [{ site }] = useSite()
  const { hasConsented } = useCookieConsent()
  // the page's own title and robots (src/helmetdata.json); no placeholder
  // keywords, description nor canonical
  const metaTag = (page ? helmetData[page] : helmetData.app) || {}
  const headCode = thirdPartyCode(theme).head
  const seoInjected = typeof window !== 'undefined' &&
    (!window.__SEO__?.pathname || window.__SEO__.pathname === window.location.pathname)
    ? window.__SEO__
    : null

  useEffect(() => {
    if (!hasConsented || !headCode) return

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = headCode

    const scripts = tempDiv.querySelectorAll('script')
    scripts.forEach(script => {
      const scriptExists = [...document.head.querySelectorAll('script')].some(existingScript => {
        if (script.src && existingScript.src === script.src) {
          return true
        }

        if (!script.src && existingScript.innerHTML === script.innerHTML) {
          return true
        }

        return false
      })
      if (!scriptExists) {
        const newScript = document.createElement('script')
        if (script.src) {
          newScript.src = script.src
        } else {
          newScript.innerHTML = script.innerHTML
        }
        document.head.appendChild(newScript)
      }
    })
  }, [hasConsented, headCode])

  const noscriptContent = (() => {
    if (!headCode) return ''
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = headCode
    const noscript = tempDiv.querySelector('noscript')
    return noscript ? noscript.innerHTML : ''
  })()

  const siteName = themeSiteName(theme)
  const siteDescription = resolveSeoDescription(themeSiteDescription(theme), site?.description)
  const themeReady = !!siteName
  const canRenderTitle = !!page && themeReady
  const effectiveSeoTitle = seoInjected?.title && seoInjected.title !== siteName ? seoInjected.title : null
  const titleTemplate = !canRenderTitle || (effectiveSeoTitle && !props.helmetMetaTags?.title)
    ? ''
    : `${siteName} - %s`
  const effectiveDescription = resolveSeoDescription(
    props.helmetMetaTags?.description,
    seoInjected?.description,
    siteDescription,
    seoInjected?.ogDescription,
    metaTag.description
  )
  const effectiveOgDescription = resolveSeoDescription(
    props.helmetMetaTags?.ogDescription,
    seoInjected?.ogDescription,
    effectiveDescription
  )
  const keywords = props.helmetMetaTags?.keywords || metaTag.keywords
  const robotsContent = isOrderingHost()
    ? 'noindex, nofollow'
    : (page ? (props.robots || metaTag?.robots) : null)

  return (
    <Helmet titleTemplate={titleTemplate}>
      {canRenderTitle && (
        <title id={`route-${page}`}>{props.helmetMetaTags?.title || effectiveSeoTitle || metaTag.title}</title>
      )}
      {page && effectiveDescription && (
        <meta name='description' content={effectiveDescription} />
      )}
      {page && effectiveOgDescription && (
        <meta property='og:description' content={effectiveOgDescription} />
      )}
      {keywords && <meta name='keywords' content={keywords} />}
      {robotsContent && <meta name='robots' content={robotsContent} />}
      {props.canonicalUrl
        ? (
        <link rel='canonical' href={props.canonicalUrl} />
          )
        : (
            metaTag.canonicalUrl && <link rel='canonical' href={metaTag.canonicalUrl} />
          )}
      {noscriptContent && (
        <noscript>{noscriptContent}</noscript>
      )}
    </Helmet>
  )
}

export default HelmetTags
