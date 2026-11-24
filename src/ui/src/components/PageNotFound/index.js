import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'
import settings from '~/config'
import { singleStoreSlug, themeStorePath } from '~/utils/singleStore'
import { menuPath } from '~/utils/siteSettings'

import { PageNotFoundContainer } from './styles'

import { useSite } from '~components/contexts/SiteContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

export const PageNotFound = () => {
  const [, t] = useLanguage()
  const [{ site }] = useSite()
  const theme = useTheme()
  const storeSlug = singleStoreSlug(theme, settings)
  const destination = storeSlug ? themeStorePath(theme, site, storeSlug) : menuPath(theme, settings)
  return (
    <PageNotFoundContainer data-doc-section='global-page-not-found'>
      <NotFoundSource
        headingLevel='h1'
        variant='notFound'
        icon='signpost'
        content={t('PAGE_NOT_FOUND', 'PAGE NOT FOUND')}
      >
        <Button appearance='outline' nativeButton={false} role='link' render={<Link to={destination} />}>
          {storeSlug ? t('GO_TO_MENU', 'Go to menu') : t('GO_TO_HOME', 'Go to home')}
        </Button>
      </NotFoundSource>
    </PageNotFoundContainer>
  )
}
