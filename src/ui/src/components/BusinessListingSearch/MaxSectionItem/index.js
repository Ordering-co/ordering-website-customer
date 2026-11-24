import React from 'react'
import {
  MaxFilterContainer,
  OriginDot,
  MaxItemContainer,
  ProgressBar,
  ProgressContentWrapper,
  Description
} from '../styles'
import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { capitalize } from '~ui/utils'

import { Dot } from '~ui/src/design-system/components/Dot'
import { SliderStopButton } from '~ui/src/design-system/components/ButtonAppearances'
import { SliderThumb } from '~ui/src/styles/Slider'

export const MaxSectionItem = (props) => {
  const {
    filters,
    handleChangeFilters,
    options,
    filter,
    description
  } = props

  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [{ configs }] = useConfig()

  const distanceUnit = configs?.distance_unit?.value

  const units = {
    mi: 1609,
    km: 1000
  }

  const parseValue = (option) => {
    return filter === 'max_distance'
      ? `${(option / units[distanceUnit]).toFixed(0)} ${t(`${distanceUnit?.toUpperCase()}`, capitalize(distanceUnit))}`
      : filter === 'max_eta'
        ? `${option} ${t('TIME_MIN', 'min')}`
        : parsePrice(option)
  }

  const handleBarClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const position = ((e.clientX - rect.left) / rect.width) * 100
    const stepSize = 100 / (options.length - 1)
    const selectedIndex = Math.round(position / stepSize)
    const selectedOption = options[selectedIndex]
    handleChangeFilters(filter, selectedOption)
  }

  const defaultIndex = options.indexOf('default') >= 0
    ? options.indexOf('default')
    : options.length - 1
  const selectedIndex = options.indexOf(filters?.[filter])
  // When the filter is unset (selectedIndex === -1), default to the rightmost
  // 'default' stop ("show all" / no limit) so the handle position matches the
  // value actually applied instead of looking like the first option is selected.
  const activeIndex = selectedIndex >= 0 ? selectedIndex : defaultIndex
  const currentPosition = options.length > 1
    ? (activeIndex / (options.length - 1)) * 100
    : 0
  const selectedDeliveryFee = filters?.[filter] === 'default'
    ? options[options.length - 2]
    : filters?.[filter]

  // the filter's modal names it (its title): the slider is its content
  return (
    <MaxFilterContainer>
      {description && <Description>{description}</Description>}
      {filter === 'max_delivery_price' && !!filters?.[filter] && (
        <p className='under-price'>{t('UNDER', 'Under')} {parsePrice(selectedDeliveryFee)}</p>
      )}
      {/* the track takes a click with the pointer; the stops (buttons under
          it) are the way with the keyboard and for assistive technology */}
      <ProgressContentWrapper onClick={handleBarClick} aria-hidden='true'>
        <OriginDot style={{ left: '0%' }}><Dot size='md' outline /></OriginDot>
        {/* the thumb of components.slider */}
        <SliderThumb style={{ left: `${currentPosition}%` }} />
        <ProgressBar style={{ width: `${currentPosition}%` }} />
      </ProgressContentWrapper>
      <MaxItemContainer>
        {options.map((option, i) => (
          <SliderStopButton
            key={option}
            sliderActive={i === activeIndex}
            aria-pressed={i === activeIndex}
            onClick={() => handleChangeFilters(filter, option)}
          >
            {option === 'default' ? `${parseValue(options[i - 1])}+` : parseValue(option)}
          </SliderStopButton>
        ))}
      </MaxItemContainer>
    </MaxFilterContainer>
  )
}
