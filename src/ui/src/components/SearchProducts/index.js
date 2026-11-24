import React, { useRef } from 'react'
import { useTheme } from 'styled-components'
import { getThemeLogoUrl } from '~/utils/siteBranding'
import { ownSiteName } from '~/utils/resolvePwaBranding'

import {
  Container,
  BackDropContainer,
  SearchContainer,
  SearchHeader,
  SearchBarWrapper,
  CancelButton,
  LogoHeader,
  LogoName,
  BusinessProductsListContainer,
  BusinessProductsListWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useSite } from '~components/contexts/SiteContext'
import { SearchBar } from '~ui/src/components/SearchBar'
import { BusinessProductsList } from '~ui/src/components/BusinessProductsList'
import { Dialog, DialogContent, DialogTitle } from '~ui/src/design-system/components/Dialog'
import { themeSize } from '~/utils/themeTokens'

export const SearchProducts = (props) => {
  const {
    open = true,
    onClose,
    finalFocus,
    coveredByProduct,
    searchValue,
    handleChangeSearch,
    business,
    featuredProducts,
    categorySelected
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [events] = useEvent()
  const [{ site }] = useSite()
  const searchRef = useRef()
  const clearActionRef = useRef()
  const logoSrc = getThemeLogoUrl(theme)
  const ownName = !logoSrc && ownSiteName({ theme, site })

  const handleGoToPage = (data) => {
    events.emit('go_to_page', data)
    onClose()
  }

  const clearSearch = () => clearActionRef.current?.()

  const handleOpenChange = (nextOpen, details) => {
    if (nextOpen) return
    if (coveredByProduct) {
      // Escape and outside presses belong to the product or its child dialog.
      details.cancel()
      details.allowPropagation()
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent fullscreen customSurface showCloseButton={false} initialFocus={searchRef} finalFocus={finalFocus}>
        <DialogTitle visuallyHidden>{t('SEARCH_PRODUCTS', 'Search Products')}</DialogTitle>
        <Container data-doc-section='business-product-search' data-doc-state={searchValue ? 'results' : 'ready'}>
          <SearchContainer>
            <SearchHeader>
              {(logoSrc || ownName) && (
                <LogoHeader
                  onClick={() => handleGoToPage({ page: 'search' })}
                >
                  {logoSrc
                    ? (
                      <img
                        alt={t('LOGO', 'Logo')}
                        // no width: the logo box is size.lg tall and as wide as the image
                        height={themeSize(theme, 'lg')}
                        src={logoSrc}
                        loading='lazy'
                      />
                      )
                    : <LogoName title={ownName}>{ownName}</LogoName>}
                </LogoHeader>
              )}
              <SearchBarWrapper data-doc-control='business-product-search-term'>
                <SearchBar
                  baseInput
                  restoreFocusOnClear
                  onSearch={handleChangeSearch}
                  search={searchValue}
                  placeholder={t('SEARCH_PRODUCTS', 'Search Products')}
                  lazyLoad={business?.lazy_load_products_recommended}
                  forwardRef={searchRef}
                  clearActionRef={clearActionRef}
                />
              </SearchBarWrapper>
              <CancelButton
                data-doc-control='business-product-search-cancel'
                onClick={onClose}
              >
                {t('CANCEL', 'Cancel')}
              </CancelButton>
            </SearchHeader>
          </SearchContainer>
          {open && searchValue && (
            <BusinessProductsListContainer data-doc-section='business-product-search-results'>
              <BusinessProductsListWrapper>
                <BusinessProductsList
                  {...props}
                  categories={[
                    { id: null, name: t('ALL', 'All') },
                    { id: 'featured', name: t('FEATURED', 'Featured') },
                    ...business?.categories.sort((a, b) => a.rank - b.rank)
                  ]}
                  featured={featuredProducts}
                  category={categorySelected}
                  businessId={business?.id}
                  handleClearSearch={clearSearch}
                  isSearchMode
                />
              </BusinessProductsListWrapper>
            </BusinessProductsListContainer>
          )}
          <BackDropContainer
            data-doc-section='business-product-search-backdrop'
            onClick={onClose}
          />
        </Container>
      </DialogContent>
    </Dialog>
  )
}
