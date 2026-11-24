import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { PagesList as PagesListController } from '~ui/src/components/PagesList'
import { HelmetTags } from '../../components/HelmetTags'

export const PagesList = (props) => {
  const [, t] = useLanguage()
  const routes = [
    { name: t('HOME', 'Home'), slug: '/home' },
    { name: t('SIGN_UP', 'Sign up'), slug: '/signup' },
    { name: t('LOGIN', 'Login'), slug: '/login' },
    { name: t('SIGN_IN', 'Sign in'), slug: '/signin' },
    { name: t('FORGOT_PASSWORD', 'Forgot password'), slug: '/password/forgot' },
    { name: t('PROFILE', 'Profile'), slug: '/profile' },
    { name: t('MY_ORDERS', 'My orders'), slug: '/profile/orders' },
    { name: t('SEARCH_BUSINESSES', 'Search Businesses'), slug: '/search' },
    { name: t('CHECKOUT', 'Checkout'), slug: '/checkout' },
    { name: t('PAGES', 'Pages'), slug: '/pages' }
  ]
  return (
    <>
      <HelmetTags page='pages' />
      <PagesListController {...props} routes={routes} />
    </>
  )
}

export default PagesList
