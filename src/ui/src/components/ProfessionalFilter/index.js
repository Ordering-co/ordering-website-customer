import React, { useState } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import {
  Container,
  ProfessionalItem,
  ContentWrapper,
  ProfessionalListing
} from './styles'

import { Choice } from '~ui/src/design-system/components/Choice'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { ProfessionalProfile } from '~ui/src/components/ProfessionalProfile'
import { ProfessionalInfo } from '~ui/src/components/ProfessionalInfo'
import { SingleProfessionalCard } from '~ui/src/components/SingleProfessionalCard'

export const ProfessionalFilter = (props) => {
  const {
    professionals,
    professionalSelected,
    handleChangeProfessionalSelected,
    handleUpdateProfessionals,
    openAlertErrorStatus,
    cart,
    businessTimezone
  } = props

  const [, t] = useLanguage()
  const [open, setOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [currentProfessional, setCurrentProfessional] = useState(null)

  const handleOpenProfile = (e, professional) => {
    if (e.target.closest('.info') || e.target.closest('.favorite')) return
    if (cart?.status === 2) {
      openAlertErrorStatus?.()
      return
    }
    setCurrentProfessional(professional)
    setOpen(true)
  }

  const handleCloseProfile = () => {
    setCurrentProfessional(null)
    setOpen(false)
    setReviewOpen(false)
  }

  const onUpdateProfessionals = (id, changes) => {
    const updatedProfessional = professionals.find(professional => professional.id === id)
    handleUpdateProfessionals({ ...updatedProfessional, ...changes })
  }

  return (
    <>
      <Container data-doc-section='appointment-professionals'>
        <h2>{t('PROFESSIONALS', 'Professionals')}</h2>
        <ContentWrapper>
          <ProfessionalListing>
            <AutoScroll scrollId='professionalId'>
              <Choice
                variant='card-actions'
                action
                render={<ProfessionalItem as='button' />}
                selected={!professionalSelected}
                onClick={() => handleChangeProfessionalSelected(null)}
              >
                <span title={t('ANY_PROFESSIONAL_MEMBER', 'Any professional member')}>{t('ANY_PROFESSIONAL_MEMBER', 'Any professional member')}</span>
              </Choice>
              {professionals.map(professional => (
                <SingleProfessionalCard
                  isSmallPhoto
                  handleProfessionalClick={handleOpenProfile}
                  active={professional?.id === professionalSelected?.id}
                  key={professional.id}
                  professional={professional}
                  handleUpdateProfessionals={onUpdateProfessionals}
                />
              ))}
            </AutoScroll>
          </ProfessionalListing>
        </ContentWrapper>
      </Container>
      {open && (
        <DialogOverlay
          data-doc-section='professional-profile-dialog'
          open={open}
          size='xl'
          flush
          onClose={() => handleCloseProfile()}
        >
          <ProfessionalProfile
            currentProfessional={currentProfessional}
            businessTimezone={businessTimezone}
            onClose={handleCloseProfile}
            handleChangeProfessionalSelected={handleChangeProfessionalSelected}
          />
        </DialogOverlay>
      )}
      {reviewOpen && (
        <DialogOverlay
          open={reviewOpen}
          size='xl'
          flush
          onClose={() => handleCloseProfile()}
        >
          <ProfessionalInfo
            userId={currentProfessional?.id}
          />
        </DialogOverlay>
      )}
    </>
  )
}
