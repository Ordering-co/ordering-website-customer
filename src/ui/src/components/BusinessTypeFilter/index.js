import React, { useEffect, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'

import { BusinessCategoryTitle, SearchTypeContainer } from './styles'
import { BusinessTypeFilter as BusinessTypeFilterController } from '~components/components/BusinessTypeFilter'
import { useLanguage } from '~components/contexts/LanguageContext'

import { AutoScroll } from '~ui/src/components/AutoScroll'
import { Chip } from '~ui/src/design-system/components/Chip'
import { TabsAction, TabsNavigation, TabsScrollArea } from '~ui/src/design-system/components/Tabs'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeHidden } from '~/utils/themeVisibility'

const BusinessTypeFilterUI = (props) => {
  const {
    typesState,
    currentTypeSelected,
    handleChangeBusinessType,
    isSearchMode,
    filters,
    handleChangeFilters,
    isAppoint
  } = props
  const { loading, error, types } = typesState
  const [, t] = useLanguage()
  const [load, setLoad] = useState(false)
  const theme = useTheme()
  const isCategoriesHidden = themeHidden(theme, 'business_listing.categories.all')

  const handleChangeCategory = (category) => {
    if (isAppoint && category === currentTypeSelected && !isCategoriesHidden) {
      handleChangeBusinessType(null)
      return
    }
    handleChangeBusinessType && handleChangeBusinessType(category)
  }

  const handleChangeActiveBusinessType = (type) => {
    if (type?.id === null) {
      handleChangeFilters('business_types', [])
      return
    }
    if (filters?.business_types?.includes(type?.id)) {
      const arrayAux = filters?.business_types
      const index = arrayAux?.indexOf(type?.id)
      arrayAux.splice(index, 1)
      handleChangeFilters('business_types', arrayAux)
    } else {
      handleChangeFilters('business_types', [...filters?.business_types, type?.id])
    }
  }

  useEffect(() => {
    if (isCategoriesHidden && currentTypeSelected === null) {
      if (types && types?.length > 0) {
        (!isSearchMode && !isAppoint) && handleChangeCategory(types[1]?.id)
      }
    }
  }, [types, currentTypeSelected])

  return (
    <>
      {isSearchMode && (
        <SearchTypeContainer isSearchMode id='container'>
          {types.map((type, i) => type.enabled && (
            <Chip
              key={type?.id}
              selected={!!(filters?.business_types?.includes(type?.id) || (type?.id === null && filters?.business_types?.length === 0))}
              onClick={() => handleChangeActiveBusinessType(type)}
            >
              {t(`BUSINESS_TYPE_${type.name.replace(/\s/g, '_').toUpperCase()}`, type.name)}
              {filters?.business_types?.includes(type?.id) && <Icon name="closeX" />}
            </Chip>
          ))}
        </SearchTypeContainer>
      )}
      {isAppoint && (
        <SearchTypeContainer id='container'>
          {loading
            ? (
                [...Array(6)].map((_, i) => (
              <Skeleton id='skeleton' key={i} height={28} width={70} />
                ))
              )
            : (
                types.map((type, i) => type.enabled && (
              <Chip
                key={type?.id}
                selected={type.id === currentTypeSelected}
                onClick={() => handleChangeCategory(type.id)}
              >
                {t(`BUSINESS_TYPE_${type.name.replace(/\s/g, '_').toUpperCase()}`, type.name)}
                {(currentTypeSelected && (type.id === currentTypeSelected)) && <Icon name="closeX" />}
              </Chip>
                ))
              )}
        </SearchTypeContainer>
      )}
      {(!isSearchMode && !isAppoint) && (
        <>
          {loading && (
            <TabsScrollArea id='container' inset='lg'>
              <TabsNavigation mode='stacked' width='content' tone='primary'>
                <AutoScroll>
                  <TabsAction loading>
                    {[...Array(4)].map((_, i) => (
                      <Skeleton id='skeleton' key={i} height={40} width={120} />
                    ))}
                  </TabsAction>
                </AutoScroll>
              </TabsNavigation>
            </TabsScrollArea>
          )}
          {!loading && !error && types && types.length > 0 && (
            <TabsScrollArea id='container' inset='lg'>
              <TabsNavigation mode='stacked' width='content' tone='primary'>
                <AutoScroll>
                  {types.map((type, i) => (isCategoriesHidden ? type.enabled && type.name !== 'All' : type.enabled) && (
                    <TabsAction
                      key={type.id}
                      active={type.id === currentTypeSelected || (currentTypeSelected == null && i === 0)}
                      aria-pressed={type.id === currentTypeSelected}
                      onClick={() => handleChangeCategory(type.id)}
                      title={t(`BUSINESS_TYPE_${type.name.replace(/\s/g, '_').toUpperCase()}`, type.name)}
                    >
                      <BusinessCategoryTitle
                        active={type.id === currentTypeSelected}
                        load={load}
                        onLoad={() => setLoad(true)}
                      >
                        {t(`BUSINESS_TYPE_${type.name.replace(/\s/g, '_').toUpperCase()}`, type.name)}
                      </BusinessCategoryTitle>
                    </TabsAction>
                  ))}
                </AutoScroll>
              </TabsNavigation>
            </TabsScrollArea>
          )}
        </>
      )}
    </>
  )
}

export const BusinessTypeFilter = (props) => {
  const businessTypeFilterProps = {
    ...props,
    UIComponent: BusinessTypeFilterUI,
    defaultBusinessType: props.defaultBusinessType || null,
    onChangeBusinessType: props.handleChangeBusinessType
  }

  return (
    <BusinessTypeFilterController {...businessTypeFilterProps} />
  )
}
