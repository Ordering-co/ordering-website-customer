import React, { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import { QueryLoginSpoonity as QueryLoginSpoonityController } from '~components/components/QueryLoginSpoonity'
import { useApi } from '~components/contexts/ApiContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useSite } from '~components/contexts/SiteContext'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'

// Goes to `destination` without the integration credentials, keeping the rest of the query (lat/lng...).
const useGoToDestination = (destination) => {
  const history = useHistory()
  const { search } = useLocation()
  return () => {
    const query = new URLSearchParams(search)
    query.delete('integration_token')
    query.delete('integration_code')
    const rest = query.toString()
    history.replace(rest ? `${destination}?${rest}` : destination)
  }
}

const QueryLoginSpoonityUI = (props) => {
  const {
    destination,
    userState,
    notificationState,
    authModalOpen,
    setAuthModalOpen,
    modalPageToShow,
    setModalPageToShow
  } = props

  const [, t] = useLanguage()
  const [{ auth }, { login }] = useSession()
  const [events] = useEvent()
  const [{ site }] = useSite()
  const businessUrlTemplate = site?.business_url_template || '/store/:business_slug'
  const goToDestination = useGoToDestination(destination)

  const closeAuthModal = () => {
    setAuthModalOpen(false)
    setModalPageToShow(null)
    if (destination) return goToDestination()
    const store = window.location.pathname.split('/')?.filter(text => text !== '' && text !== 'store')?.[0]
    if (store) {
      const templateQuery = businessUrlTemplate.split('?')[1]
      if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug' || !templateQuery) {
        events.emit('go_to_page', { page: 'business', params: { business_slug: store } })
      } else {
        events.emit('go_to_page', { page: 'business', search: `?${templateQuery.replace(':business_slug', '')}${store}` })
      }
    } else {
      events.emit('go_to_page', { page: 'search' })
    }
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

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  return (
    <>
      {userState?.loading
        ? (
        <div data-doc-section='integration-login' data-doc-state='loading'>
          <SpinnerLoader content={t('LOADING', 'Loading')} />
        </div>
          )
        : (
        <div data-doc-section='integration-login' data-doc-state={authModalOpen && !auth ? 'fallback' : 'settled'}>
          {authModalOpen && !auth && (
            <DialogOverlay
              legacyMaxWidth
              open={authModalOpen}
              onClose={() => closeAuthModal()}
              width='50%'
              closeOnBackdrop
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
                  closeModal={() => closeAuthModal()}
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
        </div>
          )}
    </>
  )
}

// With `destination` the submodule's controller is not mounted: its auth effect takes the store from the
// path's first segment, and on `/order` would go to the store `order`. Same request and session save as it.
const QueryLoginSpoonityDestination = ({ token, ...props }) => {
  const { destination } = props
  const [ordering] = useApi()
  const [{ auth }, { login }] = useSession()
  const [, { setStateValues }] = useOrder()
  const { search } = useLocation()
  const goToDestination = useGoToDestination(destination)
  const [userState, setUserState] = useState({ loading: !!token && !auth, user: {}, error: null })
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [modalPageToShow, setModalPageToShow] = useState(null)

  const handleGoToLogin = () => {
    setAuthModalOpen(true)
    setModalPageToShow('login')
  }

  const handleGetUser = async () => {
    try {
      const response = await fetch(`${ordering.root}/auth/spoonity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spoonity_token: token })
      })
      const { error, result } = await response.json()
      if (error) throw new Error(result)
      login({ user: result, token: result?.session?.access_token })
      setUserState({ loading: false, user: result, error: null })
    } catch (error) {
      setUserState({ loading: false, user: {}, error: [error.message] })
      handleGoToLogin()
    }
  }

  useEffect(() => {
    if (token && !auth) handleGetUser()
  }, [token, auth])

  useEffect(() => {
    if (!auth) return
    const query = new URLSearchParams(search)
    if (query.get('lat') && query.get('lng')) {
      setStateValues({ location: { lat: query.get('lat'), lng: query.get('lng') } })
    }
    goToDestination()
  }, [auth])

  return (
    <QueryLoginSpoonityUI
      {...props}
      userState={userState}
      authModalOpen={authModalOpen}
      setAuthModalOpen={setAuthModalOpen}
      modalPageToShow={modalPageToShow}
      setModalPageToShow={setModalPageToShow}
    />
  )
}

/**
 * @param {string} [props.destination] pathname (e.g. '/order') to go to after the login or on closing the
 * dialog, without `integration_token`/`integration_code`. Without it, the submodule's controller, which goes
 * to the store taken from the pathname.
 */
export const QueryLoginSpoonity = (props) => {
  if (props.destination) return <QueryLoginSpoonityDestination {...props} />
  const queryProps = {
    ...props,
    UIComponent: QueryLoginSpoonityUI
  }
  return <QueryLoginSpoonityController {...queryProps} />
}
