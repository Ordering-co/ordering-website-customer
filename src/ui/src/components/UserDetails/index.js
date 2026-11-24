import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import parsePhoneNumber from 'libphonenumber-js'
import PhoneInput from 'react-phone-number-input'

import {
  Container,
  Header,
  SideForm,
  UserData,
  UserName,
  ModalIcon,
  TitleContainer,
  CountryFlag,
  PhoneContainer,
  SkeletonsContainer,
  ChangeCustomerText,
  ChangeCustomerLink
} from './styles'

import { UserFormDetails as UserFormController } from '~components/components/UserFormDetails'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'

import { useCountdownTimer } from '~ui/hooks/useCountdownTimer'
import { Alert } from '~ui/src/components/Confirm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { VerifyCodeForm } from '~ui/src/components/VerifyCodeForm'
import { UserFormDetailsUI } from '~ui/src/components/UserFormDetails'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { themeControlHeight, themeSpace } from '~/utils/themeTokens'
import { getFormApiFeedback } from '~/utils/formApiFeedback'
import { SectionHeader } from '~ui/src/styles/DetailsSection'

const UserDetailsUI = (props) => {
  const {
    isEdit,
    formState,
    cleanFormState,
    cartStatus,
    toggleIsEdit,
    validationFields,
    isUserDetailsEdit,
    isCustomerMode,
    userState,
    isModal,
    setIsOpenUserData,
    isAddressFormOpen,
    onClose,
    handleSendVerifyCode,
    verifyPhoneState,
    requiredFields,
    setFormState,
    setIsSuccess,
    isCheckoutPlace,
    CustomerDetailsTitleComponent,
    isCheckoutSection,
    // implementation notes round 2: rendered right under the heading, above the form
    // or the read mode (the checkout's "Ordered here before? …" links)
    BelowTitleComponent,
    // round 4: the step card already has a heading of its own and, in its
    // header, this section's actions (Edit, Cancel) — suppresses this
    // section's whole title row (its text and its icon action)
    hideSectionHeading,
    // the step card's "Cancel": each new value leaves the open form, as the
    // title row's X does
    cancelEditNudge,
    // round 4: the step card's collapsed line ("Name · email · phone"),
    // read mode only — replaces the heading row and UserData entirely
    // (BelowTitleComponent still follows it); passed only when the caller
    // wants to collapse
    CollapsedSummaryComponent,
    // the checkout's guest form: told when a save fails
    onSaved
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ user, loading }] = useSession()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [skeletonsLength] = useState(requiredFields)
  const savedUser = !formState.result?.error && formState.result?.result
  const userData = userState.result?.result || props.userData || savedUser || user
  // In the checkouts: the section of the address (AddressDetails), its
  // action an icon button in the title row; elsewhere (reservation, the
  // customer modal) the text link of today
  const isSection = !!isCheckoutSection && !isModal
  const canEdit = cartStatus !== 2 && cartStatus !== 'payment_incomplete'

  const phoneCountry = (() => {
    const cellphone = userData?.guest_id
      ? (userData?.guest_cellphone ?? userData?.cellphone)
      : userData?.cellphone
    const countryCode = userData?.country_phone_code?.replace('+', '')
    if (!countryCode || !cellphone) return undefined
    // E.164, as the phone input takes it
    const phone = `+${countryCode}${cellphone.replace(`+${userData?.country_phone_code}`, '').replace(/[\s().-]/g, '')}`
    return parsePhoneNumber(phone)?.country
  })()

  const [willVerifyOtpState, setWillVerifyOtpState] = useState(false)
  const [otpLeftTime, , resetOtpLeftTime] = useCountdownTimer(
    600, willVerifyOtpState)

  useEffect(() => {
    if (isUserDetailsEdit) {
      !isEdit && toggleIsEdit()
    }
  }, [isUserDetailsEdit])

  useEffect(() => {
    setIsOpenUserData && setIsOpenUserData(isEdit)
  }, [isEdit])

  useEffect(() => {
    if (verifyPhoneState?.result?.error) {
      setAlertState({
        open: true,
        content: getFormApiFeedback(t, verifyPhoneState.result).message
      })
    } else { resetOtpLeftTime() }
  }, [verifyPhoneState?.result])

  const toggleEditState = () => {
    toggleIsEdit()
    cleanFormState({ changes: {} })
  }

  useEffect(() => {
    if (cancelEditNudge && isEdit) toggleEditState()
  }, [cancelEditNudge])

  const handleSendOtp = () => {
    if (willVerifyOtpState && formState?.changes?.cellphone && formState?.changes?.country_phone_code) {
      const { cellphone, country_phone_code: countryPhoneCode } = formState?.changes

      resetOtpLeftTime()

      handleSendVerifyCode({
        cellphone,
        country_phone_code: countryPhoneCode
      })
    }
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const handleSendPhoneCode = (values) => {
    setWillVerifyOtpState(false)
    setFormState({
      ...formState,
      changes: {
        ...formState?.changes,
        verification_code: values?.code
      }
    })
  }

  useEffect(() => {
    if (otpLeftTime === 0) {
      setAlertState({
        open: true,
        content: t('TIME_IS_UP_PLEASE_RESEND_CODE', 'Time is up. Please resend code again')
      })
    }
  }, [otpLeftTime])

  useEffect(() => {
    handleSendOtp()
  }, [willVerifyOtpState])

  useEffect(() => {
    if (isCheckoutPlace &&
      (requiredFields?.length === 0 || (requiredFields?.length === 1 && requiredFields?.includes('email') && isCustomerMode)) &&
      !formState?.loading
    ) {
      setIsSuccess && setIsSuccess(true)
      onClose && onClose()
    }
  }, [isCheckoutPlace, requiredFields])

  // implementation notes round 3: a loading -> not-loading transition with an error is the controller's own save
  // failing. Here, not in UserFormDetailsUI: the skeletons below replace the form while it sends, so the
  // form remounts and never sees the transition. (A successful save reaches the checkout through
  // handleSuccessUpdate, called synchronously inside the controller's save.) wasSaving: once per attempt.
  const wasSaving = useRef(false)
  useEffect(() => {
    if (formState?.loading) {
      wasSaving.current = true
      return
    }
    if (wasSaving.current) {
      wasSaving.current = false
      if (formState?.result?.error) onSaved?.(false)
    }
  }, [formState?.loading])

  const displayEmail = userData?.guest_email || userData?.email || user?.guest_email || user?.email

  return (
    <>
      {((validationFields.loading || formState.loading || userState.loading || loading)) && (
        <SkeletonsContainer>
          <UserData>
            {skeletonsLength?.map(field => (
              <div key={field?.id ?? field?.code ?? field}>
                <Skeleton width={250} height={35} />
                <Skeleton width='100%' height={themeControlHeight(theme, 'input')} />
              </div>
            ))}
            <Skeleton width='100%' height={themeControlHeight(theme, 'button')} style={{ marginTop: themeSpace(theme, 'xl') }} />
          </UserData>
        </SkeletonsContainer>
      )}

      {!(validationFields.loading || formState.loading || userState.loading || loading) && (
        <Container>
          {isModal && (
            <TitleContainer isAddressFormOpen={isAddressFormOpen && !isEdit}>
              {!isCheckoutPlace && (
                <ModalIcon>
                  <Button
                    shape='icon'
                    color='neutral'
                    appearance='ghost'
                    type='button'
                    aria-label={t('CLOSE', 'Close')}
                    onClick={() => onClose()}
                  >
                    <Icon name='closeMd' />
                  </Button>
                </ModalIcon>
              )}
              <h2>{t('CUSTOMER_DETAILS', 'Customer Details')}</h2>
            </TitleContainer>
          )}
          {!isCheckoutPlace && isSection && !isEdit && CollapsedSummaryComponent
            ? (
              <>
                <CollapsedSummaryComponent userData={userData} />
                {/* the links under the heading stay while collapsed too
                    (the checkout's "Log in / Sign up for faster checkout") */}
                {BelowTitleComponent && <BelowTitleComponent isEdit={false} />}
              </>
              )
            : (
              <>
                {!isCheckoutPlace && isSection && !hideSectionHeading && (
                  <SectionHeader className='user-form'>
                    {/* a section of the checkout's h1 */}
                    {CustomerDetailsTitleComponent ? <CustomerDetailsTitleComponent /> : <h2>{t('CUSTOMER_DETAILS', 'Customer Details')}</h2>}
                    {isEdit
                      ? cartStatus !== 2 && (
                        <Button data-doc-control='checkout-customer-cancel' shape='icon' color='neutral' appearance='ghost' type='button' aria-label={t('CANCEL', 'Cancel')} onClick={() => toggleEditState()}>
                          <Icon name='closeMd' />
                        </Button>
                      )
                      : canEdit && (
                        <Button data-doc-control='checkout-customer-edit' shape='icon' color='neutral' appearance='ghost' type='button' aria-label={t('CHANGE_USER_DETAILS', 'Change customer details')} onClick={() => toggleIsEdit()}>
                          <Icon name='pencil' />
                        </Button>
                      )}
                  </SectionHeader>
                )}
                {!isCheckoutPlace && isSection && BelowTitleComponent && <BelowTitleComponent isEdit={isEdit} />}
              </>
              )}
          {!isCheckoutPlace && !isSection && (
            <Header className='user-form'>
              {!isModal && (
                <>
                  {CustomerDetailsTitleComponent ? <CustomerDetailsTitleComponent /> : <h4>{t('CUSTOMER_DETAILS', 'Customer Details')}</h4>}
                </>
              )}
              {cartStatus !== 2 && isEdit && (
                // the close is an icon button of the theme
                <Button shape='icon' color='neutral' appearance='ghost' type='button' aria-label={t('CANCEL', 'Cancel')} onClick={() => toggleEditState()}>
                  <Icon name='closeMd' />
                </Button>
              )}
            </Header>
          )}

          {!isEdit
            ? (!(isSection && CollapsedSummaryComponent) && (
            <UserData $section={isSection}>
              {(userData?.name || userData?.middle_name || userData?.lastname || userData?.second_lastname) && (
                <UserName>
                  {userData?.name} {userData?.middle_name} {userData?.lastname} {userData?.second_lastname}
                </UserName>
              )}
              {/* a guest's email is guest_email and email can be ''; the saved
                  details may be only in the session user */}
              {displayEmail && (
                <p>{displayEmail}</p>
              )}
              {((userData?.cellphone ?? userData?.guest_cellphone) || (user?.cellphone ?? user?.guest_cellphone)) && (
                <PhoneContainer>
                  <CountryFlag>
                    {phoneCountry && (
                      <PhoneInput onChange={() => { }} defaultCountry={phoneCountry} />
                    )}
                  </CountryFlag>
                  <p>
                    {userData?.guest_id
                      ? (userData?.guest_cellphone ?? userData?.cellphone)
                      : userData?.cellphone}
                  </p>
                </PhoneContainer>
              )}
              {!isSection && (
                <ChangeCustomerText>
                  {canEdit && (
                    <ChangeCustomerLink onClick={() => toggleIsEdit()}>{t('CHANGE_USER_DETAILS', 'Change customer details')}</ChangeCustomerLink>
                  )}
                </ChangeCustomerText>
              )}
            </UserData>
              ))
            : (
            <SideForm $section={isSection}>
              <UserFormDetailsUI
                {...props}
                userData={userData}
                isCustomerMode={isCustomerMode}
                setWillVerifyOtpState={setWillVerifyOtpState}
              />
            </SideForm>
              )}
        </Container>
      )}
      <Alert
        title={t('PROFILE', 'Profile')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
      {willVerifyOtpState && (
        <DialogOverlay
          title={t('ENTER_VERIFICATION_CODE', 'Enter verification code')}
          open={willVerifyOtpState}
          size='lg'
          phone='center'
          onClose={() => setWillVerifyOtpState(false)}
        >
          <VerifyCodeForm
            otpLeftTime={otpLeftTime}
            credentials={formState?.changes}
            handleSendOtp={handleSendOtp}
            handleCheckPhoneCode={handleSendPhoneCode}
            email={(userData?.email || user?.email)}
            isPhone
          />
        </DialogOverlay>
      )}
    </>
  )
}

export const UserDetails = (props) => {
  const userDetailsProps = {
    ...props,
    UIComponent: UserDetailsUI
  }

  return <UserFormController {...userDetailsProps} />
}
