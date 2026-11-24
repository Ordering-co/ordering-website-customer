import React, { useState, useEffect } from 'react'

import {
  Container,
  OtpWrapper,
  DownTimer
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { formatSeconds } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'
import { InputCode } from '~ui/src/design-system/components/InputCode'

export const VerifyCodeForm = (props) => {
  const {
    otpLeftTime,
    handleSendOtp,
    handleCheckPhoneCode,
    credentials,
    email,
    isPhone
  } = props

  const [, t] = useLanguage()
  const [otpState, setOtpState] = useState('')

  const numOtpInputs = 4

  useEffect(() => {
    if (otpState?.length === numOtpInputs) {
      const { cellphone, country_phone_code: countryPhoneCode } = credentials

      handleCheckPhoneCode({
        cellphone,
        country_phone_code: countryPhoneCode,
        code: otpState
      })
    }
  }, [otpState])

  return (
    <Container>
      <p>{t('SENT_VERIFY_CODE_ON_EMAIL', 'We sent you a verification code on _email_').replace('_email_', isPhone ? credentials?.cellphone : email)}</p>
      <DownTimer>{formatSeconds(otpLeftTime)}</DownTimer>
      <OtpWrapper>
        <InputCode length={numOtpInputs} value={otpState} onChange={setOtpState} autoFocus />
      </OtpWrapper>
      {/* a naked primary: ghost. Base Button is type='button'; the legacy one was a submit, which only differed inside a <form>, and here the modal (Popup) is a portal, in no form */}
      <Button
        color='primary'
        appearance='ghost'
        onClick={handleSendOtp}
      >
        {t('RESEND_CODE', 'Resend code')}
      </Button>
    </Container>
  )
}
