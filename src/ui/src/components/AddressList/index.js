import React, { useState, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  AddressListContainer,
  AddressListUl,
  WrappNotAddresses,
  ContinueButton,
  SearchAddressAction,
  AddAddressAction,
  AddressTitle,
  AddressHalfContainer,
  List,
  AddressFormContainer,
  TitleFormContainer,
  AddressSubTitle
} from './styles'

import { AddressList as AddressListController } from '~components/components/AddressList'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useEvent } from '~components/contexts/EventContext'
import { themeVisible } from '~/utils/themeVisibility'

import { Button } from '~ui/src/design-system/components/Button'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Confirm } from '~ui/src/components/Confirm'
import { scrollTo, capitalize } from '~ui/utils'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { AddressForm } from '~ui/src/components/AddressForm'
import { SavedAddressChoices } from '~ui/src/components/SavedAddressItem'
import { ADDRESS_ITEM_GAP } from '~ui/src/components/SavedAddressItem/styles'
import { addressTagName } from '~ui/src/components/SavedAddressItem/tags'
import { themeControlHeight, themeImage } from '~/utils/themeTokens'

import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { scrollMs } from '~/utils/themeMotion'

// a stable object: the form restarts when its `address` changes
const NEW_ADDRESS = {}

const AddressListUI = (props) => {
  const {
    actionStatus,
    addressList,
    handleDelete,
    setAddressList,
    handleSetDefault,
    isModal,
    isPopover,
    isProductForm,
    userId,
    userCustomerSetup,
    isEnableContinueButton,
    setCustomerModalOpen,
    isCustomerMode,
    isFromCheckout,
    setIsAddressFormOpen,
    isProfile,
    onCancel,
    isOpenUserData,
    setExtraModalWidth,
    title,
    titleAs = 'h2'
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [events] = useEvent()
  const [curAddress, setCurAddress] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  const theme = useTheme()
  const [{ user }] = useCustomer()
  const { width } = useWindowSize()
  const isCompletedLayout = width < 769 || isProfile
  // The form opens in a modal of its own over the list (its close goes back
  // to the list), on every screen. Not in a popover, which shows it inline.
  const isFormModal = !isPopover
  // the list stays under the form's modal
  const keepsListUnderForm = isProfile || isFormModal
  // the list's title is `titleAs` (h1 when it is the page's title), its
  // section (saved addresses) the next level
  const sectionLevel = `h${Math.min(Number(titleAs.slice(1)) + 1, 6)}`
  // the id of the saved places' section title, the name of its single choice
  // list
  const choicesTitleId = useId()
  const uniqueAddressesList = (addressList.addresses && addressList.addresses.filter(
    (address, i, self) => address.address &&
      i === self.findIndex(obj => (
        address.address === obj.address &&
        address.address_notes === obj.address_notes &&
        address.zipcode === obj.zipcode &&
        address.internal_number === obj.internal_number
      )))) || []

  // an empty list of the picker (not the profile, which has its own button, nor customer mode, which opens the form)
  // (and only with the order's options loaded: otherwise the network error is what shows)
  const canAddHere = !isProfile && !isCustomerMode && typeof orderState.options?.address === 'object'

  // address.icons hides the form's tag selector; the list then shows no tag
  // either (icon nor name: every address would read "Other")
  const hideTags = !themeVisible(theme, 'address.icons')
  // the internal number and the zipcode under each saved address
  // (visibility.address.list_details, off by default)
  const showListDetails = themeVisible(theme, 'address.list_details')
  const showZipcode = showListDetails
  const showInternalNumber = showListDetails
  // the buttons that add an address (visibility.address.add_button)
  const showAddButton = themeVisible(theme, 'address.add_button')
  // the empty address list's image: images.empty.address_list
  const notFoundImage = themeImage(theme, 'empty.address_list')

  // The actions of an item: edit it, delete it (not the default address)
  const editAction = (address) => ({
    control: 'address-edit',
    icon: 'pencil',
    label: t('EDIT_ADDRESS_TITLE', 'Edit address'),
    disabled: actionStatus.loading,
    onClick: () => openAddress(address)
  })
  const deleteAction = (address) => ({
    control: 'address-delete',
    icon: 'trashFilled',
    label: t('REMOVE', 'Remove'),
    disabled: actionStatus.loading || address.default,
    danger: true,
    onClick: () => handleDeleteClick(address)
  })

  // The details of an address under its tag (internal number,
  // zipcode), when the list shows them
  const addressDetails = (address) => [
    showInternalNumber && address.internal_number,
    showZipcode && address.zipcode
  ].filter(Boolean).join(' ')

  /**
   * An address as an option of the list's single choice (the
   * picker and the profile alike). In the picker the order's address is the
   * selected one and every option picks its address. In the profile the
   * default address ("Current location", first) is the selected one: it only
   * edits (it cannot be deleted) and picking it does nothing; any other
   * option makes its address the default. Its actions are out
   * of the radiogroup (`address-item-actions`, on the item's row).
   */
  const addressChoice = (address) => {
    const isCurrent = isProfile && !!address?.default
    const isDefault = isCurrent ? 'true' : 'false'
    const tag = addressTagName(address?.tag)
    return {
      key: address?.id,
      itemProps: { 'data-doc-control': 'address-item', 'data-doc-default': isDefault },
      actionsProps: { 'data-doc-control': 'address-item-actions', 'data-doc-default': isDefault },
      address,
      label: isCurrent
        ? t('CURRENT_LOCATION', 'Current location')
        : hideTags
          ? undefined
          : tag === 'home'
            ? t('ADDRESS_HOME', 'Home')
            : t(tag?.toUpperCase() ?? 'OTHER', capitalize(tag || 'Other')),
      details: addressDetails(address),
      selected: isChoiceSelected(address),
      onSelect: isCurrent ? undefined : () => handleSetAddress(address),
      actions: isCurrent ? [editAction(address)] : [editAction(address), deleteAction(address)]
    }
  }

  const openAddress = (address) => {
    setCurAddress(address)
    setAddressOpen(true)
    setIsAddressFormOpen && setIsAddressFormOpen(true)
    const container = window.document.getElementsByClassName('form_edit')[0]
    container && scrollTo(container, 0, scrollMs(theme))
  }

  const closeAddressForm = () => {
    setAddressOpen(false)
    setIsAddressFormOpen && setIsAddressFormOpen(false)
  }

  const handleSaveAddress = (address) => {
    let found = false
    const addresses = addressList.addresses.map(_address => {
      if (_address?.id === address?.id) {
        Object.assign(_address, address)
        found = true
      } else if (address.default) {
        _address.default = false
      }
      return _address
    })
    if (!found) {
      addresses.push(address)
    }
    setAddressList({
      ...addressList,
      addresses
    })
    if (userCustomerSetup) {
      handleSetAddress(address)
      return
    }
    closeAddressForm()
    onCancel && onCancel()
  }

  const handleSetAddress = async (address) => {
    if (
      checkAddress(address) &&
      isCustomerMode &&
      userCustomerSetup?.id === user?.id &&
      !isFromCheckout
    ) {
      events.emit('go_to_page', { page: 'search' })
      handleSetDefault(address, userCustomerSetup, true)
      setCustomerModalOpen && setCustomerModalOpen(false)
      return
    }

    closeAddressForm()
    await handleSetDefault(address, userCustomerSetup)
    onCancel && onCancel()
  }

  const handleDeleteClick = (address) => {
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_ADDRESS', 'Are you sure that you want to delete the address?'),
      handleOnAccept: () => {
        handleDelete(address)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  const checkAddress = (address) => {
    const props = ['address', 'address_notes', 'zipcode', 'location', 'internal_number']
    const values = []
    if (userCustomerSetup) {
      return address.default
    }
    props.forEach(prop => {
      if (address?.[prop]) {
        if (prop === 'location') {
          values.push(address?.[prop].lat === orderState?.options?.address?.[prop]?.lat &&
            address?.[prop].lng === orderState?.options?.address?.[prop]?.lng)
        } else {
          values.push(address?.[prop] === orderState?.options?.address?.[prop])
        }
      } else {
        // an empty field is the same however the API sends it: null, '' or left out
        values.push(!orderState?.options?.address?.[prop])
      }
    })
    return values.every(value => value)
  }

  // The selected option of the list. The picker: the order's
  // address (`checkAddress`: same fields, or the default one for a customer
  // being set up). The profile: the default address.
  const isChoiceSelected = (address) => isProfile ? !!address?.default : checkAddress(address)

  // The options, the selected one first and the rest in the
  // controller's order (a copy: the controller's list is not touched). An
  // order address that is none of the saved ones leaves the order as is.
  const choiceAddresses = [
    ...uniqueAddressesList.filter(address => isChoiceSelected(address)),
    ...uniqueAddressesList.filter(address => !isChoiceSelected(address))
  ]

  /**
   * Close modals and alerts
   */
  useEffect(() => {
    return () => {
      setConfirm({ ...confirm, open: false })
    }
  }, [])

  useEffect(() => {
    if (addressList?.addresses?.length === 0 && !addressList.loading && isCustomerMode) {
      openAddress({})
    }
  }, [addressList.loading, addressList?.addresses?.length])

  useEffect(() => {
    setExtraModalWidth && setExtraModalWidth(addressOpen)
  }, [addressOpen])

  useEffect(() => {
    if (orderState.loading || addressList.loading) return
    const defaultAddress = uniqueAddressesList.filter(address => address.default)
    const addressId = orderState?.options?.address_id
    const addressOrderOptions = uniqueAddressesList.find(address => address.id === addressId)
    if (isProfile && defaultAddress.length === 0 && addressOrderOptions) {
      handleSetDefault(addressOrderOptions, userCustomerSetup)
    }
  }, [addressList.loading, isProfile, orderState.loading])

  // these are render helpers (called as functions below), NOT components
  // rendered as JSX. Defining a component inside the render body creates a new
  // component type on every re-render, which unmounts/remounts the whole subtree
  // — wiping the open <AddressForm> mid-typing. Calling them inline keeps the
  // element tree stable so form state survives parent re-renders.
  const renderCallcenterLayout = (content) => {
    return (
      <AddressHalfContainer>
        {(!addressOpen || keepsListUnderForm) && (
          <List halfWidth={addressOpen && !isFormModal} id='address_list'>
            {content}
          </List>
        )}
        {addressOpen && !isFormModal && (
          <AddressFormContainer isCustomerMode={isCustomerMode} isOpenUserData={isOpenUserData} addressOpen>
            <TitleFormContainer>
              <ModalHeading>{curAddress?.id ? title ? t('EDIT_DELIVERY_ADDRESS', 'Edit delivery address') : t('EDIT_ADDRESS_TITLE', 'Edit address') : t('ADD_ADDRESS_TITLE', 'Add address')}</ModalHeading>
            </TitleFormContainer>
            <AddressForm
              userId={userId}
              addressesList={addressList?.addresses}
              useValidationFileds
              address={curAddress}
              onCancel={() => closeAddressForm()}
              onSaveAddress={handleSaveAddress}
              userCustomerSetup={userCustomerSetup}
            />
          </AddressFormContainer>
        )}
      </AddressHalfContainer>
    )
  }

  const renderAddressListContent = () => {
    return (
      <>
        {
          isPopover && addressOpen && (
            <AddressForm
              userId={userId}
              addressesList={addressList?.addresses}
              useValidationFileds
              address={curAddress}
              onCancel={() => closeAddressForm()}
              onSaveAddress={handleSaveAddress}
              userCustomerSetup={userCustomerSetup}
            />
          )
        }

        {
          (!addressOpen || keepsListUnderForm) &&
          !addressList.loading &&
          !actionStatus.loading &&
          !orderState.loading &&
          !addressList.error &&
          addressList?.addresses?.length > 0 &&
          typeof orderState.options?.address === 'object' &&
          ((!addressOpen && isPopover) || isModal) && (
            // a box of the title, buttons and the list of choices (not a
            // list itself)
            <AddressListUl id='list' as='div'>
              <ModalHeading as={AddressTitle} $level={titleAs} isProfile={isProfile}>{title || t('SAVED_ADDRESSES', 'Saved addresses')}</ModalHeading>
              {isProfile && (
                <>
                  {showAddButton && (
                  // the class: what UserProfileForm's saved places spacing reads (another unit)
                  <SearchAddressAction className='search-address-button'>
                    <Button
                      data-doc-control='address-add'
                      color='primary'
                      size='md'
                      onClick={() => openAddress({})}
                      loading={!!(orderState?.loading || actionStatus.loading)}
                    >
                      {t('SEARCH_FOR_AN_ADDRESS', 'Search for an address')}
                    </Button>
                  </SearchAddressAction>
                  )}
                  {/* one section, "Saved addresses", over the list of choices */}
                  {uniqueAddressesList.length > 0 && (
                    <AddressSubTitle id={choicesTitleId} $level={sectionLevel}>{t('SAVED_ADDRESSES', 'Saved addresses')}</AddressSubTitle>
                  )}
                </>
              )}
              {/* one single choice list of the addresses */}
              <SavedAddressChoices
                {...(isProfile
                  ? { 'aria-labelledby': choicesTitleId }
                  : { 'aria-label': title || t('SAVED_ADDRESSES', 'Saved addresses') })}
                options={choiceAddresses.map(addressChoice)}
              />
              {isEnableContinueButton && uniqueAddressesList.map(address => address.default && (
                <ContinueButton key={address.id}>
                  <Button color='primary' size='md' fullWidth onClick={() => handleSetAddress(address)}>
                    {/* one string: the piece cuts a long label with … and spaces its parts */}
                    {`${t('CONTINUE_WITH', 'Continue with')}: ${address.address}`}
                  </Button>
                </ContinueButton>
              ))}
              {!isProfile && showAddButton && (
                <div className='add-address-button'>
                  <AddAddressAction $minWidth>
                    <Button
                      appearance='outline'
                      size='lg'
                      color={isEnableContinueButton && addressList?.addresses?.length > 0 ? 'secondary' : 'primary'}
                      fullWidth
                      onClick={() => openAddress({})}
                      loading={!!(orderState?.loading || actionStatus.loading)}
                    >
                      {t('ADD_NEW_ADDRESS', 'Add New Address')}
                    </Button>
                  </AddAddressAction>
                </div>
              )}
            </AddressListUl>
          )
        }

        {!(addressList.loading || actionStatus.loading || orderState.loading) &&
          !addressList.error &&
          addressList?.addresses?.length === 0 &&
          (
            isProductForm
              ? showAddButton && (
                <div className='add-address-button'>
                  <AddAddressAction $minWidth={!isProfile} className='product-address-action'>
                    <Button
                      color='primary'
                      size='lg'
                      fullWidth
                      onClick={() => openAddress({})}
                      loading={!!(orderState?.loading || actionStatus.loading)}
                    >
                      {t('ADD_NEW_ADDRESS', 'Add New Address')}
                    </Button>
                  </AddAddressAction>
                </div>
              )
              : canAddHere
                ? (
                  // no saved address: the form to add the first one, in the opener's own modal (not a dead end,
                  // nor a second modal); it saves it as the order's address and closes the opener
                  <>
                    <ModalHeading as={AddressTitle} $level={titleAs}>{t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')}</ModalHeading>
                    <AddressForm
                      userId={userId}
                      addressesList={addressList?.addresses}
                      useValidationFileds
                      address={NEW_ADDRESS}
                      onSaveAddress={handleSaveAddress}
                      onCancel={() => onCancel && onCancel()}
                      userCustomerSetup={userCustomerSetup}
                    />
                  </>
                  )
                : (
                <WrappNotAddresses isCustomerMode={isCustomerMode}>
                  {!isCustomerMode && (
                    <NotFoundSource
                      headingLevel={sectionLevel}
                      variant='empty'
                      icon='geoAlt'
                      image={notFoundImage}
                      content={t('NOT_FOUND_ADDRESS', 'Sorry, You don\'t seem to have any addresses.')}
                    >
                      {isProfile && showAddButton && (
                        <Button data-doc-control='address-add' onClick={() => openAddress({})}>
                          {t('ADD_ADDRESS_TITLE', 'Add address')}
                        </Button>
                      )}
                    </NotFoundSource>
                  )}
                </WrappNotAddresses>
                  )
          )}

        {!(addressList.loading || actionStatus.loading || orderState.loading) && addressList.error && (
          addressList.error.length > 0 && (
            <NotFoundSource
              headingLevel={sectionLevel}
              icon='geoAlt'
              image={notFoundImage}
              content={addressList.error[0]?.message || addressList.error[0]}
            />
          )
        )}

        {!(addressList.loading || actionStatus.loading || orderState.loading) && (typeof orderState.options?.address !== 'object') && !addressList.error && (
          <NotFoundSource
            headingLevel={sectionLevel}
            icon='signpost'
            content={t('NETWORK_ERROR', 'Network error, please reload the page')}
          />
        )}

        {(addressList.loading || actionStatus.loading || orderState.loading) && !isProductForm && (
          <AddressListUl>
            {/* the size of a saved address (a choice) and the space between two */}
            <Skeleton
              height={themeControlHeight(theme, 'choice')}
              count={3}
              style={{ marginBottom: `${ADDRESS_ITEM_GAP}px` }}
            />
          </AddressListUl>
        )}
      </>
    )
  }

  return (
    <AddressListContainer
      id='address_control'
      data-doc-section='address-list'
      data-doc-state={addressList.loading || actionStatus.loading || orderState.loading
        ? 'loading'
        : addressList.error
          ? 'error'
          : addressList.addresses.length === 0
            ? 'empty'
            : 'ready'}
      isLoading={actionStatus?.loading || orderState?.loading}
      isCompletedLayout={isCompletedLayout}
    >
      {!isCompletedLayout
        ? renderCallcenterLayout(renderAddressListContent())
        : renderAddressListContent()}
      {
        addressOpen && isFormModal && (
          <DialogOverlay
            title={t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')}
            open={addressOpen && isFormModal}
            onClose={() => closeAddressForm()}
          >
            <AddressForm
              userId={userId}
              addressesList={addressList?.addresses}
              useValidationFileds
              address={curAddress}
              onSaveAddress={handleSaveAddress}
              userCustomerSetup={userCustomerSetup}
              onCancel={() => closeAddressForm()}
            />
          </DialogOverlay>
        )
      }
      <Confirm
        data-doc-section='address-delete-confirmation'
        title={t('DELETE_ADDRESS', 'Delete address')}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onCancel={() => setConfirm({ ...confirm, open: false })}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />
    </AddressListContainer>
  )
}

export const AddressList = React.memo((props) => {
  const addressListProps = {
    ...props,
    UIComponent: AddressListUI
  }

  return <AddressListController {...addressListProps} />
})
