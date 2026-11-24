import React, { useEffect, useState } from 'react'
import { PagesListContainer, PagesListLinks, PagesListTitle } from './styles'
import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'

export const PagesList = ({ routes }) => {
  const [ordering] = useApi()
  const [roots, setRoots] = useState(routes)
  const [, t] = useLanguage()

  useEffect(() => {
    getPages()
  }, [])

  const getPages = async () => {
    try {
      const { response } = await ordering.pages().get()
      setRoots([...roots, ...response.data.result])
    } catch {}
  }

  return (
    <PagesListContainer data-doc-section='pages-list'>
      <PagesListTitle>{t('SITEMAP', 'Site Map')}</PagesListTitle>
      <nav aria-label={t('SITEMAP', 'Site Map')}>
        <PagesListLinks>
          {roots.map((route, i) => (
            <li key={i}>
              <a data-doc-item={route?.id ? 'configured-page' : 'standard-page'} href={route?.id ? `pages/${route.slug}` : route.slug}>{route.name}</a>
            </li>
          ))}
        </PagesListLinks>
      </nav>
    </PagesListContainer>
  )
}
