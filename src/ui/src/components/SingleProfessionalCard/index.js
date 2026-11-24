import React, { useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  Container,
  InfoWrapper,
  ActionWrapper,
  CardAction
} from './styles'

import { useSession } from '~components/contexts/SessionContext'
import { SingleProfessionalCard as SingleProfessionalCardController } from '~components/components/SingleProfessionalCard'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { ProfessionalInfo } from '~ui/src/components/ProfessionalInfo'

import { Icon } from '~ui/src/design-system/components/Icon'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { CardLink } from '~ui/src/styles/Card'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Button } from '~ui/src/design-system/components/Button'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { getThemeCss } from '~/utils/themeCss'

const SingleProfessionalCardUI = (props) => {
  const {
    professional,
    isSkeleton,
    handleFavoriteProfessional,
    isSmallPhoto,
    active,
    handleProfessionalClick
  } = props

  const [{ auth }] = useSession()
  const [, t] = useLanguage()
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  // the info and the favorite are buttons; a card that picks
  // its professional is a box whose name is the button that does it (a
  // stretched link), so they work apart
  const stretched = !!handleProfessionalClick && !isSkeleton
  const Card = handleProfessionalClick ? Choice : Container
  const choiceProps = handleProfessionalClick
    ? { variant: 'card-actions', selected: active, as: Container, $choice: true }
    : {}
  // the photo is an avatar of the theme (components.avatar),
  // md in a list to pick from, lg otherwise; its skeleton of that size
  const avatarSize = isSmallPhoto ? 'md' : 'lg'
  const skeletonSize = getThemeCss(theme, 'avatar').sizes[avatarSize].size

  const handleChangeFavorite = () => {
    if (auth) {
      handleFavoriteProfessional && handleFavoriteProfessional(!professional?.favorite)
    }
  }

  const handleOpenProfileInfo = () => {
    setOpen(true)
  }

  return (
    <>
      <Card
        {...choiceProps}
        data-doc-section='favorite-professional-card'
        data-doc-professional-id={professional?.id}
        $stretched={stretched}
        onClick={stretched ? undefined : e => handleProfessionalClick && handleProfessionalClick(e, professional)}
      >
        {isSkeleton
          ? (
          <Skeleton style={{ width: skeletonSize, height: skeletonSize }} />
            )
          : <Avatar src={professional?.photo} size={avatarSize} />}
        <InfoWrapper>
          <div className='name' title={[professional?.name, professional?.last_name].filter(Boolean).join(' ')}>
            {isSkeleton
              ? <Skeleton height={18} width={120} />
              : stretched
                ? (
                  <CardLink
                    as='button'
                    $card='card'
                    {...(typeof active === 'boolean' && { 'aria-pressed': active })}
                    onClick={e => handleProfessionalClick(e, professional)}
                  >
                    {professional?.name} {professional?.last_name}
                  </CardLink>
                  )
                : <>{professional?.name} {professional?.last_name}</>}
          </div>
          {isSkeleton ? <Skeleton height={15} width={80} /> : <>{professional?.occupation?.name && <p>{professional?.occupation?.name}</p>}</>}
          <ActionWrapper isSmallPhoto={isSmallPhoto}>
            {isSkeleton
              ? (
              <>
                <Skeleton width={16} height={16} />
                <Skeleton width={16} height={16} style={{ margin: '0px 7px' }} />
              </>
                )
              : (
                  <>
                    <CardAction>
                      <Button className='info' color='neutral' appearance='ghost' size='xs' shape='icon' aria-label={t('INFORMATION', 'Information')} onClick={handleOpenProfileInfo}>
                        <Icon name='infoCircle' aria-hidden='true' />
                      </Button>
                    </CardAction>
                    <CardAction>
                      <Button
                        favorite
                        bleed
                        className='favorite'
                        aria-pressed={!!professional?.favorite}
                        aria-label={t('FAVORITE', 'Favorite')}
                        onClick={handleChangeFavorite}
                      >
                        <Icon name={professional?.favorite ? 'heartFilled' : 'heartOutline'} aria-hidden='true' />
                      </Button>
                    </CardAction>
                  </>
                )}
          </ActionWrapper>
        </InfoWrapper>
      </Card>
      {open && (
        <DialogOverlay
          open={open}
          size='xl'
          flush
          onClose={() => setOpen(false)}
        >
          <ProfessionalInfo
            userId={professional?.id}
          />
        </DialogOverlay>
      )}
    </>
  )
}

export const SingleProfessionalCard = (props) => {
  const singleProfessionalCardProps = {
    ...props,
    UIComponent: SingleProfessionalCardUI
  }
  return <SingleProfessionalCardController {...singleProfessionalCardProps} />
}
