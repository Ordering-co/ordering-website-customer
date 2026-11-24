import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { BusinessProductsCategories as ProductsCategories } from '~components/components/BusinessProductsCategories'
import { AccordionDropdown } from '~ui/src/components/AccordionDropdown'
import { HEADER_DOCK_EVENT, HEADER_STATE_EVENT, headerVisibleBottom } from '~ui/src/components/Header/scrollBehavior'
import { useLanguage } from '~components/contexts/LanguageContext'
import { MenuNavigationItem } from '~ui/src/design-system/components/Menu'
import { Button } from '~ui/src/design-system/components/Button'
import { ChevronIcon } from '~ui/src/styles/Chevron'

import {
  CategoriesContainer,
  CategoriesWrap,
  IterateCategoriesContainer,
  DrillHeader,
  DrillBackCell
} from './styles'

const SPACE_CONTANT = 5

const categorySpace = {
  1: 0,
  2: 2 * SPACE_CONTANT,
  3: 3 * SPACE_CONTANT,
  4: 4 * SPACE_CONTANT,
  5: 5 * SPACE_CONTANT
}

const BusinessProductsCategoriesUI = (props) => {
  const {
    isSkeleton,
    isPopover,
    categories,
    handlerClickCategory,
    onPopoverSelect,
    categorySelected,
    featured,
    openCategories,
    setCategoryClicked,
    useKioskApp
  } = props

  const [, t] = useLanguage()
  const containerRef = useRef(null)

  // Beside the products the categories stay in view under the bar above them:
  // the sticky header while it is on view (headerVisibleBottom, the kiosk
  // included) or the business name bar once it is fixed on top
  // (BusinessBasicInformation toggles `fixed-name`), the lower of the two; else, 0.
  useEffect(() => {
    if (isPopover) return
    const businessName = document.getElementById('business_name_bar')
    const placeTop = () => {
      const isNameFixed = !useKioskApp && !!businessName?.classList.contains('fixed-name')
      const top = Math.max(0, Math.round(Math.max(headerVisibleBottom(), isNameFixed ? businessName.getBoundingClientRect().bottom : 0)))
      containerRef.current?.style.setProperty('--categories-sticky-top', `${top}px`)
    }
    placeTop()
    const observer = businessName && typeof MutationObserver === 'function'
      ? new MutationObserver(placeTop)
      : null
    observer?.observe(businessName, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('resize', placeTop)
    // a revealing header comes and goes, and its bar docked under it changes size
    window.addEventListener(HEADER_STATE_EVENT, placeTop)
    window.addEventListener(HEADER_DOCK_EVENT, placeTop)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', placeTop)
      window.removeEventListener(HEADER_STATE_EVENT, placeTop)
      window.removeEventListener(HEADER_DOCK_EVENT, placeTop)
    }
  }, [isPopover, useKioskApp])

  // In the popover: a category with subcategories is entered (its name as
  // the title, a back button, "All" for the whole category, then its
  // subcategories), level by level, instead of an accordion
  const isDrillDown = isPopover
  const [{ path, focusOrigin }, setNavigation] = useState({ path: [], focusOrigin: null })
  const currentParent = path[path.length - 1]
  const nextFocusedItem = useRef(null)

  useLayoutEffect(() => {
    nextFocusedItem.current?.focus()
  }, [path])

  const handleClickItem = (category, isSelectCategory) => {
    handlerClickCategory(category)
    if (isSelectCategory) {
      setCategoryClicked(true)
    }
  }

  const enterCategory = (category) => {
    setNavigation({ path: [...path, category], focusOrigin: null })
  }

  const goBack = () => {
    setNavigation({ path: path.slice(0, -1), focusOrigin: currentParent.id ?? currentParent.name })
  }

  const selectCategory = (category) => {
    setNavigation({ path: [], focusOrigin: null })
    handleClickItem(category, true)
    onPopoverSelect?.()
  }

  const renderDrillDownCategories = () => {
    const list = currentParent ? currentParent.subcategories : categories
    return (
      <>
        {currentParent && (
          <>
            <DrillHeader>
              <DrillBackCell>
                <Button ref={focusOrigin === null ? nextFocusedItem : undefined} shape='icon' color='neutral' appearance='ghost' size='sm' aria-label={t('BACK', 'Back')} onClick={goBack}>
                  <ChevronIcon kind='navigate' direction='back' size={false} />
                </Button>
              </DrillBackCell>
              <span title={currentParent.name}>{currentParent.name}</span>
            </DrillHeader>
            <MenuNavigationItem
              popover
              current={categorySelected?.id === currentParent.id}
              onClick={() => selectCategory(currentParent)}
            >
              <span>{t('ALL', 'All')}</span>
            </MenuNavigationItem>
          </>
        )}
        {list?.map(category => category?.subcategories?.length > 0
          ? (
            <MenuNavigationItem
              key={category?.id ?? category?.name}
              ref={focusOrigin === (category.id ?? category.name) ? nextFocusedItem : undefined}
              popover
              current={categorySelected?.id === category.id}
              onClick={() => enterCategory(category)}
            >
              <span title={category.name}>{category.name}</span>
              <ChevronIcon kind='navigate' />
            </MenuNavigationItem>
            )
          : (
            <MenuNavigationItem
              key={category?.id ?? category?.name}
              popover
              hidden={category.id === 'featured' && !featured}
              current={categorySelected?.id === category.id}
              onClick={() => selectCategory(category)}
            >
              <span title={category.name}>{category.name}</span>
            </MenuNavigationItem>
            ))}
      </>
    )
  }

  const IterateCategories = ({ list, isSub, currentCat }) => {
    return (
      <>
        {list?.length && list?.map((category, i) => (
          <IterateCategoriesContainer key={category?.id ?? category?.name} $popover={isPopover}>
            {(category?.subcategories?.length > 0 || isSub)
              ? (
              <>
                {category?.subcategories?.length > 0 && (
                  <>
                    {/* a top category with its line below, as the others (the
                        last one has the box's border) */}
                    <div className={`accordion ${!isSub && i + 1 !== list?.length ? 'level-1' : ''}`}>
                      <AccordionDropdown
                        item={category}
                        isSelected={categorySelected?.id === category.id}
                        isOpen={openCategories?.includes(category.id)}
                        spaceTab={categorySpace[category?.level ?? 1]}
                        handleClickItem={(isSelectCategory) => handleClickItem(category, isSelectCategory)}
                        IterateCategories={IterateCategories}
                        isPopover={isPopover}
                      />
                    </div>
                  </>
                )}
                {isSub && !category?.subcategories?.length && (
                  <MenuNavigationItem
                    current={categorySelected?.id === category.id}
                    hidden={category.id === 'featured' && !featured}
                    indent={categorySpace[category?.level ?? 1]}
                    onClick={() => handleClickItem(category, true)}
                    divider={!isPopover && !isSub && i + 1 !== list?.length}
                    popover={isPopover}
                  >
                    <span title={category.name}>
                      {category.name}
                    </span>
                  </MenuNavigationItem>
                )}
              </>
                )
              : (
              <MenuNavigationItem
                current={categorySelected?.id === category.id}
                hidden={category.id === 'featured' && !featured}
                indent={categorySpace[category?.level ?? 1]}
                onClick={() => handleClickItem(category, true)}
                divider={!isPopover && !isSub && i + 1 !== list?.length}
                popover={isPopover}
              >
                <span title={category.name}>
                  {category.name}
                </span>
              </MenuNavigationItem>
                )}
          </IterateCategoriesContainer>
        ))}
      </>
    )
  }

  return (
    <CategoriesContainer ref={containerRef} className='category-lists' featured={featured} isPopover={isPopover}>
      {!isSkeleton
        ? (
        <CategoriesWrap variant='primary' isPopover={isPopover}>
          {categories?.length > 0 && (isDrillDown ? renderDrillDownCategories() : <IterateCategories list={categories} />)}
        </CategoriesWrap>
          )
        : (
        <CategoriesWrap variant='primary'>
          {[...Array(4).keys()].map(i => (
            <div key={i}>
              <Skeleton width={100} />
            </div>
          ))}
        </CategoriesWrap>
          )}
    </CategoriesContainer>
  )
}

export const BusinessProductsCategories = (props) => {
  const businessProductsCategoriesProps = {
    ...props,
    UIComponent: BusinessProductsCategoriesUI
  }

  return (
    <ProductsCategories {...businessProductsCategoriesProps} />
  )
}
