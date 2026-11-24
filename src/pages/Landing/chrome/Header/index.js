import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useTheme } from 'styled-components'
import settings from '~/config'
import { menuPath, siteName } from '~/utils/siteSettings'
import { useLanguage } from '~components/contexts/LanguageContext'
import { usePageSections } from '~ui/hooks/usePageSections'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~ui/src/design-system/components/Sheet'
import { landingSectionsWithData, useStoreLanding } from '../../useStoreLanding'
import { goTo, isPlainClick, jumpTo, scrollToSection } from '../navigate'
import { Actions, AnchorRoom, BrandLogo, BrandName, Bar, Inner, Links, PhoneOnly, SheetLinks } from './styles'

// The sections the header links to, in the page's order: they appear only when
// the theme shows them and the store has something to put in them.
const anchorLabels = (t) => ({
  about: t('LANDING_OUR_STORY', 'Our story'),
  gallery: t('LANDING_GALLERY', 'Gallery'),
  reviews: t('REVIEWS', 'Reviews'),
  visit: t('LANDING_VISIT_US', 'Visit us')
})

/**
 * The header of the marketing page of a store: its logo (or name), the links
 * to the sections that exist, and "Order now" to the menu. On a phone the
 * links go into a sheet behind the menu button.
 * @param {object} props
 * @param {number|string} props.store the store's id or slug
 * @param {string} [props.brandName] the name shown (and named by the logo) instead of the store's: the site's, on a franchise
 * @param {string[]} [props.sectionKeys] the sections of the store's links (about, gallery, reviews, visit) that the page paints; all by default
 * @param {Object<string,string>} [props.extraAnchors] more links by section key and label, to sections that need no data check (shown when the theme shows them)
 */
export const LandingHeader = ({ store, brandName, sectionKeys, extraAnchors }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const history = useHistory()
  const { sections } = usePageSections('landing')
  // the links read the business (about, gallery, visit) and the review count; nothing else is asked
  const reviewsVisible = sections.some((section) => section.key === 'reviews' && section.visible)
  const landing = useStoreLanding(store, reviewsVisible ? ['business', 'reviews'] : ['business'])
  const [open, setOpen] = useState(false)
  const opener = useRef(null)
  const pending = useRef(null)

  const business = landing.business.data
  const name = brandName || business?.name || siteName(theme)
  const menu = menuPath(theme, settings)
  const withData = landingSectionsWithData(landing)
  const labels = { ...anchorLabels(t), ...extraAnchors }
  // an extra link needs no data of the store; the others need the page to paint the section and the store to have data for it
  const linked = (key) => !!extraAnchors?.[key] || ((!sectionKeys || sectionKeys.includes(key)) && withData.has(key))
  const anchors = sections
    .filter((section) => section.visible && labels[section.key] && linked(section.key))
    .map(({ key }) => ({ id: `landing-${key}`, label: labels[key] }))

  // a link of the sheet scrolls once the sheet has closed and given the page its scroll back
  const afterClose = (isOpen) => {
    if (isOpen || !pending.current) return
    scrollToSection(pending.current)
    pending.current = null
  }
  const closeThen = (id) => (event) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    pending.current = id
    setOpen(false)
  }

  return (
    <Bar data-landing-chrome='header'>
      <AnchorRoom />
      <Inner>
        <Button appearance='brand' nativeButton={false} render={<a href='/' />} onClick={goTo(history, '/')}>
          {business?.logo ? <BrandLogo src={business.logo} alt={name} /> : <BrandName>{name}</BrandName>}
        </Button>
        <Links aria-label={t('LANDING_MAIN_NAV', 'Main')}>
          <Button appearance='ghost' color='neutral' nativeButton={false} render={<a href={menu} />} onClick={goTo(history, menu)}>
            {t('MENU', 'Menu')}
          </Button>
          {anchors.map(({ id, label }) => (
            <Button key={id} appearance='ghost' color='neutral' nativeButton={false} render={<a href={`#${id}`} />} onClick={jumpTo(id)}>
              {label}
            </Button>
          ))}
        </Links>
        <Actions>
          <Button nativeButton={false} render={<a href={menu} />} onClick={goTo(history, menu)}>
            {t('ORDER_NOW', 'Order now')}
          </Button>
          <PhoneOnly>
            <Button ref={opener} appearance='ghost' color='neutral' shape='icon' aria-label={t('MENU', 'Menu')} aria-haspopup='dialog' aria-expanded={open} onClick={() => setOpen(true)}>
              <Icon name='menu' size='md' />
            </Button>
          </PhoneOnly>
        </Actions>
      </Inner>
      <Sheet open={open} onOpenChange={setOpen} onOpenChangeComplete={afterClose}>
        <SheetContent side='bottom' finalFocus={opener} dir={theme.rtl ? 'rtl' : 'ltr'} aria-describedby={undefined}>
          <SheetHeader><SheetTitle>{t('MENU', 'Menu')}</SheetTitle></SheetHeader>
          <SheetLinks aria-label={t('MENU', 'Menu')}>
            <Button appearance='ghost' color='neutral' align='start' fullWidth nativeButton={false} render={<a href={menu} />} onClick={goTo(history, menu)}>
              {t('MENU', 'Menu')}
            </Button>
            {anchors.map(({ id, label }) => (
              <Button key={id} appearance='ghost' color='neutral' align='start' fullWidth nativeButton={false} render={<a href={`#${id}`} />} onClick={closeThen(id)}>
                {label}
              </Button>
            ))}
          </SheetLinks>
        </SheetContent>
      </Sheet>
    </Bar>
  )
}

export default LandingHeader
