import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import { CategoriesContainer, CategoriesScrollport } from './styles'

import { BusinessProductsCategories as ProductsCategories } from '~components/components/BusinessProductsCategories'
import { TabsAction, TabsNavigation, slotTabsOptions } from '~ui/src/design-system/components/Tabs'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { themeColor } from '~/utils/themeColors'
import { useLanguage } from '~components/contexts/LanguageContext'
import { fixedBarsBottom, scrollToCategory, REACHED_TOLERANCE } from './scrollToCategory'
import { HEADER_DOCK_EVENT, HEADER_STATE_EVENT, headerVisibleBottom } from '~ui/src/components/Header/scrollBehavior'

const BusinessProductsCategoriesUI = (props) => {
  const {
    isSkeleton,
    categories,
    featured,
    openBusinessInformation,
    business,
    handlerClickCategory,
    categorySelected,
    useKioskApp,
    isProfessional,
    handleTogglePopover,
    categoryPopoverId,
    categoryPopoverOpen
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  // the bar and its tabs of the category_tabs.slots.tabs size and style
  // (without a style, the default style of the bar's tabs)
  const slotProps = slotTabsOptions(theme, 'category_tabs', 'tabs')
  const windowSize = useWindowSize()
  const scrollport = useRef(null)
  const [selectedCategory, setSelectedCateogry] = useState({ id: null })
  const hideListCategory = true

  const handleChangeCategory = (category) => {
    const isBlockScroll = window.location.search.includes('category') &&
      window.location.search.includes('product')

    if (business?.lazy_load_products_recommended) {
      handlerClickCategory({ ...category })
      return
    }
    if (!isBlockScroll) {
      const section = document.getElementById(`category${category?.id}`)
      scrollToCategory(section?.querySelector('.category-title') || section, theme)
    }
  }

  const popoverAttributes = {
    'aria-haspopup': 'dialog',
    'aria-expanded': !!categoryPopoverOpen,
    'aria-controls': categoryPopoverOpen ? categoryPopoverId : undefined
  }

  const renderProductCategories = () => {
    const listCategory = categories.find(category => category.id === -1)
    const otherCategories = categories.filter(category => category.id !== -1)

    return (
      <>
        {!hideListCategory && listCategory && (
          <TabsAction
            id={`category-menu${listCategory.id} tab`}
            className='category-popover-toggle'
            {...popoverAttributes}
            active={business?.lazy_load_products_recommended ? (categorySelected?.id === listCategory.id) : (selectedCategory?.id === listCategory.id)}
            onClick={() => listCategory.isList ? handleTogglePopover() : handleChangeCategory(listCategory)}
            title={listCategory.name}
          >
            {listCategory.name}
          </TabsAction>
        )}
        {otherCategories && otherCategories.length && otherCategories.map((category, i) => (
          <TabsAction
            key={i}
            data-doc-control='business-category-tab'
            data-doc-category-id={category.id}
            data-doc-active={String(business?.lazy_load_products_recommended ? categorySelected?.id === category.id : selectedCategory?.id === category.id)}
            id={`category-menu${category.id} tab`}
            className={category.isList ? 'category-popover-toggle' : undefined}
            {...(category.isList && popoverAttributes)}
            hidden={category.id === 'featured' && !featured}
            active={business?.lazy_load_products_recommended ? (categorySelected?.id === category.id) : (selectedCategory?.id === category.id)}
            onClick={() => category.isList ? handleTogglePopover() : handleChangeCategory(category)}
            title={category.name}
          >
            {category.name}
          </TabsAction>
        ))}
      </>
    )
  }

  const handleScroll = () => {
    if (business?.lazy_load_products_recommended) return
    const featuredElement = document.getElementById('categoryfeatured')
    const _categories = featuredElement ? [...categories] : categories.filter(category => category.id !== 'featured')

    const viewport = scrollport.current
    const viewportBounds = viewport?.getBoundingClientRect()

    const tabScrollMargin = 40

    // reached: its top is at the fixed bars' bottom or above, its end below
    const reached = (category) => {
      const section = document.getElementById(`category${category.id}`)
      if (!section) return false
      const barsBottom = fixedBarsBottom(section) + REACHED_TOLERANCE
      const { top, bottom } = section.getBoundingClientRect()
      return top <= barsBottom && bottom > barsBottom
    }
    // shortcut: scrolled to the end of the page the last category is the active
    // one (it may be too short to reach the bars), so two short ones at the
    // end never both highlight; upgrade if a store needs that
    const atPageEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1
    const lastWithSection = atPageEnd && [..._categories].reverse().find(category => document.getElementById(`category${category.id}`))

    const candidates = lastWithSection ? [lastWithSection] : _categories
    candidates.some(category => {
      if (category === lastWithSection || reached(category)) {
        const choosedCategory = document.getElementById(`category-menu${category.id} tab`)

        if (!choosedCategory) {
          setSelectedCateogry(category)
          return true
        }
        if (viewportBounds) {
          const { left, right } = choosedCategory.getBoundingClientRect()
          if (left < viewportBounds.left) {
            viewport.scrollBy?.({ left: left - viewportBounds.left - tabScrollMargin, behavior: 'instant' })
          } else if (right > viewportBounds.right) {
            viewport.scrollBy?.({ left: right - viewportBounds.right + tabScrollMargin, behavior: 'instant' })
          }
        }
        setSelectedCateogry(category)
        return true
      }
    })

    const navbar = document.getElementById('category-lists')
    const search = document.getElementById('WrapperSearchAbsolute')
    if (!navbar) return
    // The categories stay fixed from where they touch the bar above them: the
    // business name once it is fixed or the header while it is on view, the
    // lower of the two (the kiosk has no name bar; its header is mounted
    // everywhere but on its home, 0 where there is none), measured now: a revealing header
    // comes and goes. Their box is absolute in a place of their own
    // (the space stays when they are fixed), so that place tells where they
    // would be.
    const businessName = document.getElementById('business_name_bar')
    const isNameFixed = !useKioskApp && !!businessName?.classList.contains('fixed-name')
    const stickyTop = Math.round(Math.max(headerVisibleBottom(), isNameFixed ? businessName.getBoundingClientRect().bottom : 0))
    navbar.style.setProperty('--categories-sticky-top', `${stickyTop}px`)
    const placeTop = navbar.parentElement?.getBoundingClientRect().top ?? Infinity
    const limit = placeTop <= stickyTop && window.pageYOffset > 0
    // Docked under the fixed name, both bars are one: only the categories'
    // shadow marks its bottom.
    businessName?.classList.toggle('categories-docked', limit && isNameFixed)
    // docked under a bar with a bottom border (the header, the fixed name),
    // the two borders are one: the categories lose their top
    const barAbove = limit && typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(1, stickyTop - 0.5).find(el =>
        !navbar.contains(el) &&
        Math.abs(el.getBoundingClientRect().bottom - stickyTop) <= 1 &&
        parseFloat(window.getComputedStyle(el).borderBottomWidth) > 0)
      : null
    navbar.classList.toggle('categories-joined', !!barAbove)

    if (limit) {
      const classAdded = navbar.classList.contains('sticky-prod-cat')
      if (!classAdded) {
        navbar && navbar.classList.add('sticky-prod-cat')
        search && search.classList.add('sticky-search')
      }
    } else {
      navbar && navbar.classList.remove('sticky-prod-cat')
      search && search.classList.remove('sticky-search')
    }
  }

  // the listener always runs the latest handleScroll (its categories)
  const handleScrollRef = useRef(handleScroll)
  handleScrollRef.current = handleScroll
  // Once after mounting and when the categories change: with the scroll
  // restored (reload, back) there is no scroll event to set the active tab
  const categoriesKey = categories.map(category => category.id).join()
  useEffect(() => {
    handleScrollRef.current()
  }, [categoriesKey])

  useEffect(() => {
    const styleSheet = document.getElementById('styles')?.sheet

    if (Object.values(styleSheet.cssRules)?.length) {
      styleSheet?.deleteRule(0)
    }
    const disabledCustomWidth = !useKioskApp

    let style0 = '.sticky-prod-cat {'
    style0 += 'position: fixed !important;'
    style0 += 'top: var(--categories-sticky-top, 0px) !important;'
    style0 += 'left: 0px !important;'
    style0 += 'z-index: 9999 !important;'
    // the bar spans the whole width, its track edge to edge
    style0 += 'width: 100% !important;'
    !disabledCustomWidth && (style0 += `width: calc(100% - ${useKioskApp ? '50px' : '0px'}) !important;`)
    style0 += '}'

    let style1 = '.sticky-search {'
    style1 += 'position: fixed !important;'
    style1 += 'top: 0px !important;'
    style1 += 'right: 0% !important;'
    style1 += 'z-index: 9999 !important;'
    style1 += 'width: 50px !important;'
    style1 += `background-color: ${themeColor(theme, 'background')} !important;`
    style1 += '}'

    styleSheet.insertRule(style0, 0)
    styleSheet.insertRule(style1, 1)

    const onScroll = () => handleScrollRef.current()
    window.addEventListener('scroll', onScroll)
    // the header (re)appears or leaves on its own frame, after this scroll's
    window.addEventListener(HEADER_STATE_EVENT, onScroll)
    // the bar docked under it changes size
    window.addEventListener(HEADER_DOCK_EVENT, onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener(HEADER_STATE_EVENT, onScroll)
      window.removeEventListener(HEADER_DOCK_EVENT, onScroll)
      document.getElementById('business_name_bar')?.classList.remove('categories-docked')
    }
  }, [useKioskApp, windowSize.width])

  useEffect(() => {
    if (business?.professionals?.length > 0 && !useKioskApp) {
      const element = document.getElementById('category-lists')
      element.setAttribute('style', 'width: 100% !important')
    }
  }, [business?.professionals, useKioskApp])

  // The menu of the categories (the list category): opens the categories
  // popover
  const menuTab = categories.find(category => category.id === -1) && (
    <TabsAction
      data-doc-control='business-category-popover-open'
      id={'category-menu-1 tab'}
      className='category-popover-toggle'
      {...popoverAttributes}
      active={business?.lazy_load_products_recommended ? (categorySelected?.id === -1) : (selectedCategory?.id === -1)}
      onClick={() => handleTogglePopover()}
      aria-label={t('CATEGORIES', 'Categories')}
    >
      {categories.find(category => category.id === -1).name}
    </TabsAction>
  )

  return (
    <CategoriesContainer
      data-doc-section='business-menu-categories'
      id='category-lists'
      className='category-lists'
      w={props.wContainerStyle}
      isProfessional={isProfessional}
      $fullWidthSticky={!useKioskApp}
    >
      {/* the bar's own tabs (category_tabs.scope.tabs, else the global) */}
      <CategoriesScrollport ref={scrollport}>
        <ComponentScope group='category_tabs'>
          {isSkeleton
            ? (
              <TabsNavigation mode='section' tone='primary' width='content' {...slotProps}>
                {[...Array(4).keys()].map(i => (
                  <TabsAction key={i}>
                    <Skeleton width={100} />
                  </TabsAction>
                ))}
              </TabsNavigation>
              )
            : (
              <TabsNavigation mode='section' tone='primary' edgeToEdge={!useKioskApp} {...slotProps}>
                {menuTab}
                {openBusinessInformation
                  ? renderProductCategories()
                  : <AutoScroll>{renderProductCategories()}</AutoScroll>}
              </TabsNavigation>
              )}
        </ComponentScope>
      </CategoriesScrollport>
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
