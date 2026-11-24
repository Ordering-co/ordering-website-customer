import React from 'react'
import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '../../components/Button'
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from '../../components/Popover'

const Body = styled.div`
  display: grid;
  justify-items: start;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  overflow-y: auto;
`

export const PortalDemo = ({ id, translateTitle, children }) => {
  const [{ language }, t] = useLanguage()
  const lang = language?.code
  const title = translateTitle(t)
  return (
    <Popover>
      <PopoverTrigger render={<Button appearance='outline' lang={lang} data-testid={`${id}-open`} />}>
        {t('DS_PREVIEW_OPEN_PORTAL', 'Open portal demo for _demo_').replace('_demo_', () => title)}
      </PopoverTrigger>
      <PopoverContent align='start' data-testid={id}>
        <Body>
          <PopoverTitle lang={lang}>{title}</PopoverTitle>
          {children}
          <PopoverClose render={<Button appearance='ghost' color='neutral' lang={lang} />}>
            {t('CLOSE', 'Close')}
          </PopoverClose>
        </Body>
      </PopoverContent>
    </Popover>
  )
}
