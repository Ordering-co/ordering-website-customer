import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { ButtonWrapper, CityChoices, CityChoiceRow, CityHeader, CityTitle, Container, SearchBarContainer } from './styles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { SearchBar } from '~ui/src/components/SearchBar'
import { RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Choice } from '~ui/src/design-system/components/Choice'
import { getThemeCss } from '~/utils/themeCss'
import { themeControlHeight } from '~/utils/themeTokens'
import { modalTitleLevel } from '../Overlay/titleLevel'

import { Button } from '~ui/src/design-system/components/Button'
import { closeButtonProps } from '~ui/src/design-system/components/Dialog'
import { Icon } from '~ui/src/design-system/components/Icon'

export const CitiesControl = (props) => {
  const {
    cities,
    onClose,
    handleChangeCity
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const theme = useTheme()

  const [cityState, setCityState] = useState(orderState?.options?.city_id)
  const [cityFilter, setCityFilter] = useState('')
  const handleClick = () => {
    cityState !== orderState?.options?.city_id && handleChangeCity(cityState)
    onClose && onClose()
  }

  return (
    <>
      <Container>
        {/* the title and the close in one row, as a modal's */}
        <CityHeader>
          <CityTitle as={modalTitleLevel(theme)}>
            {t('SELECT_A_STORE', 'Select a store')}
          </CityTitle>
          <Button
            type='button'
            {...closeButtonProps(theme)}
            aria-label={t('CLOSE', 'Close')}
            onClick={onClose}
          >
            <Icon name='closeMd' />
          </Button>
        </CityHeader>
        {
          orderState?.loading
            ? (
            <Skeleton
              height={themeControlHeight(theme, 'choice')}
              count={3}
              style={{ marginBottom: getThemeCss(theme, 'choice').base.gap }}
            />
              )
            : (
            <>
              <SearchBarContainer>
                <SearchBar
                  name='city-filter'
                  placeholder={t('SEARCH_CITIES', 'Search Cities')}
                  onSearch={(val) => setCityFilter(val)}
                  search={cityFilter}
                />
              </SearchBarContainer>
              {/* a single choice list of components.choice */}
              <RadioGroup
                render={<CityChoices />}
                aria-label={t('SELECT_A_STORE', 'Select a store')}
                value={cityState ?? null}
                onValueChange={setCityState}
              >
                {cities?.filter(city => city?.name?.toLowerCase?.()?.includes(cityFilter?.toLowerCase?.()))?.map(city => city?.enabled && (
                  <CityChoiceRow key={city?.id}>
                    {/* a radio cannot be unpicked by itself: picking the chosen city again clears it, as it always did */}
                    <Choice
                      value={city?.id}
                      title={city?.name}
                      onClick={() => city?.id === cityState && setCityState(null)}
                    />
                  </CityChoiceRow>
                ))}
              </RadioGroup>

            </>
              )
        }
      </Container>
      <ButtonWrapper>
        <Button fullWidth size='md' iconEnd={<Icon name='arrowRight' />} onClick={() => handleClick()}>
          {t('CONTINUE', 'Continue')}
        </Button>
      </ButtonWrapper>
    </>
  )
}
