import React, { useId, useRef, useState } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { DialogClose, DialogDescription, DialogHeader, DialogTitle } from '~ui/src/design-system/components/Dialog'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Input } from '~ui/src/design-system/components/Input'
import { Actions, Form, Group, Hint, Label, Summary } from './styles'

const MIN_LENGTH = 8
// SignUpForm's own email pattern
const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

// What the controller's `formState` says went wrong (a string or a list of messages)
const apiError = (formState) => {
  if (!formState?.result?.error) return ''
  const messages = [].concat(formState.result.result ?? [])
  return messages.filter((message) => typeof message === 'string').join(' ')
}

/**
 * The invitation that finishes the account in the window (the sign-up controller's UIComponent): the
 * details of the order are shown, not typed again, and the guest only chooses a password (and an email
 * when the order has none). It sends through the controller, which adds the guest token.
 * `guest`: `{ name, lastname, email, cellphone, country_phone_code }`. `copy`: `{ title, description, decline }`.
 */
export const PasswordStep = ({ copy, guest, focusRef, formState, handleButtonSignupClick, onEdit, onLogin }) => {
  const [, t] = useLanguage()
  const id = useId()
  const sending = useRef(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState({})
  const hasEmail = !!guest.email
  const serverError = apiError(formState)
  const passwordError = errors.password || serverError || (errors.fail && t('ACCOUNT_INVITE_ERROR', 'We could not create your account. Please try again.'))
  const loading = !!formState?.loading

  const submit = async (event) => {
    event.preventDefault()
    if (sending.current || loading) return
    const attribute = t('EMAIL', 'Email')
    const next = {}
    if (!hasEmail) {
      if (!email.trim()) next.email = t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', attribute)
      else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', attribute)
    }
    if (!password) next.password = t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required').replace('_attribute_', t('PASSWORD', 'Password'))
    else if (password.length < MIN_LENGTH) next.password = t('VALIDATION_ERROR_PASSWORD_MIN_STRING', 'The Password must be at least 8 characters.').replace('_attribute_', t('PASSWORD', 'Password')).replace('_min_', MIN_LENGTH)
    setErrors(next)
    if (Object.keys(next).length) return
    sending.current = true
    try {
      await handleButtonSignupClick({
        name: guest.name,
        lastname: guest.lastname,
        email: hasEmail ? guest.email : email.trim(),
        cellphone: guest.cellphone,
        country_phone_code: guest.country_phone_code,
        password
      })
    } catch {
      // the controller throws before its own request when the number does not parse
      setErrors({ fail: true })
    } finally {
      sending.current = false
    }
  }

  const details = [
    { icon: 'user', text: [guest.name, guest.lastname].filter(Boolean).join(' ') },
    { icon: 'envelope', text: guest.email },
    { icon: 'phone', text: guest.cellphone && `${guest.country_phone_code ? `+${guest.country_phone_code} ` : ''}${guest.cellphone}` }
  ].filter((row) => row.text)

  const toggle = (
    <Button
      type='button'
      shape='icon'
      size='sm'
      color='neutral'
      appearance='ghost'
      aria-label={shown ? t('HIDE_PASSWORD', 'Hide password') : t('SHOW_PASSWORD', 'Show password')}
      aria-pressed={shown}
      onClick={() => setShown((value) => !value)}
    >
      <Icon name={shown ? 'eyeSlashBs' : 'eye'} />
    </Button>
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
      <Form onSubmit={submit} noValidate>
        {hasEmail
          ? (
            <Group>
              {!!details.length && (
                <Summary aria-label={t('CHECKOUT_YOUR_DETAILS', 'Your details')}>
                  {details.map((row) => <li key={row.icon}><Icon name={row.icon} size='md' /><span>{row.text}</span></li>)}
                </Summary>
              )}
              <div>
                <Button type='button' color='neutral' appearance='ghost' size='sm' onClick={onEdit}>
                  <Icon name='pencil' />{t('ACCOUNT_INVITE_EDIT_DETAILS', 'Edit details')}
                </Button>
              </div>
            </Group>
            )
          : (
            <Group>
              <Label htmlFor={`${id}-email`}>{t('EMAIL', 'Email')}</Label>
              <Input
                ref={focusRef}
                id={`${id}-email`}
                type='email'
                autoComplete='email'
                value={email}
                invalid={!!errors.email}
                aria-describedby={errors.email ? `${id}-email-error` : undefined}
                onChange={(event) => { setEmail(event.target.value); setErrors({}) }}
              />
              {errors.email && <Hint id={`${id}-email-error`} $error role='alert'>{errors.email}</Hint>}
            </Group>
            )}
        <Group>
          <Label htmlFor={`${id}-password`}>{t('ACCOUNT_INVITE_CREATE_PASSWORD', 'Create a password')}</Label>
          <Input
            ref={hasEmail ? focusRef : undefined}
            id={`${id}-password`}
            type={shown ? 'text' : 'password'}
            autoComplete='new-password'
            value={password}
            invalid={!!passwordError}
            aria-describedby={`${id}-hint`}
            suffix={toggle}
            onChange={(event) => { setPassword(event.target.value); setErrors({}) }}
          />
          <Hint id={`${id}-hint`} $error={!!passwordError} role={passwordError ? 'alert' : undefined}>
            {passwordError || t('ACCOUNT_INVITE_PASSWORD_HINT', 'At least 8 characters')}
          </Hint>
        </Group>
        <Actions>
          <Button type='submit' cta loading={loading}>{t('CREATE_ACCOUNT', 'Create account')}</Button>
          <DialogClose render={<Button color='neutral' appearance='ghost' />}>{copy.decline}</DialogClose>
          {/* an email that already has an account: log in instead (as the invitation's) */}
          <Button type='button' appearance='ghost' size='sm' onClick={onLogin}>{t('ACCOUNT_INVITE_ALREADY_HAVE_ACCOUNT', 'I already have an account')}</Button>
        </Actions>
      </Form>
    </>
  )
}
