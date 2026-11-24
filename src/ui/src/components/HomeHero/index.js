import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import {
  HeroContainer,
  ContentWrapper,
  Title,
  WrapInput,
  HeroAddressLabel,
  LogoWrapper,
  LogoName,
  UseAccount,
  HeroContent,
  SearchAction,
  SectionHeader
} from './styles'
import { useSession } from '~components/contexts/SessionContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSite } from '~components/contexts/SiteContext'

import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Button } from '~ui/src/design-system/components/Button'
import { AddressForm } from '~ui/src/components/AddressForm'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'
import { AddressList } from '~ui/src/components/AddressList'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { usePageSections } from '~ui/hooks/usePageSections'
import { slotButtonOptions } from '~/utils/themeGroups'
import { getSiteLogoUrl, getThemeInverseLogo } from '~/utils/siteBranding'
import { ownSiteName } from '~/utils/resolvePwaBranding'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { themeImage, themeValue } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'

import { Icon } from '~ui/src/design-system/components/Icon'

// Delay before auto-prompting a logged-in user for an address. Lets the
// post-login order-options refresh settle (a brief `loading` flicker resolves
// the saved address) so the "Add address" modal doesn't flash. See .
const ADDRESS_PROMPT_SETTLE_MS = 1500

export const HomeHero = (props) => {
  // `hideLoginAccount`: a page that has its own sign-in (the marketing page's header) leaves this block out
  const { onFindBusiness, notificationState, urlLocation, hideLoginAccount } = props

  const [{ auth, loading: sessionLoading }, { login }] = useSession()
  const [orderState] = useOrder()
  const [{ site }] = useSite()
  const [, t] = useLanguage()
  const [modals, setModals] = useState({ listOpen: false, formOpen: false })
  const theme = useTheme()
  const userCustomer = parseInt(typeof window !== 'undefined' ? window.localStorage.getItem('user-customer') : null)
  const windowSize = useWindowSize()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [modalPageToShow, setModalPageToShow] = useState(null)
  const [newAddressModalOpened, setNewAddressModalOpened] = useState(false)
  const [addressFormLoading, setAddressFormLoading] = useState(false)

  // The "Use your account" block of the home on a phone: a section of the
  // home (pages.home login_account)
  const { isVisible } = usePageSections('home')
  const isShowLoginAccount = isVisible('login_account') && !hideLoginAccount
  // the hero's logo and title can be hidden (visibility home.hero.logo /
  // home.hero.title); the logo shows on phones by default (its
  // platforms.mobile_web value), not on wider screens
  const showHeroLogo = themeVisible(theme, 'home.hero.logo')
  const showHeroTitle = themeVisible(theme, 'home.hero.title')
  const bgImg = themeImage(theme, 'home_hero')
  const mobileBgImg = themeImage(theme, 'home_hero_mobile')
  const isFullScreen = themeValue(theme, 'home_hero', 'base.fullscreen')
  const handleFindBusinesses = () => {
    if (!orderState?.options?.address?.location && !urlLocation) {
      setModals({ ...modals, formOpen: true })
      return
    }
    setModals({ listOpen: false, formOpen: false })
    onFindBusiness && onFindBusiness()
  }

  /* const handleAddressInput = () => {
    if (auth) {
      setModals({ ...modals, listOpen: true })
    } else {
      setModals({ ...modals, formOpen: true })
    }
  } */

  const handleOpenLoginSignUp = (index) => {
    setModalPageToShow(index)
    setAuthModalOpen(true)
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
    setModalPageToShow(null)
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeAuthModal()
    }
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  useEffect(() => {
    return () => setModals({ listOpen: false, formOpen: false })
  }, [])

  useEffect(() => {
    if (newAddressModalOpened) return
    if (!(auth && !sessionLoading && !orderState.loading && !orderState?.options?.address?.location)) return
    // Defer the prompt: after login the order options refresh and `loading`
    // briefly flickers to false before the saved address resolves. If the
    // address arrives during the settle window this effect re-runs and the
    // cleanup clears the timer, so existing users never see the flash;
    // genuinely address-less users still get prompted once it elapses.
    const timer = setTimeout(() => {
      setModals(prev => ({ ...prev, formOpen: true }))
      setNewAddressModalOpened(true)
    }, ADDRESS_PROMPT_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [auth, orderState, sessionLoading, newAddressModalOpened])

  return (
    <HeroContainer
      data-doc-section='website-home-hero'
      mb={!auth && isShowLoginAccount && '30vh'}
      bgimage={windowSize.width < 576 ? mobileBgImg : bgImg}
      isFullScreen={isFullScreen}
    >
      <ContentWrapper>
        {showHeroLogo && (() => {
          // the theme's logo for dark backgrounds: the isotype on phones
          // (the header's breakpoint), else the logotype; each falls back to
          // its own (isotype, logotype), not to the other
          const logoSrc = getThemeInverseLogo(theme, { mobile: windowSize.width <= 768 }) ||
            getSiteLogoUrl(themeImage(theme, 'logotype'), BUNDLED_IMAGES.logos.logotypeInvert)
          const ownName = !logoSrc && ownSiteName({ theme, site })
          if (!logoSrc && !ownName) return null
          return (
            <LogoWrapper>
              {logoSrc
                ? <img alt={t('LOGO', 'Logo')} src={logoSrc} loading='lazy' />
                : <LogoName title={ownName}>{ownName}</LogoName>}
            </LogoWrapper>
          )
        })()}
        <HeroContent>
          {/* a hidden title stays the page's h1, read but not seen */}
          <Title $srOnly={!showHeroTitle}>
            {t('TITLE_HOME_2', 'Shop easily, quickly, and securely.') === 'Shop easily, quickly, and securely.'
              ? (
                  <>
                    Shop{' '}
                    <span className="highlight">easily</span>
                    {', '}
                    <span className="highlight">quickly</span>
                    {', and '}
                    <span className="highlight">securely</span>
                    {'.'}
                  </>
                )
              : (
                  t('TITLE_HOME_2', 'Shop easily, quickly, and securely.')
                )}
          </Title>
          <div className='input-wrapper'>
            <WrapInput data-doc-control='website-location-open' onClick={handleFindBusinesses} $withIcon>
              <Icon name="mapMarker" />
              <HeroAddressLabel title={orderState?.options?.address?.address || t('WHERE_DO_WE_DELIVER_2', 'Enter where you want your order delivered.')}>
                {orderState?.options?.address?.address || t('WHERE_DO_WE_DELIVER_2', 'Enter where you want your order delivered.')}
              </HeroAddressLabel>
            </WrapInput>
            <SearchAction>
              <Button
                data-doc-control='website-find-businesses'
                {...slotButtonOptions(theme, 'home_hero', 'search', { color: 'primary', size: 'lg' })}
                fullWidth
                name='find-business'
                onClick={handleFindBusinesses}
              >
                {t('HOME_HERO_SEARCH_BUTTON', 'Search')}
              </Button>
            </SearchAction>
          </div>
        </HeroContent>
      </ContentWrapper>

      {windowSize.width < 576 && !auth && isShowLoginAccount && (
        <UseAccount>
          <SectionHeader>
            {t('YOUR_ACCOUNT', 'Use your account')}
          </SectionHeader>
          <Button {...slotButtonOptions(theme, 'home_hero', 'login', { color: 'primary', size: 'md' })} fullWidth onClick={() => handleOpenLoginSignUp('login')}>{t('LOGIN', 'login')}</Button>
          <Button {...slotButtonOptions(theme, 'home_hero', 'signup', { color: 'primary', appearance: 'tonal', size: 'md' })} fullWidth onClick={() => handleOpenLoginSignUp('signup')}>{t('SIGN_UP', 'Sign up')}</Button>
        </UseAccount>
      )}
      {modals.formOpen && (
        <DialogOverlay
          title={auth ? t('ADD_ADDRESS_TITLE', 'Add address') : t('GUEST', 'Guest')}
          open={modals.formOpen}
          onClose={() => {
            if (addressFormLoading) return
            setModals({ ...modals, formOpen: false })
          }}
          /* padding='30px 20px 0px' */
        >
          <AddressForm
            useValidationFileds
            createGuestOnSave={!auth}
            onLoadingChange={setAddressFormLoading}
            address={orderState?.options?.address || {}}
            onClose={() => {
              if (addressFormLoading) return
              setModals({ ...modals, formOpen: false })
            }}
            onSaveAddress={() => {
              setModals({ listOpen: false, formOpen: false })
              onFindBusiness && onFindBusiness()
            }}
            onCancel={() => {
              if (addressFormLoading) return
              setModals({ ...modals, formOpen: false })
            }}
          />
        </DialogOverlay>
      )}
      {modals.listOpen && (
        <DialogOverlay
          legacyMaxWidth
          title={t('WHERE_DO_WE_DELIVERY', 'Where do we deliver?')}
          open={modals.listOpen}
          width='70%'
          onClose={() => setModals({ ...modals, listOpen: false })}
        >
          <AddressList
            isModal
            changeOrderAddressWithDefault
            userId={isNaN(userCustomer) ? null : userCustomer}
            onCancel={() => setModals({ ...modals, listOpen: false })}
            onAccept={() => handleFindBusinesses()}
          />
        </DialogOverlay>
      )}
      {authModalOpen && !auth && (
        <DialogOverlay
          legacyMaxWidth
          open={authModalOpen}
          onRemove={() => closeAuthModal()}
          width='50%'
        >
          {modalPageToShow === 'login' && (
            <LoginForm
              notificationState={notificationState}
              handleSuccessLogin={handleSuccessLogin}
              elementLinkToSignup={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'signup' })
                  } href='#'
                >{t('CREATE_ACCOUNT', 'Create account')}
                </a>
              }
              elementLinkToForgotPassword={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'forgotpassword' })
                  } href='#'
                >{t('RESET_PASSWORD', 'Reset password')}
                </a>
              }
              useLoginByCellphone
              isPopup
            />
          )}
          {modalPageToShow === 'signup' && (
            <SignUpForm
              notificationState={notificationState}
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={handleSuccessSignup}
              isPopup
            />
          )}
          {modalPageToShow === 'forgotpassword' && (
            <ForgotPasswordForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              isPopup
            />
          )}
        </DialogOverlay>
      )}
    </HeroContainer>
  )
}
