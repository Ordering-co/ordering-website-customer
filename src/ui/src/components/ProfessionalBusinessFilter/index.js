import React from 'react'
import {
  Container,
  FilterWrapper,
  FilterItem,
  PriceFieldSlot,
  Divider,
  SearchWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { Input } from '~ui/src/design-system/components/Input'
import { Select } from '~ui/src/design-system/components/Select'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { SearchBar } from '~ui/src/components/SearchBar'

export const ProfessionalBusinessFilter = (props) => {
  const {
    sortByValue,
    sortByOptions,
    handleChangeSortBy,
    handleChangeSearch,
    searchValue,
    business,
    handleChangePriceFilterValues,
    priceFilterValues
  } = props

  const [, t] = useLanguage()
  const { width } = useWindowSize()

  return (
    <>
      <SearchWrapper>
        <SearchBar
          onSearch={handleChangeSearch}
          search={searchValue}
          placeholder={t('SEARCH_PRODUCTS', 'Search Products')}
          lazyLoad={business?.lazy_load_products_recommended}
        />
      </SearchWrapper>
      <Container>
        <FilterWrapper>
          <FilterItem>
            <label htmlFor='professional-price-min'>{t('PREORDER_STEP_2_TIME_OPTION_MIN', 'Min')}.</label>
            <PriceFieldSlot>
              <Input
                id='professional-price-min'
                value={priceFilterValues?.min || ''}
                onKeyPress={(e) => {
                  if (!/^[0-9.]$/.test(e.key)) {
                    e.preventDefault()
                  }
                }}
                onChange={(e) => handleChangePriceFilterValues('min', e.target.value)}
                placeholder={t('PREORDER_STEP_2_TIME_OPTION_MIN', 'Min')}
              />
            </PriceFieldSlot>
          </FilterItem>
          <FilterItem>
            <label htmlFor='professional-price-max'>{t('MAX', 'Max')}.</label>
            <PriceFieldSlot>
              <Input
                id='professional-price-max'
                value={priceFilterValues?.max || ''}
                onKeyPress={(e) => {
                  if (!/^[0-9.]$/.test(e.key)) {
                    e.preventDefault()
                  }
                }}
                onChange={(e) => handleChangePriceFilterValues('max', e.target.value)}
                placeholder={t('MAX', 'Max')}
              />
            </PriceFieldSlot>
          </FilterItem>
        </FilterWrapper>
        {width > 576 && <Divider />}
        <Select
          aria-label={t('SORT_BY', 'Sort By')}
          options={sortByOptions}
          defaultValue={sortByValue}
          onChange={(val) => handleChangeSortBy && handleChangeSortBy(val)}
        />
      </Container>
    </>
  )
}
