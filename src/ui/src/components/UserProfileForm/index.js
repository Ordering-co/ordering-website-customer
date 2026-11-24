import React, { useState, useEffect, useId, useRef } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { StudentsList } from '../StudentsList'

import {
  Container,
  UserProfileContainer,
  UserImage,
  Image,
  SideForm,
  SavedPlaces,
  UploadImageIcon,
  SkeletonWrapper,
  WrapperForm,
  EditPhotoAction,
  FieldError
} from './styles'

import { UserFormDetails as UserProfileController } from '~components/components/UserFormDetails'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSite } from '~components/contexts/SiteContext'
import { getSiteName } from '~/utils/siteBranding'
import { useSession } from '~components/contexts/SessionContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { DragAndDrop } from '~components/components/DragAndDrop'
import { ExamineClick } from '~components/components/ExamineClick'

import { bytesConverter } from '~ui/utils'
import { Alert } from '~ui/src/components/Confirm'
import { useCountdownTimer } from '~ui/hooks/useCountdownTimer'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { FallbackImage } from '~ui/src/styles/FallbackImage'
import { AddressList } from '~ui/src/components/AddressList'
import { VerifyCodeForm } from '~ui/src/components/VerifyCodeForm'
import { UserFormDetailsUI } from '~ui/src/components/UserFormDetails'
import { usePageSections } from '~ui/hooks/usePageSections'
import { AccountInviteOnEnter } from '../AccountInvite'
import { slotButtonOptions } from '~/utils/themeGroups'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'
import { themeValue } from '~/utils/themeTokens'
import { getFormApiFeedback } from '~/utils/formApiFeedback'

const UserProfileFormUI = (props) => {
  const {
    userData,
    handleButtonUpdateClick,
    handlechangeImage,
    formState,
    cleanFormState,
    toggleIsEdit,
    isHiddenAddress,
    handleSendVerifyCode,
    verifyPhoneState,
    setFormState,
    view
  } = props

  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [{ user }] = useSession()
  const theme = useTheme()
  const [{ site }] = useSite()
  const [willVerifyOtpState, setWillVerifyOtpState] = useState(false)
  const [otpLeftTime, , resetOtpLeftTime] = useCountdownTimer(
    600, willVerifyOtpState)
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [photoFieldError, setPhotoFieldError] = useState(null)
  const [codeFieldError, setCodeFieldError] = useState(null)
  const [handledSave, setHandledSave] = useState(null)
  const inputRef = useRef(null)
  const photoRequest = useRef(null)
  const feedbackId = useId()
  const photoErrorId = `${feedbackId}-photo-error`
  const codeErrorId = `${feedbackId}-code-error`

  // the profile's photo: a section of the profile page (pages.profile
  // profile_photo), the theme may hide it
  const { isVisible } = usePageSections('profile')
  const showCustomerPicture = view === 'account' && isVisible('profile_photo')
  // the pencil is a button that opens the file picker, the
  // profile_photo.slots.edit piece (an icon button, ghost and neutral when
  // the theme leaves it out)
  const editOptions = slotButtonOptions(theme, 'profile_photo', 'edit', { color: 'neutral', appearance: 'ghost', size: 'md', shape: 'icon' })
  const photoSize = themeValue(theme, 'profile_photo', 'base.size')
  const photoTitle = t('CHANGE_PROFILE_PHOTO', 'Change profile photo')
  const codeTitle = t('ENTER_VERIFICATION_CODE', 'Enter verification code')

  const handleFiles = (files) => {
    if (files.length !== 1) return
    const [file] = files
    if (inputRef.current) inputRef.current.value = ''
    const type = file.type.split('/')[0]
    if (type !== 'image') {
      setAlertState({
        open: true,
        title: photoTitle,
        content: [t('ERROR_ONLY_IMAGES', 'Only images can be accepted')]
      })
      return
    }

    if (bytesConverter(file.size) > 2048) {
      setAlertState({
        open: true,
        title: photoTitle,
        content: [t('IMAGE_MAXIMUM_SIZE', 'The maximum image size is 2 megabytes')]
      })
      return
    }
    setPhotoFieldError(null)
    handlechangeImage(file)
  }

  const toggleEditState = (val) => {
    toggleIsEdit()
    if (!val) {
      cleanFormState({ changes: {} })
    }
  }

  const handleClickImage = () => {
    inputRef.current.click()
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const handleSendOtp = () => {
    if (willVerifyOtpState && formState?.changes?.cellphone && formState?.changes?.country_phone_code) {
      const { cellphone, country_phone_code: countryPhoneCode } = formState?.changes

      resetOtpLeftTime()
      setCodeFieldError(null)

      handleSendVerifyCode({
        cellphone,
        country_phone_code: countryPhoneCode
      })
    }
  }

  useEffect(() => {
    if (showCustomerPicture && formState.changes?.photo) {
      photoRequest.current = { previousResult: formState.result }
      handleButtonUpdateClick(null, true)
    }
  }, [formState.changes?.photo])

  const saveError = !formState?.loading && formState?.result?.error ? formState.result : null
  const photoFailed = !!(saveError && photoRequest.current && saveError !== photoRequest.current.previousResult)
  const codeFeedback = saveError && !photoFailed && formState?.changes?.verification_code
    ? getFormApiFeedback(t, saveError, { fields: ['verification_code'] })
    : null

  useEffect(() => {
    if (!saveError || handledSave === saveError) return
    if (photoFailed) {
      const { message, fields } = getFormApiFeedback(t, saveError, { fields: showCustomerPicture ? ['photo'] : [] })
      setPhotoFieldError(fields.photo)
      setHandledSave(saveError)
      if (message) setAlertState({ open: true, content: message, title: photoTitle })
      // The controller keeps rejected changes. Reset just the photo so the same
      // file can be picked again without losing other edits.
      const { photo, ...changes } = formState.changes
      setFormState({ ...formState, changes })
    } else if (codeFeedback) {
      setHandledSave(saveError)
      if (codeFeedback.fields.verification_code) {
        setCodeFieldError(codeFeedback.fields.verification_code)
        setWillVerifyOtpState(true)
      }
      if (codeFeedback.message) {
        setAlertState({ open: true, content: codeFeedback.message, title: t('UPDATE_PROFILE', 'Update profile') })
      }
    }
  }, [saveError])

  useEffect(() => {
    if (verifyPhoneState?.loading) return
    if (verifyPhoneState?.result?.error) {
      setAlertState({
        open: true,
        title: t('SEND_CODE', 'Send code'),
        content: getFormApiFeedback(t, verifyPhoneState.result).message
      })
    } else { resetOtpLeftTime() }
  }, [verifyPhoneState?.result, verifyPhoneState?.loading])

  useEffect(() => {
    toggleIsEdit()
  }, [])

  useEffect(() => {
    if (!codeFieldError) handleSendOtp()
  }, [willVerifyOtpState])

  useEffect(() => {
    if (otpLeftTime === 0) {
      setAlertState({
        open: true,
        content: t('TIME_IS_UP_PLEASE_RESEND_CODE', 'Time is up. Please resend code again')
      })
    }
  }, [otpLeftTime])

  const handleSendPhoneCode = (values) => {
    setWillVerifyOtpState(false)
    setCodeFieldError(null)
    setFormState({
      ...formState,
      changes: {
        ...formState?.changes,
        verification_code: values?.code
      }
    })
  }

  // the profile photo's placeholder (components.profile_photo): without a
  // photo, or when it fails to load
  const photoPlaceholder = (
    <UploadImageIcon>
      <Icon name="image" />
      <span>{t('DRAG_DROP_IMAGE_HERE', 'Put your image here')}</span>
    </UploadImageIcon>
  )

  return (
    <>
      {/* the account page; the other views (notifications, languages...) are not where a guest is invited */}
      {view === 'account' && <AccountInviteOnEnter entry='profile' />}
      <Container
        $alignToContent={['account', 'language'].includes(view)}
        data-doc-section='user-profile'
        data-doc-state={view === 'account' ? 'editable' : 'ready'}
      >
        {view !== 'savedPlaces' && view !== 'students' && (
          <>
            <h1>{view === 'account'
              ? t('MY_ACCOUNT', 'My Account')
              : view === 'notifications'
                ? t('NOTIFICATIONS', 'Notifications')
                : view === 'language'
                  ? t('LANGUAGES', 'Languages')
                  : ''}
            </h1>
            <p>
              {view === 'notifications' && (
                <>
                  {t('NOTIFICATIONS_DESCRIPTION_PART1', 'Set up')} <span className='bold'>{t('PROMOTIONAL', 'promotional')}</span> {t('NOTIFICATIONS_DESCRIPTION_PART2_SITE_NAME', 'notifications you would like to receive from _site_').replace('_site_', getSiteName({ theme, site }))}
                </>
              )}
            </p>
            {/* the notifications take the whole page box, as the
                other account pages' content */}
            <UserProfileContainer mbottom={(isHiddenAddress || view !== 'savedPlaces') && 25} $fullWidth={view === 'notifications'}>
              {showCustomerPicture && (
                <UserImage className='user-image' data-doc-control='profile-photo'>
                  <p>{t('UPDATE_INFORMATION', 'Update Information')}</p>
                  <Image onClick={() => handleClickImage()} isImage={user?.photo || (formState?.changes?.photo && !formState.result?.error)}>
                    <ExamineClick onFiles={handleFiles} childRef={(e) => { inputRef.current = e }} accept='image/png, image/jpeg, image/jpg' disabled={formState.loading}>
                      <DragAndDrop onDrop={dataTransfer => handleFiles(dataTransfer.files)} accept='image/png, image/jpeg, image/jpg' disabled={formState.loading}>
                        {formState.changes?.photo && formState.loading
                          ? (<SkeletonWrapper><Skeleton /></SkeletonWrapper>)
                          : ((!formState.changes?.photo || formState.result?.error)
                              ? user?.photo
                                /* a photo that fails to load shows the placeholder of
                                   components.profile_photo (as without one), never the
                                   broken image with its alt text */
                                ? (<FallbackImage src={user?.photo} alt={t('PROFILE_PHOTO', 'Profile photo')} width={photoSize} height={photoSize} loading='lazy' failedContent={photoPlaceholder} />)
                                : photoPlaceholder
                              : <img src={formState.changes.photo} alt={t('PROFILE_PHOTO', 'Profile photo')} loading='lazy' />
                            )}
                      </DragAndDrop>
                    </ExamineClick>
                  </Image>
                  <EditPhotoAction>
                    <Button
                      type='button'
                      {...editOptions}
                      aria-label={photoTitle}
                      aria-describedby={photoFieldError ? photoErrorId : undefined}
                      disabled={formState.loading}
                      onClick={handleClickImage}
                    >
                      <Icon name='pencil' />
                    </Button>
                  </EditPhotoAction>
                </UserImage>
              )}
              {showCustomerPicture && photoFieldError && <FieldError id={photoErrorId} role='alert'>{photoFieldError}</FieldError>}
              <SideForm className='user-form' $fullWidth={view === 'notifications'}>
                <WrapperForm>
                  <UserFormDetailsUI
                    {...props}
                    formState={photoFailed || codeFeedback || (handledSave && saveError === handledSave)
                      ? { ...formState, result: { error: false } }
                      : formState}
                    handleButtonUpdateClick={(...args) => {
                      photoRequest.current = null
                      handleButtonUpdateClick(...args)
                    }}
                    onCancel={toggleEditState}
                    isHiddenAddress={isHiddenAddress}
                    setWillVerifyOtpState={setWillVerifyOtpState}
                  />
                </WrapperForm>
              </SideForm>
            </UserProfileContainer>
          </>
        )}
        {(userData?.addresses || user?.addresses) && !isHiddenAddress && view === 'savedPlaces' && (
          <SavedPlaces>
            <AddressList isModal addressList={user?.addresses} isProfile titleAs='h1' title={t('PROFILE_ADDRESSES', 'Addresses')} />
          </SavedPlaces>
        )}
        {view === 'students' && configs?.school_module_enabled?.value === '1' && (
          <StudentsList />
        )}
      </Container>
      <Alert
        title={alertState.title || t('PROFILE', 'Profile')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
      {willVerifyOtpState && (
        <DialogOverlay
          title={codeTitle}
          open={willVerifyOtpState}
          size='lg'
          phone='center'
          onClose={() => {
            setWillVerifyOtpState(false)
            setCodeFieldError(null)
          }}
        >
          <div role='group' aria-label={codeTitle} aria-describedby={codeFieldError ? codeErrorId : undefined}>
            <VerifyCodeForm
              otpLeftTime={otpLeftTime}
              credentials={formState?.changes}
              handleSendOtp={handleSendOtp}
              handleCheckPhoneCode={handleSendPhoneCode}
              email={(userData?.email || user?.email)}
              isPhone
            />
            {codeFieldError && <FieldError id={codeErrorId} role='alert'>{codeFieldError}</FieldError>}
          </div>
        </DialogOverlay>
      )}
    </>
  )
}

export const UserProfileForm = (props) => {
  const UserProfileProps = {
    ...props,
    UIComponent: UserProfileFormUI
  }

  return (
    <UserProfileController {...UserProfileProps} />
  )
}
