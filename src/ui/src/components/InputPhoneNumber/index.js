import React, { useEffect, useId } from 'react'
import parsePhoneNumber from 'libphonenumber-js'
import { useTheme } from 'styled-components'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSession } from '~components/contexts/SessionContext'
import { Container, ErrorMsg } from './styles'
import { InputPhone } from '~ui/src/design-system/components/InputPhone'
import { FieldLabel, fieldLabelAbove } from '~ui/src/styles/Field'

export const InputPhoneNumber = (props) => {
  const {
    user,
    value,
    setValue,
    handleIsValid,
    disabled,
    isError,
    id,
    label,
    errorText,
    align,
    enterKeyHint
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ auth }] = useSession()
  const [{ configs }] = useConfig()
  // with the labels above the fields: `label` over the number,
  // tied to its input (its `id`, or one of its own)
  const ownId = useId()
  const inputId = id || ownId
  const showLabel = !!label && fieldLabelAbove(theme)
  // the error under the field, tied to the number (aria-describedby)
  const errorId = `${ownId}-error`

  const isValidPhoneNumber = (number) => {
    if (!number) return
    if (!parseInt(configs?.validation_phone_number_lib?.value ?? 1, 10)) {
      return true
    }
    const numberParser = parsePhoneNumber(number)
    return numberParser?.isValid()
  }

  useEffect(() => {
    if (value) {
      handleIsValid && handleIsValid(isValidPhoneNumber(value))
    }
  }, [value])

  // A number that does not validate says so (its country code when the
  // user has none), else the error the screen gives (`errorText`)
  const isInvalid = !!value && !isValidPhoneNumber(value) && !disabled
  const missingCountryCode = !!auth && !user?.country_phone_code && !value?.includes('+')
  const errorMessage = isInvalid
    ? (missingCountryCode
        ? t('INVALID_ERROR_COUNTRY_CODE_PHONE_NUMBER', 'The country code of the phone number is invalid')
        : t('INVALID_ERROR_PHONE_NUMBER', 'The Phone Number field is invalid'))
    : (errorText || null)

  return (
    <Container className='phone_number'>
      {showLabel && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <InputPhone
        id={id || (showLabel ? inputId : undefined)}
        disabled={disabled}
        placeholder={t('PHONE_NUMBER', 'Phone number')}
        defaultCountry={configs?.default_country_code?.value}
        name='telefono'
        // the library's own defaults, stated: the phone pad and the "phone number" the keyboard offers to fill in
        // (the full number, so a number of another country switches the country select)
        type='tel'
        autoComplete='tel'
        inputMode='tel'
        enterKeyHint={enterKeyHint}
        aria-label={showLabel ? undefined : (label || t('PHONE_NUMBER', 'Phone number'))}
        countryLabel={t('PHONE_NUMBER_COUNTRY', 'Phone number country')}
        align={align}
        invalid={!!(isError || isInvalid)}
        aria-describedby={errorMessage ? errorId : undefined}
        value={value}
        displayInitialValueAsLocalNumber
        onChange={(val) => setValue && setValue(val, isValidPhoneNumber(val))}
      />
      {errorMessage && <ErrorMsg id={errorId}>{errorMessage}</ErrorMsg>}
    </Container>
  )
}
