import React, { useState, useEffect, useId, useRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { useForm } from 'react-hook-form'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  MessagesContainer,
  HeaderProfile,
  Image,
  Chat,
  MessageCustomer,
  MessageBusiness,
  SkeletonBubbleCustomer,
  SkeletonBubbleBusiness,
  TimeofSent,
  SendForm,
  Send,
  MessageConsole,
  BubbleConsole,
  WrapperDeleteImage,
  WrapperSendMessageButton,
  HeaderOnline,
  ImageContainer,
  ModalIcon,
  MessagesLayoutWrapper,
  MessagesLeftLayout,
  MessagesRightLayout,
  MessagesTitle,
  CustomerList,
  MessagesClose,
  InputWrapper,
  MessageContentWrapper,
  MessageCreatedDate,
  NotSendMessage,
  QuickMessageWrapper,
  ProfileMessageHeader,
  MessageType,
  OrderData,
  OrderTitle,
  MessagesTypes
} from './styles'

import { slotButtonOptions } from '~/utils/themeGroups'
import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'
import { NO_TRANSLATION, translatedText } from '~/utils/translationText'
import { Messages as MessagesController } from '~components/components/Messages'
import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Input } from '~ui/src/design-system/components/Input'
import { Button } from '~ui/src/design-system/components/Button'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Chip } from '~ui/src/design-system/components/Chip'
import { bytesConverter, getOrderStatusPrefix as getStatus } from '~ui/utils'
import { Alert } from '~ui/src/components/Confirm'
import { fieldMessageCss } from '~ui/src/styles/Field'
import { getFormApiFeedback } from '~/utils/formApiFeedback'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Image as ImageWithFallback } from '~ui/src/components/Image'
import { Avatar } from '~ui/src/design-system/components/Avatar'

import { MapMessages } from './MapMessages'

import { Icon } from '~ui/src/design-system/components/Icon'

const filterSpecialStatus = ['prepared_in', 'delivered_in', 'delivery_datetime']
const hideAttributeStatus = ['manual_driver_assignment_author_id']
const FieldError = styled.p`
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`

const MessagesUI = (props) => {
  const {
    order,
    messages,
    handleSend,
    image,
    message,
    sendMessage,
    setImage,
    setMessage,
    business,
    driver,
    messagesToShow,
    readMessages,
    onClose,
    onMessages,
    setCanRead,
    profileMessages,
    // the conversation alone on a page (an order's messages), not beside
    // the inbox's list: no pane edge, and a close button back to the page
    standalone
  } = props

  const theme = useTheme()
  // an order's messages (alone on its page): the conversation fills its
  // pane at every width, the chat takes what is left
  const fillPane = !!standalone
  // the theme can hide the picture's button and the bubble of the order's
  // placement (messages.image_upload, messages.order_console)
  const showImageUpload = themeVisible(theme, 'messages.image_upload')
  const showOrderConsole = themeVisible(theme, 'messages.order_console')
  const businessLogoFallback = businessLogoPlaceholder(theme)
  const [languageState, t] = useLanguage()
  const { handleSubmit, register, errors, setValue } = useForm()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [sendErrors, setSendErrors] = useState({})
  const composerId = useId()
  const commentErrorId = `${composerId}-comment-error`
  const fileErrorId = `${composerId}-file-error`
  const [{ parseDate, parseTime }] = useUtils()
  const buttonRef = useRef(null)
  const [modalImage, setModalImage] = useState({ open: false, src: '' })
  const imageRef = useRef(null)
  const previousStatus = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]
  const chatDisabled = previousStatus.includes(order?.status)

  // in the inbox, the choice of chatting with the store or the driver
  // (visibility.messages.participants, off by default)
  const showBusinessAndDriver = themeVisible(theme, 'messages.participants') ||
    (!!standalone && !!order?.business && !!order?.driver)
  // The quick messages: the theme decides (visibility
  // messages.quick_messages, hidden by default).
  // Only the ones the site translated into the loaded language: never the
  // filler copy ("Lorem ipsum N") of a missing or untranslated key.
  const showQuickMessages = themeVisible(theme, 'messages.quick_messages')
  const quickMessageList = showQuickMessages
    ? [
        { key: 'message_1', text: translatedText(languageState, t('CUSTOMER_MESSAGE_1', NO_TRANSLATION), 'CUSTOMER_MESSAGE_1') },
        { key: 'message_2', text: translatedText(languageState, t('CUSTOMER_MESSAGE_2', NO_TRANSLATION), 'CUSTOMER_MESSAGE_2') },
        { key: 'message_3', text: translatedText(languageState, t('CUSTOMER_MESSAGE_3', NO_TRANSLATION), 'CUSTOMER_MESSAGE_3') },
        { key: 'message_4', text: translatedText(languageState, t('CUSTOMER_MESSAGE_4', NO_TRANSLATION), 'CUSTOMER_MESSAGE_4') }
      ].filter((quickMessage) => quickMessage.text)
    : []

  const handleClickQuickMessage = (index) => {
    if (sendMessage?.loading) return
    setValue('message', `${message} ${index}`)
    setMessage(`${message} ${index}`)
    setSendErrors((current) => ({ ...current, comment: null }))
  }

  const handleModalImage = (src) => {
    setModalImage({ open: true, src })
  }

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setAlertState({
        open: true,
        content: Object.values(errors).map(error => error.message)
      })
    }
  }, [errors])

  useEffect(() => {
    if (sendMessage?.loading) {
      setSendErrors({})
      return
    }
    const outcome = sendMessage?.outcome
    if (!outcome) return
    if (outcome.success) {
      clearInputs()
    } else if (!chatDisabled) {
      const { message: feedback, fields } = getFormApiFeedback(t, outcome.response, {
        form: 'chat',
        fields: image ? ['comment', 'file'] : ['comment']
      })
      setSendErrors(fields)
      if (feedback) setAlertState({ open: true, content: feedback, title: t('SEND_MESSAGE', 'Send message') })
    }
  }, [sendMessage])

  useEffect(() => {
    if (business) setCanRead({ business: true, administrator: true, customer: true, driver: false })
    else if (driver) setCanRead({ business: false, administrator: true, customer: true, driver: true })
  }, [business, driver])

  useEffect(() => {
    const chat = document.getElementById('chat')
    chat.scrollTop = chat.scrollHeight
    readMessages && readMessages()
  }, [messages?.messages?.length])

  const onChangeMessage = (e) => {
    setMessage(e.target.value)
    if (sendErrors.comment) setSendErrors((current) => ({ ...current, comment: null }))
  }

  const removeImage = (e) => {
    setImage(null)
    if (sendErrors.file) setSendErrors((current) => ({ ...current, file: null }))
    if (imageRef.current) imageRef.current.value = '' // the input is not rendered when the theme hides the image upload
  }

  const onChangeImage = e => {
    const files = e.target.files[0]
    if (!files) return
    const type = files.type.split('/')[0]
    if (type !== 'image') {
      e.target.value = ''
      setAlertState({
        open: true,
        content: t('ERROR_ONLY_IMAGES', 'Only images can be accepted')
      })
      return
    }

    if (bytesConverter(files?.size) > 2048) {
      e.target.value = ''
      setAlertState({
        open: true,
        content: t('IMAGE_MESSAGES_MAXIMUM_SIZE', 'Images larger than 2 megabytes cannot be sent')
      })
      return
    }
    buttonRef.current.focus()
    const reader = new window.FileReader()
    reader.onload = () => {
      setSendErrors((current) => ({ ...current, file: null }))
      setImage(reader.result)
    }
    reader.onerror = () => {
      if (imageRef.current) imageRef.current.value = ''
      setAlertState({
        open: true,
        content: t('ERROR_READ_FILE', 'Failed to read file')
      })
    }
    reader.readAsDataURL(files)
  }

  const getLogisticTagStatus = (status) => {
    switch (status) {
      case 0:
        return t('PENDING', 'Pending')
      case 1:
        return t('IN_PROGRESS', 'In Progress')
      case 2:
        return t('IN_QUEUE', 'In Queue')
      case 3:
        return t('EXPIRED', 'Logistic expired')
      case 4:
        return t('RESOLVED', 'Resolved')
      default:
        return status
    }
  }

  const getLevel = (level) => {
    switch (level) {
      case 0:
        return t('ADMIN', 'Admin')
      case 1:
        return t('CITY_MANAGER', 'City Manager')
      case 2:
        return t('BUSINESS', 'Business')
      case 3:
        return t('CUSTOMER', 'Customer')
      case 4:
        return t('DRIVER', 'Driver')
      case 5:
        return t('DRIVER_MANAGER', 'Driver Manager')
    }
  }

  const clearInputs = () => {
    setValue('message', '')
    removeImage()
    setMessage('')
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  return (
    <MessagesContainer
      profileMessages={profileMessages}
      data-doc-section='order-messages'
      data-doc-surface={profileMessages ? 'inbox' : 'order-detail'}
      data-doc-participant={business ? 'business' : driver ? 'driver' : 'none'}
      data-doc-state={chatDisabled ? 'ended' : 'active'}
    >
      <MessagesLayoutWrapper profileMessages={profileMessages} standalone={standalone} $fill={fillPane}>
        {!profileMessages && (
          <>
            <MessagesClose>
              <Button
                type='button'
                shape='icon'
                color='neutral'
                appearance='ghost'
                aria-label={t('CLOSE', 'Close')}
                onClick={onClose}
              >
                <Icon name='closeMd' />
              </Button>
            </MessagesClose>
            <MessagesLeftLayout>
              <MessagesTitle>
                <h3>{t('MESSAGES', 'Messages')}</h3>
              </MessagesTitle>
              <CustomerList>
                {
                  order.business && (
                    <Choice
                      variant='conversation-row'
                      render={<HeaderProfile $conversation />}
                      nativeButton={false}
                      selected={business}
                      onClick={() => onMessages({ business: true, driver: false })}
                    >
                      <Image>
                        <ImageWithFallback
                          src={order.business?.logo || businessLogoFallback}
                          fallback={<Icon name="user" />}
                        />
                      </Image>
                      <HeaderOnline>
                        <p>{order.business?.name}</p>
                        <span>{t('BUSINESS', 'Business')}</span>
                      </HeaderOnline>
                    </Choice>
                  )
                }
                {
                  order?.driver && (
                    <Choice
                      variant='conversation-row'
                      render={<HeaderProfile $conversation />}
                      nativeButton={false}
                      selected={driver}
                      onClick={() => onMessages({ business: false, driver: true })}
                    >
                      {/* components.avatar sm (the name beside it says who it is) */}
                      <Avatar variant='photo' src={order.driver?.photo} size='sm' />
                      <HeaderOnline>
                        <p>{order.driver?.name}</p>
                        <span>{t('DRIVER', 'Driver')}</span>
                      </HeaderOnline>
                    </Choice>
                  )
                }
              </CustomerList>
            </MessagesLeftLayout>
          </>
        )}
        <MessagesRightLayout profileMessages={profileMessages} $fill={fillPane}>
          {!profileMessages
            ? (
            <HeaderProfile>
              {driver
                /* the driver's photo is components.avatar sm */
                ? <Avatar variant='photo' src={order.driver?.photo} size='sm' />
                : (
                <Image>
                  {
                    business && (
                      <ImageWithFallback
                        src={order.business?.logo || businessLogoFallback}
                        fallback={<Icon name="user" />}
                      />
                    )
                  }
                </Image>
                  )}
              {business && (
                <HeaderOnline>
                  <p>{order.business?.name}</p>
                  <span>{t('BUSINESS', 'Business')}</span>
                </HeaderOnline>
              )}
              {driver && (
                <HeaderOnline>
                  <p>{order.driver?.name}</p>
                  <span>{t('DRIVER', 'Driver')}</span>
                </HeaderOnline>
              )}
            </HeaderProfile>
              )
            : (
            <ProfileMessageHeader>
              <OrderData>
                {/* with the driver: their name, the order and its store under it */}
                {driver
                  ? (
                    <>
                      <OrderTitle>{[order?.driver?.name, order?.driver?.lastname].filter(Boolean).join(' ') || t('DRIVER', 'Driver')}</OrderTitle>
                      <p>
                        {t('INVOICE_ORDER_NO', 'Order No.')} {order?.id}{order?.business?.name ? ` · ${order.business.name}` : ''}
                      </p>
                    </>
                    )
                  : (
                    <>
                      <OrderTitle>{order?.business?.name || t('INVOICE_ORDER_NO', 'Order No.')} {order?.id}</OrderTitle>
                      <p>
                        {t('BUSINESS', 'Business')}
                      </p>
                    </>
                    )}
              </OrderData>
              {showBusinessAndDriver && (
                <MessagesTypes>
                  {
                    order.business && (
                      <Choice
                        variant='conversation-row'
                        compact
                        render={<MessageType active={business} />}
                        nativeButton={false}
                        selected={business}
                        aria-label={order.business?.name}
                        onClick={() => onMessages({ business: true, driver: false })}
                      >
                        <Image>
                          <ImageWithFallback
                            src={order.business?.logo || businessLogoFallback}
                            fallback={<Icon name="user" />}
                          />
                        </Image>
                      </Choice>
                    )
                  }
                  {
                    order?.driver && (
                      <Choice
                        variant='conversation-row'
                        compact
                        render={<MessageType active={driver} />}
                        nativeButton={false}
                        selected={driver}
                        aria-label={order.driver?.name}
                        onClick={() => onMessages({ business: false, driver: true })}
                      >
                        {/* components.avatar sm (the button is named by the driver) */}
                        <Avatar variant='photo' src={order.driver?.photo} size='sm' />
                      </Choice>
                    )
                  }
                </MessagesTypes>
              )}
              {standalone && (
                <Button
                  type='button'
                  shape='icon'
                  color='neutral'
                  appearance='ghost'
                  aria-label={t('CLOSE', 'Close')}
                  onClick={onClose}
                >
                  <Icon name='closeMd' />
                </Button>
              )}
            </ProfileMessageHeader>
              )}

          <Chat id='chat' profileMessages={profileMessages} $fill={fillPane}>
            {
              messages?.loading && (
                <>
                  <MessageBusiness>
                    <SkeletonBubbleBusiness>
                      <Skeleton width={200} height={100} />
                    </SkeletonBubbleBusiness>
                  </MessageBusiness>
                  <MessageCustomer>
                    <SkeletonBubbleCustomer>
                      <Skeleton width={250} height={100} />
                    </SkeletonBubbleCustomer>
                  </MessageCustomer>
                  <MessageBusiness>
                    <SkeletonBubbleBusiness>
                      <Skeleton width={150} height={100} />
                    </SkeletonBubbleBusiness>
                  </MessageBusiness>
                  <MessageCustomer>
                    <SkeletonBubbleCustomer>
                      <Skeleton width={200} height={100} />
                    </SkeletonBubbleCustomer>
                  </MessageCustomer>
                </>
              )
            }
            {
              !messages?.loading && order && (
                <MessageContentWrapper>
                  <>
                    <MessageCreatedDate>
                      <span>{parseDate(order.created_at, { outputFormat: 'MMM DD, YYYY' })}</span>
                    </MessageCreatedDate>
                    {showOrderConsole && (
                      <MessageConsole>
                        <BubbleConsole>
                          {t('ORDER_PLACED_FOR', 'Order placed for')} {' '}
                          <strong>{parseDate(order.created_at)}</strong> {' '}
                          {t('VIA', 'Via')}{' '}
                          <strong>
                            {order.app_id ? t(order.app_id.toUpperCase(), order.app_id) : t('OTHER', 'Other')}
                          </strong>{' '}
                          <TimeofSent>{parseTime(order.created_at)}</TimeofSent>
                        </BubbleConsole>
                      </MessageConsole>
                    )}
                  </>
                  <MapMessages
                    messages={messagesToShow?.messages?.length ? messagesToShow : messages}
                    messagesToShow={messagesToShow}
                    order={order}
                    filterSpecialStatus={filterSpecialStatus}
                    hideAttributeStatus={hideAttributeStatus}
                    handleModalImage={handleModalImage}
                    getLevel={getLevel}
                    business={business}
                    driver={driver}
                    getLogisticTagStatus={getLogisticTagStatus}
                    getStatus={getStatus}
                  />
                </MessageContentWrapper>
              )
            }
          </Chat>
          {chatDisabled
            ? (
              <NotSendMessage data-doc-section='messages-ended-notice'>
                <Icon name="closeOctagon" />
                <p>{t('NOT_SEND_MESSAGES', 'You can\'t send messages because the order has ended')}</p>
              </NotSendMessage>
              )
            : (
              <SendForm data-doc-section='messages-composer'>
                {quickMessageList.length > 0 && (
                  <QuickMessageWrapper>
                    {quickMessageList.map((quickMessage) => (
                      <Chip
                        variant='content'
                        key={quickMessage.key}
                        onClick={() => handleClickQuickMessage(quickMessage.text)}
                      >
                        {quickMessage.text}
                      </Chip>
                    ))}
                  </QuickMessageWrapper>
                )}
                <Send onSubmit={handleSubmit(() => handleSend())} noValidate>
                  <InputWrapper>
                    <Input
                      placeholder={t('TYPE_YOUR_MESSAGE_HERE', 'Type your message here')}
                      onChange={onChangeMessage}
                      name='message'
                      id='message'
                      ref={register({
                        required: !image
                      })}
                      autoComplete='off'
                      disabled={sendMessage?.loading}
                      invalid={!!sendErrors.comment}
                      aria-describedby={sendErrors.comment ? commentErrorId : undefined}
                      /* the picture's button (messages.image_upload) is the field's suffix: the piece leaves its room */
                      suffix={showImageUpload
                        ? (
                          <>
                            {!image && (
                              <Button
                                shape='icon'
                                color='neutral'
                                appearance='ghost'
                                size='xs'
                                aria-label={t('ATTACH_IMAGE', 'Attach image')}
                                disabled={sendMessage?.loading}
                                onClick={() => imageRef.current.click()}
                              >
                                <Icon name='cardImage' />
                              </Button>
                            )}
                            {/* the file input stays out of the button and the Tab order; the button opens it */}
                            <Input
                              variant='file-picker'
                              name='image'
                              id='chat_image'
                              accept='image/png,image/jpg,image/jpeg'
                              onChange={onChangeImage}
                              ref={imageRef}
                            />
                          </>
                          )
                        : undefined}
                    />
                    {sendErrors.comment && <FieldError id={commentErrorId} role='alert'>{sendErrors.comment}</FieldError>}
                    {image && (
                      <WrapperDeleteImage>
                        <div>
                          {/* the picture first: the button, later in the box, paints over it */}
                          <img
                            src={image}
                            loading='lazy'
                          />
                          <Button
                            onClick={removeImage}
                            type='reset'
                            shape='icon'
                            color='neutral'
                            appearance='ghost'
                            aria-label={t('REMOVE_IMAGE', 'Remove image')}
                            disabled={sendMessage?.loading}
                            aria-describedby={sendErrors.file ? fileErrorId : undefined}
                          >
                            <Icon name='closeMd' />
                          </Button>
                        </div>
                      </WrapperDeleteImage>
                    )}
                    {image && sendErrors.file && <FieldError id={fileErrorId} role='alert'>{sendErrors.file}</FieldError>}
                  </InputWrapper>
                  <WrapperSendMessageButton>
                    <Button
                      /* the composer's send piece (chat_bubble.slots.send) */
                      {...slotButtonOptions(theme, 'chat_bubble', 'send', { color: 'primary' })}
                      aria-label={t('SEND_MESSAGE', 'Send message')}
                      type='submit'
                      cta={false}
                      disabled={sendMessage?.loading || (message === '' && !image) || messages?.loading}
                      ref={buttonRef}
                    >
                      {/* the send arrow turns in a right-to-left language */}
                      <Icon name='sendFilled' style={theme?.rtl ? { transform: 'rotate(270deg)' } : undefined} />
                    </Button>
                  </WrapperSendMessageButton>
                </Send>
              </SendForm>
              )}
        </MessagesRightLayout>
      </MessagesLayoutWrapper>
      <Alert
        title={alertState.title || t('ERROR', 'Error')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
      {modalImage.open && (
        // the picture is the whole card (flush): its own inverse close over it
        <DialogOverlay
          onClose={() => setModalImage({ ...modalImage, open: false })}
          open={modalImage.open}
          flush
          showCloseButton={false}
          phone='center'
          aria-label={t('CHAT_IMAGE', 'Image sent in the chat')}
        >
          <ImageContainer>
            <ModalIcon>
              <Button
                type='button'
                shape='icon'
                color='inverse'
                size='sm'
                aria-label={t('CLOSE', 'Close')}
                onClick={() => setModalImage({ ...modalImage, open: false })}
              >
                <Icon name='closeMd' />
              </Button>
            </ModalIcon>
            <img src={modalImage.src} alt={t('CHAT_IMAGE', 'Image sent in the chat')} loading='lazy' />
          </ImageContainer>
        </DialogOverlay>
      )}
    </MessagesContainer>
  )
}

export const Messages = (props) => {
  const MessagesProps = {
    ...props,
    includeResponse: true,
    UIComponent: MessagesUI
  }
  return <MessagesController {...MessagesProps} />
}
