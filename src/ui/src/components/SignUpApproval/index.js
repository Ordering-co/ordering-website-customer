import React from 'react'
import { useTheme } from 'styled-components'

import {
  Container,
  HeaderSection,
  Title,
  LogoImage,
  BodySection,
  DescriptionContainer,
  Description,
  ProjectInfo,
  FooterSection,
  ActionGroup,
  ContactSection
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { themeImage } from '~/utils/themeTokens'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'

export const SignUpApproval = (props) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const { content: { project, dashboardUrl, dashboardLoginUrl, approvalType, businessType, contactEmail }, onAccept } = props
  // the state of the request is the content's heading, the
  // level under the modal's title (Congratulations)
  const statusTitle = (text) => <Title as={modalSectionLevel(theme)}>{text}</Title>

  const userType = businessType === 2 ? 'business' : 'driver'
  // the theme's image of this sign-up and approval
  // (images.signup.<business|driver>_<approved|pending>, the bundle's without one)
  const logoImgUrl = themeImage(theme, `signup.${userType}_${approvalType === 'automatic' ? 'approved' : 'pending'}`)

  return (
    <Container>
      <HeaderSection>
        <LogoImage
          src={logoImgUrl}
          alt={t('CONGRATULATIONS', 'Congratulations')}
        />
      </HeaderSection>
      {approvalType === 'automatic'
        ? (
        <BodySection>
          {userType === 'business'
            ? (
            <DescriptionContainer>
              <Description>{t('GET_IN_OUR_DASHBOARD_USING_OWNER_ACCOUNT', 'Get in our Dashboard using the business owner account you just created.')}</Description>
              <Description><span className='bigger'>{t('VERY_IMPORTANT', 'Very important')}</span> {t('USE_PROJECT_TO', 'use the project')} (<span className='italic'>{project}</span>) {t('TO_SETUP_YOUR_STORE', ', to get inside and set up your store.')}</Description>
            </DescriptionContainer>
              )
            : (
            <DescriptionContainer>
              <Description>{t('GET_IN_OUR_DASHBOARD_USING_DRIVER_OWNER_ACCOUNT', 'Get in our Dashboard using the driver owner account you just created.')}</Description>
              <Description><span className='bigger'>{t('VERY_IMPORTANT', 'Very important')}</span> {t('USE_PROJECT_TO', 'use the project')} (<span className='italic'>{project}</span>) {t('TO_GET_DRIVER_APP', ', to get inside the driver app')}</Description>
            </DescriptionContainer>
              )}
          <ProjectInfo>
            <dt>{t('PROJECT', 'Project')}:</dt>
            <dd>({project})</dd>
            <dt>{t('DASHBOARD_WEBPAGE', 'Dashboard webpage')}:</dt>
            <dd><a href={t('SIGNUP_DASHBOARD_LOGIN_URL', dashboardLoginUrl)} target='_blank' rel='noopener noreferrer'>{t('SIGNUP_DASHBOARD_URL', dashboardUrl)}</a></dd>
          </ProjectInfo>
        </BodySection>
          )
        : (
        <BodySection>
          {userType === 'business'
            ? (
            <DescriptionContainer>
              {statusTitle(t('YOUR_STORE_UNDER_APPROVAL', 'Your store is under approval'))}
              <Description>{t('BUSINESS_SIGNUP_MESSAGE', 'We will contact you as soon as possible')}</Description>
              <Description>{t('FEEL_FREE_CONTACT_US', 'feel free to contact us at ')} <a href={`mailto:${t('SIGNUP_DRIVER_EMAIL', contactEmail)}`}>{t('SIGNUP_DRIVER_EMAIL', contactEmail)}</a></Description>
            </DescriptionContainer>
              )
            : (
            <DescriptionContainer>
              {statusTitle(t('REQUEST_TO_START_UNDER_APPROVAL', 'Your request to start as a driver is under approval.'))}
              <Description>{t('BUSINESS_SIGNUP_MESSAGE', 'We will contact you as soon as possible')}</Description>
              <Description>{t('FEEL_FREE_CONTACT_US', 'feel free to contact us at ')} <a href={`mailto:${t('SIGNUP_DRIVER_EMAIL', contactEmail)}`}>{t('SIGNUP_DRIVER_EMAIL', contactEmail)}</a></Description>
            </DescriptionContainer>
              )}
        </BodySection>
          )}
      <FooterSection>
        {/* one action: closing the modal (its close does the same) */}
        <ActionGroup>
          <Button
            type='button'
            cta
            onClick={() => onAccept && onAccept()}
          >
            {t('ACCEPT', 'Accept')}
          </Button>
        </ActionGroup>
        {(approvalType === 'automatic' && userType === 'business') && (
          <ContactSection>{t('CONTACT_US_QUESTIONS', 'If you have some questions do not hesitate to contact us at ')} <a href={`mailto:${t('SIGNUP_DRIVER_EMAIL', contactEmail)}`}>{t('SIGNUP_DRIVER_EMAIL', contactEmail)}</a></ContactSection>
        )}
      </FooterSection>
    </Container>
  )
}

export default SignUpApproval
