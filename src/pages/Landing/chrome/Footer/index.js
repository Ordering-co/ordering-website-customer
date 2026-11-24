import React from 'react'
import { useHistory } from 'react-router-dom'
import { useTheme } from 'styled-components'
import settings from '~/config'
import { menuPath, siteName } from '~/utils/siteSettings'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { pageFooterVisible } from '~/utils/themePages'
import { themeVisible } from '~/utils/themeVisibility'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Footer as SiteFooter } from '~ui/src/components/Footer'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useStoreLanding } from '../../useStoreLanding'
import { goTo } from '../navigate'
import { BrandLogo, BrandName, Bar, Column, ColumnTitle, Columns, LocationList, SiteContent, Socials } from './styles'

// Where a store's profile of each network lives, for a profile saved as a handle
const PROFILE_BASES = {
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/@'
}
const HANDLE = /^[\w.-]+$/
// a domain saved without its scheme: `www.instagram.com` or `facebook.com/foo` (a bare `foo.bar` is a handle)
const BARE_DOMAIN = /^(www\.[\w-]+(\.[\w-]+)+|[\w-]+(\.[\w-]+)+\/)\S*$/i

/** The profile's URL from what the store saved (a link, a domain or a handle); null when it is neither (never a `javascript:` link). */
export const profileUrl = (network, saved) => {
  const value = String(saved || '').trim()
  if (/^https?:\/\//i.test(value)) return value
  if (BARE_DOMAIN.test(value)) return `https://${value}`
  const handle = value.replace(/^@/, '')
  return HANDLE.test(handle) ? `${PROFILE_BASES[network]}${handle}` : null
}

/** The WhatsApp chat link of a number, whatever its punctuation; null without digits. */
export const whatsappUrl = (saved) => {
  const digits = String(saved || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

/**
 * The footer of the marketing page of a store: its logo (or name), its
 * networks, where to find it, the way to the menu and, under them, the site's
 * own footer content (the footer page or `footer_html`, with its legal links).
 * It takes the place of the app's footer on this page (LANDING_FOOTER_MODES),
 * so it hides as that one does: `pages.landing.footer`, else `visibility.footer`.
 * @param {object} props
 * @param {number|string} props.store the store's id or slug
 * @param {string} [props.brandName] the name shown (and named by the logo) instead of the store's: the site's, on a franchise
 * @param {string[]} [props.locations] the names of the site's stores (a franchise's): a column lists them and
 *   takes the place of the single store's address and phone
 */
export const LandingFooter = ({ store, brandName, locations }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const history = useHistory()
  const { width } = useWindowSize()
  const pageFooter = pageFooterVisible(theme, 'landing', { mobile: typeof width === 'number' && width < MOBILE_WEB_MAX_WIDTH })
  const hidden = pageFooter === null ? !themeVisible(theme, 'footer') : !pageFooter
  const business = useStoreLanding(store, ['business']).business.data
  const menu = menuPath(theme, settings)
  const name = brandName || business?.name || siteName(theme)
  const address = String(business?.address || '').trim()
  const phone = String(business?.phone || business?.cellphone || '').trim()
  const socials = [
    { key: 'facebook', label: 'Facebook', url: profileUrl('facebook', business?.facebook_profile) },
    { key: 'instagram', label: 'Instagram', url: profileUrl('instagram', business?.instagram_profile) },
    { key: 'tiktok', label: 'TikTok', url: profileUrl('tiktok', business?.tiktok_profile) },
    { key: 'whatsapp', label: 'WhatsApp', url: whatsappUrl(business?.whatsapp_number) }
  ].filter(({ url }) => url)

  if (hidden) return null

  return (
    <Bar data-landing-chrome='footer'>
      <Columns>
        <Column>
          {business?.logo ? <BrandLogo src={business.logo} alt={name} /> : <BrandName>{name}</BrandName>}
          {socials.length > 0 && (
            <Socials>
              {socials.map(({ key, label, url }) => (
                <li key={key}>
                  <Button appearance='plain' nativeButton={false} render={<a href={url} target='_blank' rel='noopener noreferrer' />} aria-label={label}>
                    <Icon name={key} size='lg' />
                  </Button>
                </li>
              ))}
            </Socials>
          )}
        </Column>
        {locations?.length > 0 && (
          <Column>
            <ColumnTitle>{t('LANDING_OUR_LOCATIONS', 'Our locations')}</ColumnTitle>
            <LocationList>
              {locations.map((location, index) => <li key={`${index}-${location}`}>{location}</li>)}
            </LocationList>
          </Column>
        )}
        {!locations?.length && (address || phone) && (
          <Column>
            <ColumnTitle>{t('LANDING_VISIT_US', 'Visit us')}</ColumnTitle>
            {address && (
              <address>
                <a href={mapsUrl(address)} target='_blank' rel='noopener noreferrer'>{address}</a>
              </address>
            )}
            {phone && <p><a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a></p>}
          </Column>
        )}
        <Column>
          <ColumnTitle>{t('MENU', 'Menu')}</ColumnTitle>
          <p>
            <Button appearance='plain' nativeButton={false} render={<a href={menu} />} onClick={goTo(history, menu)}>
              {t('LANDING_ORDER_ONLINE', 'Order online')}
            </Button>
          </p>
        </Column>
      </Columns>
      <SiteContent>
        <SiteFooter bare isHome />
      </SiteContent>
    </Bar>
  )
}

export default LandingFooter
