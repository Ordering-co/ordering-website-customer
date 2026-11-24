import React from 'react'
import { useTheme } from 'styled-components'
import { SearchIconWrapper, SearchWrapper, WrapperSearch } from './styles'
import { Select } from '~ui/src/design-system/components/Select'
import { Icon } from '~ui/src/design-system/components/Icon'
import { useLanguage } from '~components/contexts/LanguageContext'
import { themeVisible } from '~/utils/themeVisibility'

export const SearchComponent = (props) => {
  const {
    setOpenSearchProducts,
    handleChangeSortBy,
    sortByValue,
    sortByOptions,
    isResponsive,
    // laid out in the actions bar's flow instead of floating over the cover
    inline
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()

  const hideSort = !themeVisible(theme, 'business.header.sort')
  // the button that opens the product search (visibility
  // business.header.search)
  const showSearch = themeVisible(theme, 'business.header.search')

  if (!showSearch && hideSort) return null

  return (
    <WrapperSearch id='search-component' isResponsive={isResponsive} $inline={inline}>
      <SearchWrapper>
        {showSearch && (
          <SearchIconWrapper
            data-doc-control='business-product-search-open'
            onClick={(event) => setOpenSearchProducts(true, event.currentTarget)}
            // a button named by what it opens
            aria-label={t('SEARCH_PRODUCTS', 'Search Products')}
          >
            <Icon name="search" aria-hidden='true' />
          </SearchIconWrapper>
        )}
        {!hideSort && (
          <Select
            presentation='mobile-sheet'
            resetOnOptionsChange={false}
            onCover={!inline}
            aria-label={t('SORT_BY', 'Sort By')}
            options={sortByOptions}
            defaultValue={sortByValue}
            onChange={(val) => handleChangeSortBy && handleChangeSortBy(val)}
          />
        )}
      </SearchWrapper>
    </WrapperSearch>
  )
}
