import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'

import { Container, FooterContent } from './styles'
import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { footerHtml } from '~/utils/siteSettings'

/**
 * The site's footer: the localized footer page, else `footer_html`, else the
 * `footer` page. `bare` gives only that content, without the footer box, for a
 * page that paints its own footer around it (the marketing page, implementation notes).
 */
export const Footer = ({ isFooterPage, isHome, bare }) => {
  const [footerState, setfooterState] = useState({ body: null, loading: false, error: null })
  const [ordering] = useApi()
  const theme = useTheme()
  const requestsState = {}
  const [languageState] = useLanguage()
  const footerContent = footerHtml(theme)

  const getPage = async () => {
    setfooterState({ ...footerState, loading: true })
    try {
      const source = {}
      requestsState.page = source
      const languageCode = languageState?.language?.code

      // One list request: it already carries slug/body/enabled for every
      // page, so no per-slug request (and no 400 for a footer_<lang> or
      // footer page the site hasn't created) is needed.
      const { content: { error: listError, result: pages } } = await ordering.pages().get({ cancelToken: source })
      if (listError) {
        setfooterState({ ...footerState, loading: false, error: pages })
        return
      }
      const pageList = Array.isArray(pages) ? pages : []

      const langSlug = languageCode && `footer_${languageCode}`
      const langPage = langSlug && pageList.find(page => page?.slug === langSlug)
      if (langPage?.enabled && langPage?.body) {
        setfooterState({ ...footerState, loading: false, body: langPage.body })
        return
      }

      if (footerContent) {
        setfooterState({ ...footerState, loading: false, body: null, useThemeContent: true })
        return
      }

      const defaultPage = pageList.find(page => page?.slug === 'footer')
      if (defaultPage?.body) {
        setfooterState({ ...footerState, loading: false, body: defaultPage.body })
        return
      }

      setfooterState({ ...footerState, loading: false, body: null })
    } catch (err) {
      if (err.constructor.name !== 'Cancel') {
        setfooterState({ ...footerState, loading: false, error: [err.message] })
      }
    }
  }

  useEffect(() => {
    getPage()
    return () => {
      if (requestsState.page) {
        requestsState.page?.cancel?.()
      }
    }
  }, [languageState?.language?.code])

  const displayContent = footerState.body || (footerState.useThemeContent && footerContent)
  const content = displayContent && !isFooterPage && (
    <FooterContent
      data-doc-section='localized-footer-content'
      dangerouslySetInnerHTML={{
        __html: displayContent
      }}
    />
  )

  if (bare) return content || null

  return (
    <Container $isHome={isHome}>
      {content}
    </Container>
  )
}

export default Footer
