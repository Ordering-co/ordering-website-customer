import React, { useEffect, useId, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { FieldLabel } from '~ui/src/styles/Field'
import { Input } from '~ui/src/design-system/components/Input'
import { getSiteLogoUrl } from '~/utils/siteBranding'
import { themeImage } from '~/utils/themeTokens'
import { Content, ErrorText, Form, Initials, LogoImage, Name, Row, Rule, Screen, Text, Title } from './styles'

const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase()

/**
 * What a visitor sees while the store is private: the store is
 * "coming soon" and the password the owner shared sits behind a link.
 * `onUnlock(password)` resolves when the password worked (the page then
 * reloads) and rejects with `{ reason: 'wrong' | 'rate' | 'network' }`.
 */
export const StorePrivate = ({ name, onUnlock }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const id = useId()
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [empty, setEmpty] = useState(false)
  // the store's own logo only (never Ordering's on an Ordering host): without one, its initials
  const logo = getSiteLogoUrl(themeImage(theme, 'logotype') || themeImage(theme, 'isotype'), '')
  const store = name || t('STORE_PRIVATE_THIS_STORE', 'This store')
  const errorId = `${id}-error`
  const errorText = {
    wrong: t('STORE_PRIVATE_WRONG_PASSWORD', "That password didn't work. Check it and try again."),
    rate: t('STORE_PRIVATE_RATE_LIMITED', 'Too many attempts. Wait a minute and try again.'),
    network: t('STORE_PRIVATE_NETWORK_ERROR', "We couldn't check the password. Try again.")
  }[error]

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const submit = async (event) => {
    event.preventDefault()
    if (loading) return
    if (!password) {
      // no request and no new text: the field is marked and takes the focus
      setEmpty(true)
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onUnlock(password)
      // success reloads the page: the button stays busy until then
    } catch (e) {
      setError(e?.reason || 'network')
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <Screen data-doc-section='store-private'>
      <Content>
        {logo
          ? <LogoImage src={logo} alt='' />
          : name && <Initials aria-hidden='true'>{initialsOf(name)}</Initials>}
        {name && <Name>{name}</Name>}
        <Title>{t('STORE_PRIVATE_TITLE', 'We are getting ready to open')}</Title>
        <Rule aria-hidden='true' />
        <Text>{t('STORE_PRIVATE_TEXT', '_store_ is preparing its online menu. Come back soon to order.').replace('_store_', () => store)}</Text>
        <Button
          appearance='link'
          type='button'
          aria-expanded={open}
          aria-controls={`${id}-form`}
          onClick={() => setOpen((value) => !value)}
        >
          {t('STORE_PRIVATE_HAVE_PASSWORD', 'I have a password')}
        </Button>
        <Form id={`${id}-form`} hidden={!open} onSubmit={submit} noValidate>
          <div>
            <FieldLabel htmlFor={`${id}-password`}>{t('PASSWORD', 'Password')}</FieldLabel>
            <Row>
              <Input
                ref={inputRef}
                id={`${id}-password`}
                type='password'
                autoComplete='current-password'
                maxLength={64}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setEmpty(false) }}
                invalid={!!error || empty}
                aria-describedby={error ? errorId : undefined}
                spellCheck='false'
              />
              <Button type='submit' color='primary' busy={loading}>
                {loading ? t('LOADING', 'Loading...') : t('STORE_PRIVATE_ENTER', 'Enter store')}
              </Button>
            </Row>
            {error && <ErrorText id={errorId} role='alert'>{errorText}</ErrorText>}
          </div>
        </Form>
      </Content>
    </Screen>
  )
}

export default StorePrivate
