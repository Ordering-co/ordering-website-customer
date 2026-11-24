import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import { CmsBody, CmsContainer, CmsTitle, SkeletonContainer, SkeletonHeader, SkeletonContent, SkeletonInformation, SkeletonSide } from './styles'

import { CmsContent } from '~components/components/CmsContent'
import { useLanguage } from '~components/contexts/LanguageContext'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

// Same unit as the skeleton region (dvh), so the page does not jump when the text arrives
const SKELETON_ROW_HEIGHT = '12dvh'

// Whether the page's own HTML has an h1
const hasHeading = (html) => /<h1[\s>]/i.test(html || '')

const CmsUI = (props) => {
  const {
    cmsState,
    pageTitle,
    handleCmsRedirect
  } = props
  const [, t] = useLanguage()

  return (
    <CmsContainer id='cms' data-doc-section='content-page'>
      {
        cmsState.loading && !cmsState.error && (
          <SkeletonContainer>
            <SkeletonHeader>
              <Skeleton width='100%' height='100%' />
            </SkeletonHeader>
            <SkeletonContent>
              <SkeletonInformation>
                <Skeleton width='100%' height={SKELETON_ROW_HEIGHT} />
                <Skeleton width='100%' height={SKELETON_ROW_HEIGHT} />
                <Skeleton width='100%' height={SKELETON_ROW_HEIGHT} />
                <Skeleton width='100%' height={SKELETON_ROW_HEIGHT} />
              </SkeletonInformation>
              <SkeletonSide>
                <Skeleton width='100%' height='100%' />
              </SkeletonSide>
            </SkeletonContent>
          </SkeletonContainer>
        )
      }
      {
        cmsState.body && (
          <>
            {!hasHeading(cmsState.body) && (
              <CmsTitle>{pageTitle || t('PAGES', 'Pages')}</CmsTitle>
            )}
            <CmsBody data-doc-section='content-page-body' dangerouslySetInnerHTML={{
              __html: cmsState.body
            }}
            />
          </>
        )
      }
      {
        cmsState.error &&
          <NotFoundSource
            headingLevel='h1'
            icon='signpost'
            content={t('ERROR_PAGE_SELECTED', 'Sorry, the selected page was not found.')}
            btnTitle={t('PAGE_REDIRECT', 'Go to pages list')}
            onClickButton={() => handleCmsRedirect()}
          />
      }
    </CmsContainer>
  )
}

export const Cms = (props) => {
  const CmsProps = {
    ...props,
    UIComponent: CmsUI
  }
  return <CmsContent {...CmsProps} />
}
