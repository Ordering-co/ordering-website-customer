import React, { useState, useEffect } from 'react'
import {
  PaginationContainer,
  PaginationButtonContainer,
  PageEllipsis
} from './styles'
import { Button } from '~ui/src/design-system/components/Button'
import { Chip } from '~ui/src/design-system/components/Chip'

import { ChevronIcon } from '~ui/src/styles/Chevron'
import { useLanguage } from '~components/contexts/LanguageContext'

export const Pagination = (props) => {
  const {
    currentPage,
    totalPages,
    handleChangePage
  } = props

  const [, t] = useLanguage()
  const [visiblePages, setVisiblePages] = useState([])
  const [activePage, setActivePage] = useState(currentPage)

  const filterPages = (visiblePages, totalPages) => {
    return visiblePages.filter(page => page <= totalPages)
  }

  const getVisiblePages = (page, total) => {
    if (total < 7) {
      return filterPages([1, 2, 3, 4, 5, 6], total)
    } else {
      if (page % 5 >= 0 && page > 4 && page + 2 < total) {
        return [1, page - 1, page, page + 1, total]
      } else if (page % 5 >= 0 && page > 4 && page + 2 >= total) {
        return [1, total - 3, total - 2, total - 1, total]
      } else {
        return [1, 2, 3, 4, 5, total]
      }
    }
  }

  const changePage = (page) => {
    if (page === activePage) {
      return
    }
    setActivePage(page)
    const _visiblePages = getVisiblePages(page, totalPages)
    setVisiblePages(filterPages(_visiblePages, totalPages))
    handleChangePage(page)
  }

  useEffect(() => {
    if (!totalPages) return
    setVisiblePages(getVisiblePages(null, totalPages))
  }, [totalPages])

  useEffect(() => {
    setActivePage(currentPage)
    const _visiblePages = getVisiblePages(currentPage, totalPages)
    setVisiblePages(filterPages(_visiblePages, totalPages))
  }, [currentPage])

  return (
    <PaginationContainer>
      <PaginationButtonContainer>
        <Button
          shape='icon'
          color='neutral'
          appearance='ghost'
          disabled={activePage === 1}
          aria-label={t('PREVIOUS', 'Previous')}
          onClick={() => (activePage !== 1) && changePage(activePage - 1)}
        >
          <ChevronIcon kind='navigate' direction='back' size={false} />
        </Button>

        {visiblePages.map((page, index, array) => (
          <React.Fragment key={page}>
            {array[index - 1] + 2 <= page
              ? (
              <>
                <PageEllipsis>
                  ...
                </PageEllipsis>
                <Chip
                  selected={activePage === page}
                  aria-current={activePage === page ? 'page' : undefined}
                  onClick={() => changePage(page)}
                >
                  {page}
                </Chip>
              </>
                )
              : (
              <Chip
                selected={activePage === page}
                aria-current={activePage === page ? 'page' : undefined}
                onClick={() => changePage(page)}
              >
                {page}
              </Chip>
                )}
          </React.Fragment>
        ))}

        <Button
          shape='icon'
          color='neutral'
          appearance='ghost'
          disabled={activePage === totalPages}
          aria-label={t('NEXT', 'Next')}
          onClick={() => (activePage !== totalPages) && changePage(activePage + 1)}
        >
          <ChevronIcon kind='navigate' size={false} />
        </Button>
      </PaginationButtonContainer>
    </PaginationContainer>
  )
}
