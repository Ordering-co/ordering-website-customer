import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  SessionsListContainer,
  Title,
  SessionItem,
  DurationWrapper,
  CurrentBadge,
  SessionsWrapper,
  ButtonsGroup
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSession } from '~components/contexts/SessionContext'
import { useSite } from '~components/contexts/SiteContext'
import { getSiteName } from '~/utils/siteBranding'
import { Sessions as SessionsController } from '~components/components/Sessions'
import { Button } from '~ui/src/design-system/components/Button'
import { Alert, Confirm } from '~ui/src/components/Confirm'
import { Icon } from '~ui/src/design-system/components/Icon'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { themeImage } from '~/utils/themeTokens'
import { usePageSections } from '~ui/hooks/usePageSections'

const SessionsListUI = (props) => {
  const {
    sessionsList,
    actionState,
    handleDeleteSession,
    handleDeleteAllSessions
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  // the site's name, the title of its dialogs
  const [{ site }] = useSite()
  const [{ user }] = useSession()
  const [{ parseDate }] = useUtils()
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  // the "delete all" buttons under the list (pages.sessions section bulk_actions)
  const { isVisible } = usePageSections('sessions')
  const showBulkActions = isVisible('bulk_actions')

  const onDeleteSession = (session) => {
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_SESSION', 'Are you sure to delete this session?'),
      handleOnAccept: () => {
        handleDeleteSession(session)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  const onDeleteAllSessions = (isOldUser, deleteCurrent) => {
    setConfirm({
      open: true,
      content:
        isOldUser
          ? t('QUESTION_ENABLE_ALL_SESSIONS', 'Are you sure to enable all sessions?')
          : deleteCurrent
            ? t('QUESTION_DELETE_ALL_SESSIONS', 'Are you sure that you want to delete all sessions?')
            : t('QUESTION_DELETE_ALL_SESSIONS_EXCEPT_CURRENT', 'Are you sure that you want to delete all sessions except current?'),
      handleOnAccept: () => {
        handleDeleteAllSessions(deleteCurrent)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  useEffect(() => {
    if (actionState.error) {
      setAlertState({
        open: true,
        content: actionState.error
      })
    }
  }, [actionState.error])

  return (
    <SessionsListContainer
      data-doc-section='sessions-list'
      data-doc-state={user?.session_strategy !== 'jwt_session'
        ? 'inactive'
        : sessionsList.loading
          ? 'loading'
          : sessionsList.error
            ? 'error'
            : sessionsList.sessions.length === 0
              ? 'empty'
              : 'ready'}
    >
      <Title>{t('SECURITY', 'Security')}</Title>
      {user?.session_strategy === 'jwt_session'
        ? (
        <>
          {sessionsList.loading
            ? (
              <SessionsWrapper>
                {[...Array(5).keys()].map(i => (
                  <SessionItem key={i}>
                    <Skeleton width={200} height={16} />
                    <Skeleton width={16} height={16} />
                  </SessionItem>
                ))}
              </SessionsWrapper>
              )
            : (
                sessionsList.sessions.length > 0
                  ? (
              <>
              <SessionsWrapper>
                {sessionsList.sessions.map(session => (
                  <SessionItem
                    key={session.id}
                    data-doc-control='session-item'
                    data-doc-current={session.current ? 'true' : 'false'}
                  >
                    <DurationWrapper>
                      <p>{t('CREATED_AT', 'Created at')} {parseDate(session.created_at)}</p>
                      <p className='bold'>{t('EXPIRES', 'Expires')} {parseDate(session.valid_thru)}</p>
                    </DurationWrapper>
                    {session.current && (
                      <CurrentBadge $variant='primary' $size='sm'>{t('CURRENT', 'Current')}</CurrentBadge>
                    )}
                    <Button
                      data-doc-control='session-delete'
                      aria-label={t('DELETE_SESSION_CREATED_AT', 'Delete the session created at _DATE_').replace('_DATE_', parseDate(session.created_at))}
                      shape='icon'
                      color='neutral'
                      appearance='ghost'
                      size='md'
                      type='button'
                      onClick={() => onDeleteSession(session)}
                    >
                      <Icon name='closeMd' />
                    </Button>
                  </SessionItem>
                ))}
              </SessionsWrapper>
                {showBulkActions && (
                <ButtonsGroup>
                  <Button
                    data-doc-control='sessions-delete-all'
                    color='primary'
                    size='lg'
                    type='button'
                    disabled={actionState.loading}
                    onClick={() => onDeleteAllSessions(false, true)}
                  >
                    {t('DELETE_ALL_SESSIONS', 'Delete all sessions')}
                  </Button>
                  <Button
                    data-doc-control='sessions-delete-others'
                    color='primary'
                    size='lg'
                    type='button'
                    disabled={actionState.loading}
                    onClick={() => onDeleteAllSessions(false, false)}
                  >
                    {t('DELETE_ALL_SESSIONS_EXCEPT_CURRENT', 'Delete all sessions except current')}
                  </Button>
                </ButtonsGroup>
                )}
              </>
                    )
                  : (
                      /* the empty state of the app, a section of the page's
                         h1: images.empty.sessions, else the theme's
                         empty.not_found (no fixed illustration) */
                      <NotFoundSource
                        variant='empty'
                        headingLevel='h2'
                        icon='clockHistory'
                        image={themeImage(theme, 'empty.sessions')}
                        content={t('YOU_DONT_HAVE_ANY_SESSIONS', 'You don\'t have any sessions')}
                      />
                    )
              )}
        </>
          )
        : (
        /* sessions not enabled: the empty state of the app, a section of the
           page's h1, with its button (as NotFoundSource's own, here to keep
           its data-doc-control) */
        <NotFoundSource
          variant='empty'
          headingLevel='h2'
          icon='clockHistory'
          image={themeImage(theme, 'empty.sessions')}
          content={t('YOU_DONT_HAVE_ENABLED_THE_SESSIONS', 'You don\'t have enabled the sessions, please activate them to have a better control of your sessions.')}
        >
          <Button
            data-doc-control='sessions-activate'
            appearance='outline'
            color='primary'
            size='md'
            type='button'
            onClick={() => onDeleteAllSessions(true, false)}
          >
            {t('ACTIVE_SESSIONS', 'Active sessions')}
          </Button>
        </NotFoundSource>
          )}
      <Confirm
        data-doc-section='sessions-confirmation'
        title={getSiteName({ theme, site })}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onCancel={() => setConfirm({ ...confirm, open: false })}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />
      <Alert
        data-doc-section='sessions-alert'
        title={getSiteName({ theme, site })}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => setAlertState({ open: false, content: [] })}
        onAccept={() => setAlertState({ open: false, content: [] })}
        closeOnBackdrop={false}
      />
    </SessionsListContainer>
  )
}

export const SessionsList = (props) => {
  const sessionsProps = {
    ...props,
    UIComponent: SessionsListUI
  }
  return <SessionsController {...sessionsProps} />
}
