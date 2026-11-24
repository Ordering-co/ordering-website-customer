import React from 'react'
import {
  Container,
  PhotoWrapper,
  NameWrapper,
  Divider,
  ScheduleWrapper,
  ButtonWrapper,
  BookAction
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { Button } from '~ui/src/design-system/components/Button'
import { BusinessPreorder } from '~ui/src/components/BusinessPreorder'

import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { professionalTimezone } from '~/utils/businessTime'

export const ProfessionalProfile = (props) => {
  const {
    currentProfessional,
    handleChangeProfessionalSelected,
    onClose,
    businessTimezone
  } = props

  const [, t] = useLanguage()
  const [{ optimizeImage }] = useUtils()

  const handleSelectProfessional = () => {
    handleChangeProfessionalSelected(currentProfessional)
    onClose && onClose()
  }

  return (
    <Container data-doc-section='professional-profile'>
      <PhotoWrapper>
        {/* the professional's avatar (components.avatar, xl) */}
        <Avatar src={currentProfessional?.photo ? optimizeImage(currentProfessional.photo, 'h_200,c_limit') : null} size='xl' />
      </PhotoWrapper>
      <NameWrapper>
        <ModalHeading>{`${currentProfessional?.name ?? ''} ${currentProfessional?.lastname ?? ''}`.trim()}</ModalHeading>
      </NameWrapper>
      <Divider />
      <ScheduleWrapper>
        <h3>{t('SCHEDULE', 'Schedule')}</h3>
        {currentProfessional?.schedule
          ? (
          <BusinessPreorder
            // the schedule is in the professional's zone, else the business's
            business={{ ...currentProfessional, timezone: professionalTimezone(currentProfessional, businessTimezone) }}
            isProfessional
            isDisabled
            maxDays={40}
            useOrderContext={false}
          />
            )
          : (
          <p>{t('NO_SCHEDULE', 'No schedule')}</p>
            )}
      </ScheduleWrapper>
      <ButtonWrapper>
        <BookAction>
          <Button
            data-doc-control='professional-profile-book'
            onClick={() => handleSelectProfessional()}
            size='md'
            fullWidth
          >
            {t('BOOK', 'Book')}
          </Button>
        </BookAction>
      </ButtonWrapper>
    </Container>
  )
}
