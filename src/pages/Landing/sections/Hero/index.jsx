import React from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { getDateTimeFormats } from '~components/utils/configHelpers'
import { Button } from '~ui/src/design-system/components/Button'
import { closedStatusLabel } from '~/utils/businessTime'
import { siteName } from '~/utils/siteSettings'
import { useStoreLanding } from '../../useStoreLanding'
import { OrderLink } from '../shared/OrderLink'
import { ErrorBox, SkeletonBlock } from '../shared/styles'
import { HeroActions, HeroContent, HeroDescription, HeroPhoto, HeroRoot, HeroScrim, HeroStatus, HeroTitle, OffscreenTitle, SkeletonActions, SkeletonText, SkeletonTitle } from './styles'

/**
 * The hero of the home page: the store's header photo, its name (the page's only h1), its
 * description, the way to the menu and, when it is closed, when it opens. It is the one
 * section that shows its error with a retry: the others hide themselves when theirs fail.
 * While it loads or after it fails, the site's name is the h1, so the page always has one.
 * A site that has to find its store first (the franchise's main store) passes `loading` or `error`
 * with `retry` while `store` is still null: the hero shows its skeleton or its error, and draws
 * nothing when it has neither.
 */
export const HeroSection = ({ store, loading = false, error = null, retry }) => {
  const own = useStoreLanding(store, ['business']).business
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const title = siteName(useTheme())
  if (!store && !loading && !error) return null
  const business = store ? own : { data: null, loading: !error && loading, error, retry }

  if (business.loading) {
    return (
      <HeroRoot id='landing-hero' data-landing-section='hero' aria-busy='true'>
        <HeroContent>
          {title && <OffscreenTitle>{title}</OffscreenTitle>}
          <SkeletonTitle aria-hidden='true' $tone='alt' $width='60%' />
          <SkeletonText aria-hidden='true' $tone='alt' $width='80%' />
          <SkeletonActions aria-hidden='true'>
            <SkeletonBlock $tone='alt' />
            <SkeletonBlock $tone='alt' />
          </SkeletonActions>
        </HeroContent>
      </HeroRoot>
    )
  }
  if (business.error || !business.data) {
    // without a site name the message is the h1
    const Message = title ? HeroDescription : HeroTitle
    return (
      <HeroRoot id='landing-hero' data-landing-section='hero'>
        <HeroContent>
          {title && <HeroTitle>{title}</HeroTitle>}
          <ErrorBox role='alert'>
            <Message>{t('LANDING_LOAD_ERROR', 'We could not load this restaurant.')}</Message>
            <Button type='button' onClick={business.retry}>{t('RETRY', 'Retry')}</Button>
          </ErrorBox>
        </HeroContent>
      </HeroRoot>
    )
  }

  const { name, description, header, open } = business.data
  const { is12Hours } = getDateTimeFormats(configs?.dates_general_format?.value)
  const status = open === false
    ? closedStatusLabel(business.data, t, { is12Hours, showTimezone: true })
    : open === true ? t('OPEN_NOW', 'Open now') : null

  return (
    <HeroRoot id='landing-hero' data-landing-section='hero' aria-labelledby='landing-hero-title' $photo={!!header}>
      {header && <HeroPhoto src={header} alt='' />}
      {header && <HeroScrim />}
      <HeroContent>
        <HeroTitle id='landing-hero-title'>{name}</HeroTitle>
        {description && <HeroDescription>{description}</HeroDescription>}
        {status && <HeroStatus>{status}</HeroStatus>}
        <HeroActions>
          <OrderLink size='lg'>{t('ORDER_NOW', 'Order now')}</OrderLink>
          <OrderLink size='lg' color='secondary'>{t('LANDING_SEE_THE_MENU', 'See the menu')}</OrderLink>
        </HeroActions>
      </HeroContent>
    </HeroRoot>
  )
}
