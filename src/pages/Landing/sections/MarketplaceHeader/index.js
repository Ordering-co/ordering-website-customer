import React, { useState } from 'react'
import loadable from '@loadable/component'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useSite } from '~components/contexts/SiteContext'
import { Button } from '~ui/src/design-system/components/Button'
import { LazyDialog } from '~ui/src/components/Overlay/lazyOverlay'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { usePageSections } from '~ui/hooks/usePageSections'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { getSiteLogoUrl } from '~/utils/siteBranding'
import { ownSiteName } from '~/utils/resolvePwaBranding'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeImage } from '~/utils/themeTokens'
import settings from '../../../../config'
import { menuPath } from '../../../../utils/siteSettings'
import { Bar, Inner, Brand, BrandName, Sections, Actions } from './styles'

// Interaction-gated, as in the app's header (the store cards still import the auth forms statically)
const LoginForm = loadable(() => import('~ui/src/components/LoginForm').then((m) => m.LoginForm))
const SignUpForm = loadable(() => import('~ui/src/components/SignUpForm').then((m) => m.SignUpForm))
const ForgotPasswordForm = loadable(() => import('~ui/src/components/ForgotPasswordForm').then((m) => m.ForgotPasswordForm))

// The sections the bar links to: those that are always on the page when
// visible (a section that hides itself for lack of data, as the popular
// stores, would leave a link to nowhere)
const ANCHORS = [
  { key: 'how_it_works', label: (t) => t('LANDING_HOW_IT_WORKS_TITLE', 'How it works') },
  { key: 'partner', label: (t) => t('LANDING_NAV_PARTNER', 'For restaurants'), guestOnly: true }
]

/**
 * The marketing page's own header (a full website's `/` has no app header):
 * the site's logo (its name without one), links to the page's sections, the
 * login and the way to the menu.
 */
export const MarketplaceHeader = () => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ auth }, { login }] = useSession()
  const [{ site }] = useSite()
  const { isVisible } = usePageSections('landing')
  const [authPage, setAuthPage] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)

  const logo = getSiteLogoUrl(themeImage(theme, 'logotype'), BUNDLED_IMAGES.logos.logotype) ||
    getSiteLogoUrl(themeImage(theme, 'isotype'), BUNDLED_IMAGES.logos.isotype)
  const name = ownSiteName({ theme, site })
  const anchors = ANCHORS.filter(({ key, guestOnly }) => isVisible(key) && !(guestOnly && auth))

  const closeAuth = () => {
    setAuthLoading(false)
    setAuthPage(null)
  }
  const switchTo = (page) => (e) => {
    e.preventDefault()
    setAuthPage(page)
  }
  const link = (page, label) => <a href='#' onClick={switchTo(page)}>{label}</a>

  return (
    <>
      <Bar>
        <Inner>
          <Brand>
            {logo
              ? <img src={logo} alt={name || t('LOGO', 'Logo')} loading='eager' />
              : name && <BrandName title={name}>{name}</BrandName>}
          </Brand>
          {anchors.length > 0 && (
            <Sections aria-label={t('LANDING_NAV_LABEL', 'Page sections')}>
              <ul>
                {anchors.map(({ key, label }) => (
                  <li key={key}>
                    <Button appearance='link' nativeButton={false} render={<a href={`#landing-${key}`} />}>{label(t)}</Button>
                  </li>
                ))}
              </ul>
            </Sections>
          )}
          <Actions>
            {!auth && (
              <ComponentScope group='header'>
                <Button
                  type='button'
                  {...slotButtonOptions(theme, 'header', 'login', { color: 'neutral', appearance: 'ghost', size: 'md' })}
                  onClick={() => setAuthPage('login')}
                >
                  {t('SIGN_IN', 'Sign in')}
                </Button>
              </ComponentScope>
            )}
            <Button nativeButton={false} role='link' render={<Link to={menuPath(theme, settings)} />}>
              {t('ORDER_NOW', 'Order now')}
            </Button>
          </Actions>
        </Inner>
      </Bar>
      {authPage && !auth && (
        <LazyDialog legacyMaxWidth open onClose={() => { if (!authLoading) closeAuth() }} width='50%' closeOnBackdrop={!authLoading}>
          {authPage === 'login' && (
            <LoginForm
              handleSuccessLogin={(user) => user && closeAuth()}
              onAuthLoadingChange={setAuthLoading}
              elementLinkToSignup={link('signup', t('CREATE_ACCOUNT', 'Create account'))}
              elementLinkToForgotPassword={link('forgotpassword', t('RESET_PASSWORD', 'Reset password'))}
              useLoginByCellphone
              isPopup
            />
          )}
          {authPage === 'signup' && (
            <SignUpForm
              elementLinkToLogin={link('login', t('LOGIN', 'Login'))}
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={(user) => {
                closeAuth()
                login({ user, token: user?.session?.access_token })
              }}
              isPopup
              closeModal={closeAuth}
            />
          )}
          {authPage === 'forgotpassword' && (
            <ForgotPasswordForm elementLinkToLogin={link('login', t('LOGIN', 'Login'))} isPopup />
          )}
        </LazyDialog>
      )}
    </>
  )
}
