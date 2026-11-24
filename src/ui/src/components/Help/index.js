import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import {
  HelpContainer,
  BreadCrumbContainer,
  BreadCrumbLink,
  Title,
  HelpContentWrapper,
  SubPageList,
  SubPageItem,
  SubPage,
  SubPageLabel,
  SubPageChevron,
  SubTitle,
  LastOrdersListWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { LastOrders } from '~ui/src/components/LastOrders'
import { HelpStaticPage } from '~ui/src/components/HelpStaticPage'
import { usePageSections } from '~ui/hooks/usePageSections'

import { ChevronIcon } from '~ui/src/styles/Chevron'
import { themeIconSize } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'

export const Help = (props) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  // The topics are a list of card rows (buttons) and the open topic's title
  // is the page's h1
  const [selectedPage, setSelectedPage] = useState(null)
  // the topics and the last order (pages.help, group main), in the theme's
  // order; the theme may hide either
  const { render } = usePageSections('help')

  const menuList = [
    { id: 1, title: t('HELP_WITH_AN_ORDER', 'Help with an order') },
    { id: 2, title: t('ACCOUNT_AND_PAYMENT_OPTIONS', 'Account and Payment Options') },
    { id: 3, title: t('GUIDE_TO_ORDERING', 'Guide to Ordering') }
  ]

  const sectionRenderers = {
    help_topics: () => (
      <SubPageList>
        {
          menuList && menuList.map((page, i) => (
            <SubPageItem key={i}>
              <SubPage
                data-doc-control={`help-topic-${page.id}`}
                onClick={() => setSelectedPage(page)}
              >
                <SubPageLabel>{page?.title}</SubPageLabel>
                {/* components.help_topic chevron_size (its color, the
                    chevron_color, is the wrapper's) */}
                <SubPageChevron>
                  <ChevronIcon kind='navigate' size={getThemeCss(theme, 'help_topic').base.chevron_size} />
                </SubPageChevron>
              </SubPage>
            </SubPageItem>
          ))
        }
      </SubPageList>
    ),
    last_order: () => (
      <LastOrdersListWrapper>
        <LastOrders {...props} />
      </LastOrdersListWrapper>
    )
  }

  return (
    <HelpContainer data-doc-section='help'>
      {selectedPage && (
        <>
          <BreadCrumbContainer>
            <BreadCrumbLink
              className='deactive'
              onClick={() => setSelectedPage(null)}
            >
              {t('HELP', 'Help')}
            </BreadCrumbLink>
            <ChevronIcon kind='navigate' size={themeIconSize(theme, 'sm')} />
            <span aria-current='page'>{selectedPage?.title}</span>
          </BreadCrumbContainer>
          <SubTitle>{selectedPage?.title}</SubTitle>
        </>
      )}
      {
        !selectedPage && (
          <>
            <Title>{t('HELP', 'Help')}</Title>
            <HelpContentWrapper>
              {render(sectionRenderers, { group: 'main' })}
            </HelpContentWrapper>
          </>
        )
      }
      {selectedPage?.id === 1 && <HelpStaticPage slug='helpOrder' />}
      {selectedPage?.id === 2 && <HelpStaticPage slug='helpAccountAndPayment' />}
      {selectedPage?.id === 3 && <HelpStaticPage slug='helpOrderingGuide' />}
    </HelpContainer>
  )
}
