import React, { useLayoutEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import loadable from '@loadable/component'
import { SignupForm as SignUpController } from '~components/components/SignupForm'
import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useValidationFields } from '~components/contexts/ValidationsFieldsContext'
import { getThemeComponent } from '~/utils/themeCss'
import { Button } from '~ui/src/design-system/components/Button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~ui/src/design-system/components/Dialog'
import { Icon } from '~ui/src/design-system/components/Icon'
import { DialogTitleBridge } from '~ui/src/components/Overlay/DialogTitleBridge'
import { canFinishInWindow, guestCellphone, guestEmail } from './eligibility'
import { PasswordStep } from './PasswordStep'
import { Actions, Benefits, Done, Group, Identity, Mark, Stack } from './styles'

// The forms open on interaction: their vendor trees (firebase, phone metadata) stay out of this chunk
const SignUpForm = loadable(() => import('~ui/src/components/SignUpForm').then((m) => m.SignUpForm))
const LoginForm = loadable(() => import('~ui/src/components/LoginForm').then((m) => m.LoginForm))
const ForgotPasswordForm = loadable(() => import('~ui/src/components/ForgotPasswordForm').then((m) => m.ForgotPasswordForm))

// The text of each entry. Every key is spelled whole, so the i18n scan finds it.
const inviteCopy = (entry, isGuest, t) => {
  const decline = t('ACCOUNT_INVITE_NOT_NOW', 'Not now')
  if (entry === 'confirmation') {
    return {
      icon: 'checkCircleFill',
      title: t('ACCOUNT_INVITE_CONFIRMATION_TITLE', 'Save this order to an account'),
      description: t('ACCOUNT_INVITE_CONFIRMATION_DESCRIPTION', 'Your order is placed. Create an account and it will be waiting for you, along with your details.'),
      decline
    }
  }
  if (entry === 'orders') {
    return {
      icon: 'clockHistory',
      title: t('ACCOUNT_INVITE_ORDERS_TITLE', 'Keep all your orders in one place'),
      description: isGuest
        ? t('ACCOUNT_INVITE_ORDERS_DESCRIPTION', 'You ordered as a guest. With an account you can see every order, track it and reorder it.')
        : t('ACCOUNT_INVITE_ORDERS_VISITOR_DESCRIPTION', 'Create an account to see your orders, track them and order again.'),
      decline: isGuest ? t('ACCOUNT_INVITE_CONTINUE_TO_ORDERS', 'Continue to my orders') : decline
    }
  }
  return {
    icon: 'user',
    title: t('ACCOUNT_INVITE_PROFILE_TITLE', 'Create your account'),
    description: isGuest
      ? t('ACCOUNT_INVITE_PROFILE_DESCRIPTION', 'Profiles are for accounts. Create one with the details you already gave us.')
      : t('ACCOUNT_INVITE_PROFILE_VISITOR_DESCRIPTION', 'Create an account to keep your details for next time.'),
    decline: isGuest ? t('CONTINUE_AS_GUEST', 'Continue as guest') : decline
  }
}

// The same places when the account is finished in the window
const passwordCopy = (entry, t) => {
  if (entry === 'confirmation') {
    return {
      title: t('ACCOUNT_INVITE_PASSWORD_CONFIRMATION_TITLE', 'Your order is in. Save your details?'),
      description: t('ACCOUNT_INVITE_PASSWORD_CONFIRMATION_DESCRIPTION', 'Add a password and this order is waiting for you in your account.'),
      decline: t('ACCOUNT_INVITE_NOT_NOW', 'Not now')
    }
  }
  if (entry === 'orders') {
    return {
      title: t('ACCOUNT_INVITE_PASSWORD_ORDERS_TITLE', 'See your orders with an account'),
      description: t('ACCOUNT_INVITE_PASSWORD_ORDERS_DESCRIPTION', 'Add a password and every order you place stays in one list.'),
      decline: t('CONTINUE_AS_GUEST', 'Continue as guest')
    }
  }
  return {
    title: t('ACCOUNT_INVITE_PASSWORD_PROFILE_TITLE', 'Set a password to keep your profile'),
    description: t('ACCOUNT_INVITE_PASSWORD_PROFILE_DESCRIPTION', 'Profiles are for accounts. One password is all that is missing.'),
    decline: t('CONTINUE_AS_GUEST', 'Continue as guest')
  }
}

// Where a new opening starts, from the session as it is then; the invitation keeps it until it closes
// (the session changes under it when the account is created).
const startRun = ({ theme, user, configs, validationFields }) => {
  const isGuest = !!user?.guest_id
  const flow = getThemeComponent(theme, 'account_invite')?.base?.flow
  const inWindow = flow === 'in_window' && canFinishInWindow({ user, configs, validationFields })
  return {
    step: inWindow ? 'password' : 'invite',
    isGuest,
    inWindow,
    guest: {
      name: user?.name,
      lastname: user?.lastname,
      email: guestEmail(user),
      cellphone: guestCellphone(user),
      country_phone_code: user?.country_phone_code
    }
  }
}

/**
 * Invites a guest (or a visitor) to create an account. Controlled: `open`, `onClose`. `entry`: `confirmation`
 * | `orders` | `profile`. The store's `components.account_invite.base.flow` picks how: `signup_form` (the
 * invitation, then the sign-up form) or `in_window` (the account finished here with a password; it falls to
 * the first when the sign-up asks more than the guest has given). One layer at a time. `onDone` runs when an
 * account was created or the guest logged in, before `onClose`.
 */
export const AccountInvite = ({ entry = 'confirmation', open, onClose, onDone }) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ user }, { login }] = useSession()
  const [{ configs }] = useConfig()
  const [validationFields] = useValidationFields()
  const [run, setRun] = useState(null)
  const [wasOpen, setWasOpen] = useState(false)
  const cta = useRef(null)
  const passwordFocus = useRef(null)
  const resetLink = useRef(null)
  const authContent = useRef(null)
  const recovering = run?.step === 'recovery'
  const returnToResetLink = useRef(false)

  useLayoutEffect(() => {
    if (recovering) {
      authContent.current?.focus()
    } else if (returnToResetLink.current) {
      returnToResetLink.current = false
      const target = resetLink.current ?? authContent.current
      target?.focus()
    }
  }, [recovering])

  // adjusted while rendering (not in an effect): each opening starts again
  if (!!open !== wasOpen) {
    setWasOpen(!!open)
    if (open) setRun(startRun({ theme, user, configs, validationFields }))
  }
  // closed, it keeps what it showed so the dialog can leave
  if (!run) return null

  const { step, isGuest, inWindow, guest } = run
  const go = (next) => setRun((current) => ({ ...current, step: next }))
  const close = () => onClose?.()
  const finish = () => {
    onDone?.()
    onClose?.()
  }
  const handleSuccessSignup = async (created) => {
    await login({ user: created, token: created?.session?.access_token })
    if (inWindow) go('success')
    else finish()
  }
  const handleSuccessLogin = (logged) => {
    if (logged) finish()
  }
  const toLogin = (event) => {
    event.preventDefault()
    go('login')
  }
  const backFromRecovery = () => {
    returnToResetLink.current = true
    go('login')
  }

  const invite = inviteCopy(entry, isGuest, t)
  const benefits = [
    { icon: 'clockHistory', text: t('ACCOUNT_INVITE_BENEFIT_ORDERS', 'Track and reorder past orders') },
    { icon: 'geoAlt', text: t('ACCOUNT_INVITE_BENEFIT_ADDRESSES', 'Your addresses saved for next time') },
    { icon: 'creditCard', text: t('ACCOUNT_INVITE_BENEFIT_CHECKOUT', 'Faster checkout with your details filled in') }
  ]
  // "Sign up for faster checkout"'s prefill (Checkout `fasterCheckoutSignupProps`): the guest's own details
  const prefill = isGuest && {
    externalPhoneNumber: guest.country_phone_code && guest.cellphone ? `+${guest.country_phone_code}${guest.cellphone}` : undefined,
    initialValues: { name: guest.name, lastname: guest.lastname, email: guest.email }
  }

  return (
    <>
      <Dialog open={!!open && step === 'invite'} onOpenChange={(next) => { if (!next) close() }}>
        <DialogContent size='sm' phone='sheet' initialFocus={cta}>
          <DialogHeader>
            <Mark><Icon name={invite.icon} size='lg' /></Mark>
            <DialogTitle>{invite.title}</DialogTitle>
            <DialogDescription>{invite.description}</DialogDescription>
          </DialogHeader>
          <Stack>
            <Group>
              <Benefits>
                {benefits.map((benefit) => (
                  <li key={benefit.icon}><Icon name={benefit.icon} size='md' /><span>{benefit.text}</span></li>
                ))}
              </Benefits>
              {!!guest.email && (
                <Identity><Icon name='envelope' size='md' />{t('ACCOUNT_INVITE_WE_WILL_USE', 'We\'ll use _email_').replace('_email_', guest.email)}</Identity>
              )}
            </Group>
            <Actions>
              <Button ref={cta} cta onClick={() => go('signup')}>{t('CREATE_ACCOUNT', 'Create account')}</Button>
              <DialogClose render={<Button color='neutral' appearance='outline' />}>{invite.decline}</DialogClose>
              <Button appearance='ghost' size='sm' onClick={() => go('login')}>{t('ACCOUNT_INVITE_ALREADY_HAVE_ACCOUNT', 'I already have an account')}</Button>
            </Actions>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={!!open && (step === 'password' || step === 'success')} onOpenChange={(next) => { if (!next) (step === 'success' ? finish() : close()) }}>
        <DialogContent size='md' phone='screen' initialFocus={passwordFocus}>
          {step === 'success'
            ? (
              <>
                <DialogHeader>
                  <Mark><Icon name='checkCircleFill' size='lg' /></Mark>
                  <DialogTitle>{t('ACCOUNT_INVITE_SUCCESS_TITLE', 'Account created')}</DialogTitle>
                  <DialogDescription>{t('ACCOUNT_INVITE_SUCCESS_DESCRIPTION', 'Account created. Your order is in My orders.')}</DialogDescription>
                </DialogHeader>
                <Done>
                  <DialogClose render={<Button cta autoFocus />}>{t('CONTINUE', 'Continue')}</DialogClose>
                </Done>
              </>
              )
            : (
              <SignUpController
                isGuest
                handleSuccessSignup={handleSuccessSignup}
                UIComponent={PasswordStep}
                copy={passwordCopy(entry, t)}
                guest={guest}
                focusRef={passwordFocus}
                onEdit={() => go('signup')}
                onLogin={() => go('login')}
              />
              )}
        </DialogContent>
      </Dialog>

      {/* the forms hand their title to the dialog's row (ModalHeading); their alerts are Dialogs nested in it */}
      <Dialog open={!!open && step === 'signup'} onOpenChange={(next) => { if (!next) close() }}>
        <DialogContent size='xl'>
          <DialogTitleBridge>
            <SignUpForm
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={handleSuccessSignup}
              isPopup
              isGuest={isGuest}
              elementLinkToLogin={<a href='#' onClick={toLogin}>{t('LOGIN', 'Login')}</a>}
              {...prefill}
            />
          </DialogTitleBridge>
        </DialogContent>
      </Dialog>
      <Dialog open={!!open && (step === 'login' || recovering)} onOpenChange={(next) => { if (!next) (recovering ? backFromRecovery() : close()) }}>
        <DialogContent size='xl'>
          <DialogTitleBridge title={recovering ? t('TITLE_FORGOT_PASSWORD', 'Forgot your password?') : undefined}>
            <div ref={authContent} tabIndex={-1}>
              <div hidden={recovering}>
                <LoginForm
                  handleSuccessLogin={handleSuccessLogin}
                  isPopup
                  isGuest={isGuest}
                  elementLinkToForgotPassword={entry !== 'confirmation' && (
                    <a
                      ref={resetLink}
                      href='#'
                      onClick={(event) => { event.preventDefault(); go('recovery') }}
                    >{t('RESET_PASSWORD', 'Reset password')}
                    </a>
                  )}
                />
              </div>
              {recovering && (
                <ForgotPasswordForm
                  isPopup
                  elementLinkToLogin={<a href='#' onClick={(event) => { event.preventDefault(); backFromRecovery() }}>{t('LOGIN', 'Login')}</a>}
                />
              )}
            </div>
          </DialogTitleBridge>
        </DialogContent>
      </Dialog>
    </>
  )
}
